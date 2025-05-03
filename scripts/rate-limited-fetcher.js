/**
 * Rate-Limited Twitter Fetcher
 * 
 * This script implements a rate-limiting strategy for fetching tweets from multiple accounts
 * while respecting Twitter API's strict rate limits. It can be used as a standalone script
 * or imported as a module into your existing system.
 */

require('dotenv').config();
const twitter = require('../src/twitter');
const fs = require('fs');
const path = require('path');

class RateLimitedFetcher {
  constructor(options = {}) {
    // Configuration
    this.maxAccountsPerBatch = options.maxAccountsPerBatch || 3;
    this.tweetsPerAccount = options.tweetsPerAccount || 5;
    this.includeReplies = options.includeReplies !== undefined ? options.includeReplies : true;
    this.includeRetweets = options.includeRetweets !== undefined ? options.includeRetweets : false;
    this.delayBetweenAccounts = options.delayBetweenAccounts || 180000; // 3 minutes by default
    this.maxRetries = options.maxRetries || 3;
    this.logToFile = options.logToFile !== undefined ? options.logToFile : true;
    this.logFilePath = options.logFilePath || path.join(__dirname, '..', 'logs', 'twitter-fetcher.log');
    
    // State
    this.accountQueue = [];
    this.processedAccounts = new Set();
    this.failedAccounts = new Map(); // account -> error reason
    this.rateLimitInfo = null;
    this.isProcessing = false;
    this.db = options.db || null; // Optional database connection
    
    // Ensure log directory exists
    if (this.logToFile) {
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
    
    this.log('Rate-Limited Fetcher initialized');
  }
  
  /**
   * Add accounts to the processing queue
   * @param {Array<string|Object>} accounts - Array of account handles or objects with handle property
   */
  addAccounts(accounts) {
    if (!Array.isArray(accounts)) {
      accounts = [accounts];
    }
    
    for (const account of accounts) {
      const handle = typeof account === 'string' ? account : account.handle;
      
      if (!handle) {
        this.log('Warning: Skipping account with no handle', 'warn');
        continue;
      }
      
      // Skip if already in queue or processed
      if (this.accountQueue.some(a => a.handle === handle) || this.processedAccounts.has(handle)) {
        this.log(`Skipping duplicate account: ${handle}`, 'info');
        continue;
      }
      
      this.accountQueue.push({
        handle,
        retryCount: 0,
        data: typeof account === 'object' ? account : { handle }
      });
    }
    
    this.log(`Added ${accounts.length} accounts to queue. Queue size: ${this.accountQueue.length}`);
    return this;
  }
  
  /**
   * Start processing the account queue
   */
  async start() {
    if (this.isProcessing) {
      this.log('Already processing queue', 'warn');
      return this;
    }
    
    this.isProcessing = true;
    this.log(`Starting to process ${this.accountQueue.length} accounts`);
    
    try {
      // Check rate limits before starting
      await this.checkRateLimits();
      
      // Process accounts in batches
      while (this.accountQueue.length > 0) {
        const batch = this.accountQueue.splice(0, this.maxAccountsPerBatch);
        await this.processBatch(batch);
      }
      
      this.log('Finished processing all accounts');
    } catch (error) {
      this.log(`Error in processing: ${error.message}`, 'error');
      this.log(error.stack, 'error');
    } finally {
      this.isProcessing = false;
    }
    
    return {
      processed: Array.from(this.processedAccounts),
      failed: Object.fromEntries(this.failedAccounts),
      rateLimits: this.rateLimitInfo
    };
  }
  
  /**
   * Process a batch of accounts
   * @param {Array} batch - Batch of accounts to process
   */
  async processBatch(batch) {
    this.log(`Processing batch of ${batch.length} accounts`);
    
    for (let i = 0; i < batch.length; i++) {
      const account = batch[i];
      
      try {
        await this.processAccount(account);
        
        // Add delay between accounts (except after the last one)
        if (i < batch.length - 1) {
          this.log(`Waiting ${this.delayBetweenAccounts / 1000} seconds before next account...`);
          await this.delay(this.delayBetweenAccounts);
        }
      } catch (error) {
        this.log(`Error processing account ${account.handle}: ${error.message}`, 'error');
        
        // Handle rate limit errors
        if (error.code === 429) {
          this.log('Rate limit exceeded, pausing queue', 'warn');
          
          // Calculate wait time based on rate limit reset
          let waitTime = 60000; // Default: 1 minute
          if (error.rateLimit && error.rateLimit.reset) {
            const resetTime = error.rateLimit.reset * 1000; // Convert to milliseconds
            const now = Date.now();
            waitTime = Math.max(resetTime - now + 60000, 60000); // Wait until reset + 60 seconds
            
            this.log(`Rate limit resets at ${new Date(resetTime).toISOString()}`);
            this.log(`Waiting ${Math.round(waitTime / 1000)} seconds before continuing`);
          }
          
          // Wait for rate limit to reset
          await this.delay(waitTime);
          
          // Put the account back in the queue if we haven't exceeded max retries
          if (account.retryCount < this.maxRetries) {
            account.retryCount++;
            this.accountQueue.unshift(account);
            this.log(`Requeued ${account.handle} for retry (${account.retryCount}/${this.maxRetries})`);
          } else {
            this.failedAccounts.set(account.handle, 'Rate limit exceeded, max retries reached');
            this.log(`Failed to process ${account.handle} after ${this.maxRetries} retries`, 'error');
          }
          
          // Check rate limits again before continuing
          await this.checkRateLimits();
        } else {
          // For other errors, mark as failed
          this.failedAccounts.set(account.handle, error.message);
        }
      }
    }
  }
  
  /**
   * Process a single account
   * @param {Object} account - Account to process
   */
  async processAccount(account) {
    this.log(`Processing account: @${account.handle}`);
    
    // Fetch tweets for the account
    const tweets = await twitter.fetchRecentTweets(
      account.handle,
      this.tweetsPerAccount,
      this.includeReplies,
      this.includeRetweets,
      this.db
    );
    
    // Update rate limit info if available
    if (tweets && tweets.rateLimit) {
      this.rateLimitInfo = tweets.rateLimit;
      this.log(`Rate limit: ${tweets.rateLimit.remaining}/${tweets.rateLimit.limit} remaining`);
      
      if (tweets.rateLimit.day) {
        this.log(`Daily limit: ${tweets.rateLimit.day.remaining}/${tweets.rateLimit.day.limit} remaining`);
      }
    }
    
    // Check if we got any tweets
    if (!tweets || tweets.length === 0) {
      this.log(`No tweets found for @${account.handle}`, 'warn');
      
      // If we have a database connection, add to review list
      if (this.db) {
        try {
          await this.db.addAccountToReview(
            account.handle,
            "Account consistently returns 0 tweets despite successful API calls",
            "NO_TWEETS"
          );
          this.log(`Added ${account.handle} to review list`);
        } catch (dbError) {
          this.log(`Error adding ${account.handle} to review list: ${dbError.message}`, 'error');
        }
      }
    } else {
      this.log(`Successfully fetched ${tweets.length} tweets for @${account.handle}`);
      
      // If we have a database connection, update the database
      if (this.db) {
        try {
          // Get existing cached tweets for this account
          const cachedTweets = await this.db.getCachedTweets(account.data.id);
          
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
            this.log(`Tweets changed for @${account.handle}, updating cache...`);
            
            // Delete existing cached tweets for this account
            await this.db.deleteCachedTweets(account.data.id);
            
            // Add account_id to each tweet
            const tweetsWithAccountId = tweets.map(tweet => ({
              ...tweet,
              account_id: account.data.id
            }));
            
            // Insert new tweets
            await this.db.insertTweets(tweetsWithAccountId);
            this.log(`Cache updated for @${account.handle}`);
          } else {
            this.log(`No changes in tweets for @${account.handle}`);
          }
          
          // Update last_checked timestamp
          await this.db.updateLastChecked(account.data.id);
        } catch (dbError) {
          this.log(`Error updating database for ${account.handle}: ${dbError.message}`, 'error');
        }
      }
    }
    
    // Mark as processed
    this.processedAccounts.add(account.handle);
  }
  
  /**
   * Check current rate limits
   */
  async checkRateLimits() {
    try {
      this.log('Checking current rate limits...');
      const result = await twitter.checkRateLimits();
      
      if (result.success) {
        this.rateLimitInfo = result.rateLimitInfo;
        
        this.log(`Rate limit: ${result.rateLimitInfo.remaining}/${result.rateLimitInfo.limit} remaining`);
        
        if (result.rateLimitInfo.day) {
          this.log(`Daily limit: ${result.rateLimitInfo.day.remaining}/${result.rateLimitInfo.day.limit} remaining`);
        }
        
        // Check if we're approaching limits
        if (result.rateLimitInfo.remaining < 5) {
          const resetTime = new Date(result.rateLimitInfo.reset * 1000);
          const now = new Date();
          const waitTime = Math.max(resetTime - now + 60000, 60000);
          
          this.log(`Rate limit too low (${result.rateLimitInfo.remaining}), waiting until reset at ${resetTime.toISOString()}`);
          await this.delay(waitTime);
        }
      } else {
        this.log('Failed to retrieve rate limit information', 'warn');
      }
    } catch (error) {
      this.log(`Error checking rate limits: ${error.message}`, 'error');
    }
  }
  
  /**
   * Utility method to add a delay
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Log a message
   * @param {string} message - Message to log
   * @param {string} level - Log level (info, warn, error)
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    // Log to console
    switch (level) {
      case 'warn':
        console.warn(logMessage);
        break;
      case 'error':
        console.error(logMessage);
        break;
      default:
        console.log(logMessage);
    }
    
    // Log to file if enabled
    if (this.logToFile) {
      try {
        fs.appendFileSync(this.logFilePath, logMessage + '\n');
      } catch (error) {
        console.error(`Error writing to log file: ${error.message}`);
      }
    }
  }
}

// Export the class if being used as a module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RateLimitedFetcher;
}

// If run directly, execute example usage
if (require.main === module) {
  // Example usage
  async function runExample() {
    const fetcher = new RateLimitedFetcher({
      maxAccountsPerBatch: 2,
      tweetsPerAccount: 1,
      delayBetweenAccounts: 10000, // 10 seconds for testing
      logToFile: true
    });
    
    // Add some test accounts
    fetcher.addAccounts([
      'BBCNews',
      'CNN',
      'nytimes'
    ]);
    
    // Start processing
    console.log('Starting to fetch tweets...');
    const results = await fetcher.start();
    
    console.log('\nResults:');
    console.log(`Processed accounts: ${results.processed.length}`);
    console.log(`Failed accounts: ${Object.keys(results.failed).length}`);
    
    if (Object.keys(results.failed).length > 0) {
      console.log('\nFailed accounts:');
      for (const [handle, reason] of Object.entries(results.failed)) {
        console.log(`- @${handle}: ${reason}`);
      }
    }
  }
  
  runExample().catch(error => {
    console.error('Error in example:', error);
  });
}
