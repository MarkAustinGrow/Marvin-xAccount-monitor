require('dotenv').config();
const cron = require('node-cron');
const db = require('./src/db');
const twitter = require('./src/twitter');
const logger = require('./src/logger');
const webServer = require('./src/web-server');
const RateLimitedFetcher = require('./scripts/rate-limited-fetcher');

// Parse command line arguments
const args = process.argv.slice(2);
const TEST_MODE = args.includes('--test');
const TEST_ACCOUNT = 'OBEYGIANT'; // Default test account (Shepard Fairey's account)

// Configuration
const TWEETS_PER_ACCOUNT = 10;
const INCLUDE_REPLIES = true;
const INCLUDE_RETWEETS = true;
const BASE_API_DELAY_MS = 180000; // Increased to 3 minutes between API calls to respect Basic tier rate limits
const MAX_RETRY_ATTEMPTS = 3; // Maximum number of retry attempts for rate limit errors
const BATCH_SIZE = TEST_MODE ? 1 : 3; // Use batch size of 1 for test mode, 3 for production mode
const BATCH_INTERVAL_MINUTES = TEST_MODE ? 5 : 20; // Shorter interval in test mode, 20 minutes in production
const CRON_SCHEDULE = TEST_MODE ? '*/30 * * * *' : '0 */12 * * *'; // Every 30 minutes in test mode, every 12 hours in production
const DAILY_API_LIMIT = 400; // Set to 80% of the 500/day app limit for Basic tier
const API_LIMIT_SAFETY_THRESHOLD = 0.8; // Stop processing when we reach 80% of the daily limit

// Function to track API calls with persistent storage
async function trackApiCall(rateLimitInfo) {
  try {
    // Default values
    let callsMade = 1;
    let dailyLimit = DAILY_API_LIMIT;
    let resetTime = null;
    
    // Update values if rate limit info is available
    if (rateLimitInfo) {
      if (rateLimitInfo.day) {
        dailyLimit = rateLimitInfo.day.limit;
        resetTime = rateLimitInfo.day.reset * 1000; // Convert to milliseconds
      } else if (rateLimitInfo.reset) {
        resetTime = rateLimitInfo.reset * 1000; // Convert to milliseconds
      }
    }
    
    // Track the API call in the database
    await db.trackApiUsage(callsMade, dailyLimit, resetTime);
    
    // Get updated usage
    const usage = await db.getTodayApiUsage();
    
    if (usage) {
      // Log API usage status
      const usagePercentage = Math.round((usage.calls_made / usage.daily_limit) * 100);
      logger.apiCallTracking(usage.calls_made, usage.daily_limit, usagePercentage);
      
      // Log detailed daily limit info if available
      if (rateLimitInfo && rateLimitInfo.day) {
        logger.dailyRateLimitStatus(
          rateLimitInfo.day.remaining,
          rateLimitInfo.day.limit,
          rateLimitInfo.day.reset * 1000
        );
      }
    }
  } catch (error) {
    logger.error('Error tracking API call:', error);
  }
}

// Function to process a single account
async function processAccount(account, retryCount = 0) {
  // Check if we're approaching rate limits before processing
  const isApproachingLimit = await db.isApproachingApiLimit(API_LIMIT_SAFETY_THRESHOLD);
  if (isApproachingLimit) {
    const usage = await db.getTodayApiUsage();
    logger.warn(`Skipping account @${account.handle} - approaching daily API limit (${usage.calls_made}/${usage.daily_limit})`);
    
    // Log with more detailed formatting
    const usagePercentage = Math.round((usage.calls_made / usage.daily_limit) * 100);
    logger.apiCallTracking(usage.calls_made, usage.daily_limit, usagePercentage);
    
    if (usage.reset_time) {
      const resetTimeStr = new Date(usage.reset_time).toISOString();
      const now = new Date();
      const hoursUntilReset = Math.round((new Date(usage.reset_time) - now) / (1000 * 60 * 60) * 10) / 10;
      logger.warn(`Daily limit resets at: ${resetTimeStr} (in approximately ${hoursUntilReset} hours)`);
    }
    return;
  }
  try {
    logger.info(`Processing account: @${account.handle}`);
    
    // Get existing cached tweets for this account to find the most recent tweet date
    const cachedTweets = await db.getCachedTweets(account.id);
    
    // Find the most recent tweet date if we have cached tweets
    let mostRecentTweetDate = null;
    if (cachedTweets.length > 0) {
      // Find the most recent tweet by created_at date
      mostRecentTweetDate = cachedTweets.reduce((latest, tweet) => {
        const tweetDate = new Date(tweet.created_at);
        return tweetDate > latest ? tweetDate : latest;
      }, new Date(0)).toISOString();
      
      logger.info(`Most recent tweet for @${account.handle} is from ${mostRecentTweetDate}`);
    }
    
    // Fetch recent tweets for the account with retry handling
    logger.info(`Fetching tweets for @${account.handle} with retry handling...`);
    
    let tweets = [];
    let retryAttempt = 0;
    const MAX_RETRIES = MAX_RETRY_ATTEMPTS;
    
    while (retryAttempt < MAX_RETRIES) {
      try {
    // Track this API call
    await trackApiCall();
    
    tweets = await twitter.fetchRecentTweets(
      account.handle, 
      TWEETS_PER_ACCOUNT,
      INCLUDE_REPLIES,
      INCLUDE_RETWEETS,
      db,
      mostRecentTweetDate
    );
    
    // Update rate limit info if available in the response
    if (tweets && tweets.rateLimit) {
      await trackApiCall(tweets.rateLimit);
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
    
    // If we're using since_date and we got tweets, they're all new
    // If we're not using since_date or didn't get tweets, we need to check if anything changed
    let tweetsChanged = tweets.length > 0;
    
    // If we have tweets and we're not using since_date, we need to check if they've changed
    if (tweets.length > 0 && !mostRecentTweetDate) {
      // Get existing cached tweets for this account if we haven't already
      if (cachedTweets.length === 0) {
        cachedTweets = await db.getCachedTweets(account.id);
      }
      
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
    
    // If we have tweets, update the last tweet date
    if (tweets && tweets.length > 0) {
      // Find the most recent tweet
      const mostRecentTweet = tweets.reduce((latest, tweet) => {
        const tweetDate = new Date(tweet.created_at);
        return tweetDate > latest ? tweetDate : latest;
      }, new Date(0));
      
      // Update the last tweet date
      await db.updateLastTweetDate(account.id, mostRecentTweet.toISOString());
    }
    
    // Calculate and update activity level based on tweet frequency
    await db.updateActivityLevel(account.id);
    
    // Update last_checked timestamp and set next_check_date based on activity level
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
        await trackApiCall(error.rateLimit);
        
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
  const isApproachingLimit = await db.isApproachingApiLimit(API_LIMIT_SAFETY_THRESHOLD);
  if (isApproachingLimit) {
    const usage = await db.getTodayApiUsage();
    logger.warn(`Skipping batch ${batchNumber}/${totalBatches} - approaching daily API limit (${usage.calls_made}/${usage.daily_limit})`);
    
    // Log with more detailed formatting
    const usagePercentage = Math.round((usage.calls_made / usage.daily_limit) * 100);
    logger.apiCallTracking(usage.calls_made, usage.daily_limit, usagePercentage);
    
    if (usage.reset_time) {
      const resetTimeStr = new Date(usage.reset_time).toISOString();
      const now = new Date();
      const hoursUntilReset = Math.round((new Date(usage.reset_time) - now) / (1000 * 60 * 60) * 10) / 10;
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
  try {
    logger.heartbeat();
    logger.info('Starting account monitoring process...');
    
    // If in test mode, run the test mode function
    if (TEST_MODE) {
      await runTestMode();
      return;
    }
    
    // Get accounts that are due for checking based on their activity level and next_check_date
    const accounts = await db.getAccountsToMonitor();
    
    if (!accounts || accounts.length === 0) {
      logger.warn('No accounts due for monitoring at this time.');
      return;
    }
    
    logger.info(`Found ${accounts.length} accounts due for monitoring.`);
    
    // Use the rate-limited fetcher to process accounts
    const fetcher = new RateLimitedFetcher({
      maxAccountsPerBatch: BATCH_SIZE,
      tweetsPerAccount: TWEETS_PER_ACCOUNT,
      includeReplies: INCLUDE_REPLIES,
      includeRetweets: INCLUDE_RETWEETS,
      delayBetweenAccounts: BASE_API_DELAY_MS,
      maxRetries: MAX_RETRY_ATTEMPTS,
      logToFile: true,
      db: db // Pass the database connection
    });
    
    // Configure the fetcher's logger to use our logger
    fetcher.log = (message, level = 'info') => {
      switch (level) {
        case 'warn':
          logger.warn(message);
          break;
        case 'error':
          logger.error(message);
          break;
        default:
          logger.info(message);
      }
    };
    
    // Add accounts to the fetcher
    fetcher.addAccounts(accounts);
    
    // Start processing
    logger.info('Starting rate-limited tweet fetching...');
    const startTime = Date.now();
    
    const results = await fetcher.start();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000 / 60; // in minutes
    
    // Log results
    logger.info(`Completed processing in ${duration.toFixed(2)} minutes.`);
    logger.info(`Successfully processed ${results.processed.length} accounts.`);
    
    if (Object.keys(results.failed).length > 0) {
      logger.warn(`Failed to process ${Object.keys(results.failed).length} accounts.`);
      for (const [handle, reason] of Object.entries(results.failed)) {
        logger.warn(`- @${handle}: ${reason}`);
      }
    }
    
    // Update rate limit tracking
    if (results.rateLimits) {
      await trackApiCall(results.rateLimits);
      
      logger.info('Final rate limit status:');
      logger.info(`- API calls remaining: ${results.rateLimits.remaining}/${results.rateLimits.limit}`);
      
      if (results.rateLimits.day) {
        logger.info(`- Daily limit remaining: ${results.rateLimits.day.remaining}/${results.rateLimits.day.limit}`);
        logger.info(`- Daily limit resets at: ${new Date(results.rateLimits.day.reset * 1000).toISOString()}`);
      }
    }
    
    logger.info('Account monitoring process completed.');
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
