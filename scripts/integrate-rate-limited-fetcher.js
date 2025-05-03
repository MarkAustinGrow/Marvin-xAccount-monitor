/**
 * Integration Example for Rate-Limited Fetcher
 * 
 * This script demonstrates how to integrate the RateLimitedFetcher into the existing system.
 * It shows how to use the fetcher with the database connection and how to configure it
 * for optimal performance within Twitter's rate limits.
 */

require('dotenv').config();
const db = require('../src/db');
const RateLimitedFetcher = require('./rate-limited-fetcher');

// Configuration constants
const BATCH_SIZE = 3; // Number of accounts to process in each batch
const TWEETS_PER_ACCOUNT = 10; // Number of tweets to fetch per account
const INCLUDE_REPLIES = true; // Whether to include replies
const INCLUDE_RETWEETS = false; // Whether to include retweets
const DELAY_BETWEEN_ACCOUNTS = 180000; // 3 minutes between accounts (in milliseconds)
const MAX_ACCOUNTS_PER_RUN = 20; // Maximum number of accounts to process in a single run

/**
 * Main function to run the integration
 */
async function main() {
  console.log('Starting Rate-Limited Fetcher integration...');
  
  try {
    // Initialize database
    console.log('Initializing database connection...');
    const dbInitialized = await db.initializeDatabase();
    
    if (!dbInitialized) {
      console.error('Failed to initialize database. Exiting...');
      process.exit(1);
    }
    
    console.log('Database initialized successfully.');
    
    // Get accounts to monitor from the database
    console.log('Fetching accounts to monitor from database...');
    const accounts = await db.getAccountsToMonitor();
    
    if (!accounts || accounts.length === 0) {
      console.log('No accounts found to monitor. Exiting...');
      process.exit(0);
    }
    
    console.log(`Found ${accounts.length} accounts to monitor.`);
    
    // Limit the number of accounts to process in this run
    const accountsToProcess = accounts.slice(0, MAX_ACCOUNTS_PER_RUN);
    console.log(`Processing ${accountsToProcess.length} accounts in this run.`);
    
    // Create and configure the fetcher
    const fetcher = new RateLimitedFetcher({
      maxAccountsPerBatch: BATCH_SIZE,
      tweetsPerAccount: TWEETS_PER_ACCOUNT,
      includeReplies: INCLUDE_REPLIES,
      includeRetweets: INCLUDE_RETWEETS,
      delayBetweenAccounts: DELAY_BETWEEN_ACCOUNTS,
      maxRetries: 3,
      logToFile: true,
      db: db // Pass the database connection
    });
    
    // Add accounts to the fetcher
    fetcher.addAccounts(accountsToProcess);
    
    // Start processing
    console.log('Starting to fetch tweets...');
    const startTime = Date.now();
    
    const results = await fetcher.start();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000 / 60; // in minutes
    
    // Log results
    console.log('\nProcessing completed!');
    console.log(`Duration: ${duration.toFixed(2)} minutes`);
    console.log(`Processed accounts: ${results.processed.length}`);
    console.log(`Failed accounts: ${Object.keys(results.failed).length}`);
    
    if (Object.keys(results.failed).length > 0) {
      console.log('\nFailed accounts:');
      for (const [handle, reason] of Object.entries(results.failed)) {
        console.log(`- @${handle}: ${reason}`);
      }
    }
    
    // Log rate limit status
    if (results.rateLimits) {
      console.log('\nFinal rate limit status:');
      console.log(`- API calls remaining: ${results.rateLimits.remaining}/${results.rateLimits.limit}`);
      
      if (results.rateLimits.day) {
        console.log(`- Daily limit remaining: ${results.rateLimits.day.remaining}/${results.rateLimits.day.limit}`);
        console.log(`- Daily limit resets at: ${new Date(results.rateLimits.day.reset * 1000).toISOString()}`);
      }
    }
  } catch (error) {
    console.error('Error in integration:', error);
  } finally {
    // Close database connection
    if (db.supabase) {
      console.log('Closing database connection...');
      // Note: Supabase doesn't have a close method, but we'd add it here if needed
    }
  }
}

// Run the integration
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

/**
 * How to use this in your Docker environment:
 * 
 * 1. Add this script to your Docker container
 * 2. Modify your docker-compose.yml to run this script instead of index.js
 * 3. Or, modify index.js to use the RateLimitedFetcher
 * 
 * Example docker-compose modification:
 * 
 * services:
 *   marvin-account-monitor:
 *     build: .
 *     command: node scripts/integrate-rate-limited-fetcher.js
 *     # ... rest of your configuration
 * 
 * Alternatively, you can run this on a schedule using a cron job:
 * 
 * # Run every 12 hours
 * 0 0,12 * * * cd /path/to/app && node scripts/integrate-rate-limited-fetcher.js >> /var/log/twitter-fetcher.log 2>&1
 */
