require('dotenv').config();
const cron = require('node-cron');
const db = require('./src/db');
const twitter = require('./src/twitter');
const logger = require('./src/logger');
const webServer = require('./src/web-server');

// Parse command line arguments
const args = process.argv.slice(2);
const TEST_MODE = args.includes('--test');
const TEST_ACCOUNT = 'OBEYGIANT'; // Default test account (Shepard Fairey's account)

// Configuration
const TWEETS_PER_ACCOUNT = 3;
const INCLUDE_REPLIES = false;
const INCLUDE_RETWEETS = false;
const BASE_API_DELAY_MS = 180000; // Increased to 3 minutes between API calls to respect Basic tier rate limits
const MAX_RETRY_ATTEMPTS = 3; // Maximum number of retry attempts for rate limit errors
const BATCH_SIZE = TEST_MODE ? 1 : 3; // Use batch size of 1 for test mode, 3 for production mode
const BATCH_INTERVAL_MINUTES = TEST_MODE ? 5 : 20; // Shorter interval in test mode, 20 minutes in production
const CRON_SCHEDULE = TEST_MODE ? '*/30 * * * *' : '0 */12 * * *'; // Every 30 minutes in test mode, every 12 hours in production
const DAILY_API_LIMIT = 400; // Set to 80% of the 500/day app limit for Basic tier

// Rate limit tracking
let apiCallsToday = 0;
let rateLimitResetTime = null;
let dailyLimitResetTime = null;

// Function to check if we're approaching API limits
function isApproachingRateLimit() {
  return apiCallsToday >= DAILY_API_LIMIT;
}

// Function to reset API call counter
function resetApiCallCounter() {
  apiCallsToday = 0;
  dailyLimitResetTime = null;
  logger.info('Daily API call counter has been reset');
}

// Function to track API calls
function trackApiCall(rateLimitInfo) {
  apiCallsToday++;
  
  // Update rate limit reset times if available
  if (rateLimitInfo && rateLimitInfo.reset) {
    rateLimitResetTime = new Date(rateLimitInfo.reset * 1000);
  }
  
  if (rateLimitInfo && rateLimitInfo.day && rateLimitInfo.day.reset) {
    dailyLimitResetTime = new Date(rateLimitInfo.day.reset * 1000);
    
    // Schedule reset of counter when daily limit resets
    const now = new Date();
    const msUntilReset = dailyLimitResetTime.getTime() - now.getTime();
    
    if (msUntilReset > 0) {
      setTimeout(resetApiCallCounter, msUntilReset + 60000); // Add 1 minute buffer
    }
  }
  
  logger.debug(`API call tracked. Total today: ${apiCallsToday}/${DAILY_API_LIMIT}`);
  
  // Log API usage status
  const usagePercentage = Math.round((apiCallsToday / DAILY_API_LIMIT) * 100);
  logger.apiCallTracking(apiCallsToday, DAILY_API_LIMIT, usagePercentage);
  
  // Log detailed daily limit info if available
  if (rateLimitInfo && rateLimitInfo.day) {
    logger.dailyRateLimitStatus(
      rateLimitInfo.day.remaining,
      rateLimitInfo.day.limit,
      rateLimitInfo.day.reset * 1000
    );
  }
}

// Function to process a single account
async function processAccount(account, retryCount = 0) {
  // Check if we're approaching rate limits before processing
  if (isApproachingRateLimit()) {
    logger.warn(`Skipping account @${account.handle} - approaching daily API limit (${apiCallsToday}/${DAILY_API_LIMIT})`);
    
    // Log with more detailed formatting
    const usagePercentage = Math.round((apiCallsToday / DAILY_API_LIMIT) * 100);
    logger.apiCallTracking(apiCallsToday, DAILY_API_LIMIT, usagePercentage);
    
    if (dailyLimitResetTime) {
      const resetTimeStr = dailyLimitResetTime.toISOString();
      const now = new Date();
      const hoursUntilReset = Math.round((dailyLimitResetTime - now) / (1000 * 60 * 60) * 10) / 10;
      logger.warn(`Daily limit resets at: ${resetTimeStr} (in approximately ${hoursUntilReset} hours)`);
    }
    return;
  }
  try {
    logger.info(`Processing account: @${account.handle}`);
    
    // Fetch recent tweets for the account with retry handling
    logger.info(`Fetching tweets for @${account.handle} with retry handling...`);
    
    let tweets = [];
    let retryAttempt = 0;
    const MAX_RETRIES = MAX_RETRY_ATTEMPTS;
    
    while (retryAttempt < MAX_RETRIES) {
      try {
        // Track this API call
        trackApiCall();
        
        tweets = await twitter.fetchRecentTweets(
          account.handle, 
          TWEETS_PER_ACCOUNT,
          INCLUDE_REPLIES,
          INCLUDE_RETWEETS,
          db
        );
        
        // Update rate limit info if available in the response
        if (tweets && tweets.rateLimit) {
          trackApiCall(tweets.rateLimit);
        }
        
        // If we got tweets, break out of the retry loop
        if (tweets && tweets.length > 0) {
          logger.info(`Successfully fetched ${tweets.length} tweets for @${account.handle}`);
          break;
        }
        
        // If no tweets were found but no error was thrown
        if (retryAttempt === MAX_RETRIES - 1) {
          logger.warn(`No tweets found for @${account.handle} after ${MAX_RETRIES} attempts`);
        } else {
          logger.warn(`No tweets found for @${account.handle}, retrying (${retryAttempt + 1}/${MAX_RETRIES})...`);
          await twitter.delay(5000); // Wait 5 seconds before retrying
        }
        
        retryAttempt++;
      } catch (error) {
        // Handle validation errors (username format/length)
        if (error.code === 'VALIDATION_ERROR') {
          logger.warn(`Validation error for @${account.handle}: ${error.message}`);
          
          // Add to review list
          await db.addAccountToReview(account.handle, error.message, 'VALIDATION_ERROR');
          
          // Update last_checked to avoid constant retries
          await db.updateLastChecked(account.id);
          logger.accountScan(account.handle, false);
          
          // Skip this account
          return;
        }
        // If it's a rate limit error and we haven't exceeded max retries
        else if (error.code === 429 && retryAttempt < MAX_RETRIES - 1) {
          logger.warn(`Rate limit hit for @${account.handle}, retrying after backoff...`);
          
          // Calculate wait time based on rate limit reset time
          let waitTime = 60000; // Default: 1 minute
          if (error.rateLimit && error.rateLimit.reset) {
            const resetTime = error.rateLimit.reset * 1000; // Convert to milliseconds
            const now = Date.now();
            waitTime = Math.max(resetTime - now + 60000, 60000); // Wait until reset + 60 seconds, or at least 1 minute
            
            // Track this rate limit hit
            trackApiCall(error.rateLimit);
            
            // Log detailed rate limit information
            logger.rateLimitHit('Twitter API', new Date(resetTime).toISOString());
            if (error.rateLimit.day) {
              logger.warn(`Daily limit status: ${error.rateLimit.day.remaining}/${error.rateLimit.day.limit} remaining, resets at ${new Date(error.rateLimit.day.reset * 1000).toISOString()}`);
            }
          }
          
          // Wait using exponential backoff
          await twitter.exponentialBackoff(retryAttempt, waitTime);
          retryAttempt++;
        } else {
          // For other errors or if we've exceeded retries, rethrow
          throw error;
        }
      }
    }
    
    if (!tweets || tweets.length === 0) {
      logger.warn(`No tweets found for @${account.handle} after all attempts`);
      
      // Add to review list if we consistently get 0 tweets
      await db.addAccountToReview(
        account.handle, 
        "Account consistently returns 0 tweets despite successful API calls", 
        "NO_TWEETS"
      );
      
      await db.updateLastChecked(account.id);
      logger.accountScan(account.handle, false);
      return;
    }
    
    // Get existing cached tweets for this account
    const cachedTweets = await db.getCachedTweets(account.id);
    
    // Check if tweets have changed
    let tweetsChanged = true;
    
    if (cachedTweets.length === tweets.length) {
      // Compare tweet IDs to see if they're the same
      const cachedIds = new Set(cachedTweets.map(t => t.tweet_id));
      const newIds = new Set(tweets.map(t => t.tweet_id));
      
      // Check if all new tweet IDs are already in the cache
      tweetsChanged = false;
      for (const id of newIds) {
        if (!cachedIds.has(id)) {
          tweetsChanged = true;
          break;
        }
      }
    }
    
    if (tweetsChanged) {
      logger.info(`Tweets changed for @${account.handle}, updating cache...`);
      
      // Delete existing cached tweets for this account
      await db.deleteCachedTweets(account.id);
      
      // Add account_id to each tweet
      const tweetsWithAccountId = tweets.map(tweet => ({
        ...tweet,
        account_id: account.id
      }));
      
      // Insert new tweets
      await db.insertTweets(tweetsWithAccountId);
      logger.info(`Cache updated for @${account.handle}`);
    } else {
      logger.info(`No changes in tweets for @${account.handle}`);
    }
    
    // Update last_checked timestamp
    await db.updateLastChecked(account.id);
    logger.accountScan(account.handle, true, tweets.length);
  } catch (error) {
    // Handle rate limit errors with exponential backoff
    if (error.code === 429 && retryCount < MAX_RETRY_ATTEMPTS) {
      logger.warn(`Rate limit hit for @${account.handle}. Retry attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}`);
      
      // Calculate wait time based on rate limit reset time
      let waitTime = 60000; // Default: 1 minute
      if (error.rateLimit && error.rateLimit.reset) {
        const resetTime = error.rateLimit.reset * 1000; // Convert to milliseconds
        const now = Date.now();
        waitTime = Math.max(resetTime - now + 60000, 60000); // Wait until reset + 60 seconds, or at least 1 minute
        
        // Track this rate limit hit
        trackApiCall(error.rateLimit);
        
        // Log detailed rate limit information
        logger.rateLimitHit('Twitter API', new Date(resetTime).toISOString());
        if (error.rateLimit.day) {
          logger.warn(`Daily limit status: ${error.rateLimit.day.remaining}/${error.rateLimit.day.limit} remaining, resets at ${new Date(error.rateLimit.day.reset * 1000).toISOString()}`);
        }
      }
      
      // Wait using exponential backoff
      await twitter.exponentialBackoff(retryCount, waitTime);
      
      // Retry the account
      return processAccount(account, retryCount + 1);
    }
    
    logger.error(`Error processing account @${account.handle}:`, error);
    logger.accountScan(account.handle, false);
  }
}

// Function to calculate adaptive delay based on batch size and rate limits
function calculateAdaptiveDelay(batchSize) {
  // Twitter's rate limit is now much stricter
  // We make approximately 2 API calls per account (getUserId and userTimeline)
  // To be safe, we'll aim for processing batchSize accounts in 45 minutes
  
  const safetyFactor = 3.0; // Triple the time as a safety margin
  const fortyFiveMinutesInMs = 45 * 60 * 1000;
  const apiCallsPerAccount = 2; // getUserId and userTimeline
  
  // Calculate delay between accounts to spread them out over 45 minutes
  const delayBetweenAccounts = (fortyFiveMinutesInMs / batchSize) * safetyFactor;
  
  // Use at least the base delay
  return Math.max(delayBetweenAccounts, BASE_API_DELAY_MS);
}

// Function to process a batch of accounts
async function processBatch(accounts, batchNumber, totalBatches) {
  // Check if we're approaching rate limits before processing batch
  if (isApproachingRateLimit()) {
    logger.warn(`Skipping batch ${batchNumber}/${totalBatches} - approaching daily API limit (${apiCallsToday}/${DAILY_API_LIMIT})`);
    
    // Log with more detailed formatting
    const usagePercentage = Math.round((apiCallsToday / DAILY_API_LIMIT) * 100);
    logger.apiCallTracking(apiCallsToday, DAILY_API_LIMIT, usagePercentage);
    
    if (dailyLimitResetTime) {
      const resetTimeStr = dailyLimitResetTime.toISOString();
      const now = new Date();
      const hoursUntilReset = Math.round((dailyLimitResetTime - now) / (1000 * 60 * 60) * 10) / 10;
      logger.warn(`Daily limit resets at: ${resetTimeStr} (in approximately ${hoursUntilReset} hours)`);
    }
    return;
  }
  logger.info(`Processing batch ${batchNumber}/${totalBatches} with ${accounts.length} accounts...`);
  
  // Calculate adaptive delay based on batch size
  const adaptiveDelay = calculateAdaptiveDelay(accounts.length);
  logger.info(`Using adaptive delay of ${Math.round(adaptiveDelay / 1000)} seconds between accounts.`);
  
  // Process each account in the batch
  for (let i = 0; i < accounts.length; i++) {
    try {
      await processAccount(accounts[i]);
      
      // Add delay between accounts to respect rate limits
      if (i < accounts.length - 1) {
        logger.debug(`Waiting ${Math.round(adaptiveDelay / 1000)} seconds before processing next account...`);
        await twitter.delay(adaptiveDelay);
      }
    } catch (error) {
      logger.error(`Error processing account ${accounts[i].handle} in batch:`, error);
    }
  }
  
  logger.info(`Completed batch ${batchNumber}/${totalBatches}.`);
}

// Function to run in test mode with a single account
async function runTestMode() {
  try {
    logger.info('🧪 RUNNING IN TEST MODE 🧪');
    logger.info(`Testing with single account: @${TEST_ACCOUNT}`);
    
    // Get the test account from the database
    const { data, error } = await db.supabase
      .from('x_accounts')
      .select('*')
      .eq('handle', TEST_ACCOUNT)
      .single();
    
    if (error || !data) {
      logger.error(`Test account @${TEST_ACCOUNT} not found in database. Please add it first.`);
      logger.info(`You can add it by running: npm run parse-accounts`);
      return;
    }
    
    // Process the test account
    logger.info('Starting test account processing...');
    await processAccount(data);
    logger.info('Test account processing completed.');
    
    // Display cached tweets for the test account
    const cachedTweets = await db.getCachedTweets(data.id);
    logger.info(`Found ${cachedTweets.length} cached tweets for @${TEST_ACCOUNT}:`);
    
    cachedTweets.forEach((tweet, index) => {
      logger.info(`Tweet ${index + 1}:`);
      logger.info(`ID: ${tweet.tweet_id}`);
      logger.info(`Text: ${tweet.tweet_text}`);
      logger.info(`URL: ${tweet.tweet_url}`);
      logger.info(`Created: ${tweet.created_at}`);
      logger.info(`Fetched: ${tweet.fetched_at}`);
      logger.info('---');
    });
    
    logger.info('Test mode completed successfully.');
  } catch (error) {
    logger.error('Error in test mode:', error);
  }
}

// Main monitoring function
async function monitorAccounts() {
  // Reset API call counter if it's a new day
  const now = new Date();
  if (dailyLimitResetTime && now > dailyLimitResetTime) {
    resetApiCallCounter();
  }
  try {
    logger.heartbeat();
    logger.info('Starting account monitoring process...');
    
    // If in test mode, run the test mode function
    if (TEST_MODE) {
      await runTestMode();
      return;
    }
    
    // Get all accounts to monitor
    const accounts = await db.getAccountsToMonitor();
    
    if (!accounts || accounts.length === 0) {
      logger.warn('No accounts found to monitor.');
      return;
    }
    
    logger.info(`Found ${accounts.length} accounts to monitor.`);
    
    // Split accounts into batches
    const batches = [];
    for (let i = 0; i < accounts.length; i += BATCH_SIZE) {
      batches.push(accounts.slice(i, i + BATCH_SIZE));
    }
    
    logger.info(`Split accounts into ${batches.length} batches of up to ${BATCH_SIZE} accounts each.`);
    
    // Process first batch immediately
    await processBatch(batches[0], 1, batches.length);
    
    // Schedule remaining batches with delays between them
    for (let i = 1; i < batches.length; i++) {
      const batchDelay = BATCH_INTERVAL_MINUTES * 60 * 1000 * i;
      logger.info(`Scheduling batch ${i + 1}/${batches.length} to run in ${BATCH_INTERVAL_MINUTES * i} minutes...`);
      
      setTimeout(async () => {
        await processBatch(batches[i], i + 1, batches.length);
      }, batchDelay);
    }
    
    logger.info('Account monitoring process initiated. Batches will run at scheduled intervals.');
  } catch (error) {
    logger.error('Error in monitorAccounts:', error);
  }
}

// Initialize and start the monitoring process
async function init() {
  try {
    if (TEST_MODE) {
      logger.info('Initializing Account Monitoring Agent in TEST MODE...');
    } else {
      logger.info('Initializing Account Monitoring Agent...');
    }
    
    // Initialize database
    const dbInitialized = await db.initializeDatabase();
    if (!dbInitialized) {
      logger.error('Failed to initialize database. Exiting...');
      process.exit(1);
    }
    
    // Start the web server
    logger.info('Starting web server...');
    try {
      const server = await webServer.startServer();
      logger.info(`Web server started on port ${process.env.WEB_PORT || 3000}`);
    } catch (error) {
      logger.error('Failed to start web server:', error);
      // Continue even if web server fails to start
    }
    
    // Schedule the monitoring job
    cron.schedule(CRON_SCHEDULE, async () => {
      logger.info(`Running scheduled job (${CRON_SCHEDULE})...`);
      await monitorAccounts();
    });
    
    logger.info(`Monitoring job scheduled: ${CRON_SCHEDULE}`);
    
    // Run the monitoring process immediately on startup
    logger.info('Running initial monitoring process...');
    await monitorAccounts();
    
    logger.info('Account Monitoring Agent initialized successfully.');
  } catch (error) {
    logger.error('Error initializing Account Monitoring Agent:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  logger.info('Received SIGINT. Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM. Shutting down...');
  process.exit(0);
});

// Start the application
init().catch(error => {
  logger.error('Unhandled error in initialization:', error);
  process.exit(1);
});
