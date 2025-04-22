require('dotenv').config();
const db = require('../src/db');
const twitter = require('../src/twitter');
const logger = require('../src/logger');

// Test account to use
const TEST_ACCOUNT = 'OBEYGIANT'; // Shepard Fairey's account
const TWEETS_PER_ACCOUNT = 3;
const INCLUDE_REPLIES = false;
const INCLUDE_RETWEETS = false;

// Function to process the test account
async function processTestAccount() {
  try {
    logger.info('🧪 RUNNING SINGLE TEST 🧪');
    logger.info(`Testing with account: @${TEST_ACCOUNT}`);
    
    // Get the test account from the database
    const { data, error } = await db.supabase
      .from('x_accounts')
      .select('*')
      .eq('handle', TEST_ACCOUNT)
      .single();
    
    if (error || !data) {
      logger.error(`Test account @${TEST_ACCOUNT} not found in database. Please add it first.`);
      logger.info(`You can add it by running: npm run add-test-account`);
      return;
    }
    
    const account = data;
    logger.info(`Processing account: @${account.handle}`);
    
    // Fetch recent tweets for the account
    logger.info(`Fetching tweets for @${account.handle} with retry handling...`);
    
    let tweets = [];
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    while (retryCount < MAX_RETRIES) {
      try {
        tweets = await twitter.fetchRecentTweets(
          account.handle, 
          TWEETS_PER_ACCOUNT,
          INCLUDE_REPLIES,
          INCLUDE_RETWEETS,
          db
        );
        
        // If we got tweets, break out of the retry loop
        if (tweets && tweets.length > 0) {
          logger.info(`Successfully fetched ${tweets.length} tweets for @${account.handle}`);
          break;
        }
        
        // If no tweets were found but no error was thrown
        if (retryCount === MAX_RETRIES - 1) {
          logger.warn(`No tweets found for @${account.handle} after ${MAX_RETRIES} attempts`);
        } else {
          logger.warn(`No tweets found for @${account.handle}, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
          await twitter.delay(5000); // Wait 5 seconds before retrying
        }
        
        retryCount++;
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
        else if (error.code === 429 && retryCount < MAX_RETRIES - 1) {
          logger.warn(`Rate limit hit for @${account.handle}, retrying after backoff...`);
          
          // Calculate wait time based on rate limit reset time
          let waitTime = 60000; // Default: 1 minute
          if (error.rateLimit && error.rateLimit.reset) {
            const resetTime = error.rateLimit.reset * 1000; // Convert to milliseconds
            const now = Date.now();
            waitTime = Math.max(resetTime - now + 5000, 60000); // Wait until reset + 5 seconds, or at least 1 minute
          }
          
          // Wait using exponential backoff
          await twitter.exponentialBackoff(retryCount, waitTime);
          retryCount++;
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
    
    // Display cached tweets for the test account
    const updatedCachedTweets = await db.getCachedTweets(account.id);
    logger.info(`Found ${updatedCachedTweets.length} cached tweets for @${TEST_ACCOUNT}:`);
    
    updatedCachedTweets.forEach((tweet, index) => {
      logger.info(`Tweet ${index + 1}:`);
      logger.info(`ID: ${tweet.tweet_id}`);
      logger.info(`Text: ${tweet.tweet_text}`);
      logger.info(`URL: ${tweet.tweet_url}`);
      logger.info(`Created: ${tweet.created_at}`);
      logger.info(`Fetched: ${tweet.fetched_at}`);
      logger.info('---');
    });
    
    logger.info('Single test completed successfully.');
  } catch (error) {
    logger.error('Error in single test:', error);
  }
}

// Initialize database and run the test
async function init() {
  try {
    logger.info('Initializing database...');
    
    // Initialize database
    const dbInitialized = await db.initializeDatabase();
    if (!dbInitialized) {
      logger.error('Failed to initialize database. Exiting...');
      process.exit(1);
    }
    
    // Run the test
    await processTestAccount();
    
    logger.info('Test completed. Exiting...');
    process.exit(0);
  } catch (error) {
    logger.error('Error initializing:', error);
    process.exit(1);
  }
}

// Start the test
init().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});
