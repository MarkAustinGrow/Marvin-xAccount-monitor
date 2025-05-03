/**
 * Test script for the Rate-Limited Fetcher
 * 
 * This script demonstrates how the Rate-Limited Fetcher handles multiple accounts
 * while respecting Twitter API rate limits.
 */

require('dotenv').config();
const RateLimitedFetcher = require('./rate-limited-fetcher');

// Test accounts to fetch tweets from
const TEST_ACCOUNTS = [
  'BBCNews',
  'CNN',
  'nytimes',
  'washingtonpost',
  'guardian'
];

async function testRateLimitedFetcher() {
  console.log('='.repeat(80));
  console.log('TESTING RATE-LIMITED FETCHER');
  console.log('='.repeat(80));
  
  // Create a fetcher with test configuration
  // Using shorter delays for testing purposes
  const fetcher = new RateLimitedFetcher({
    maxAccountsPerBatch: 2,
    tweetsPerAccount: 1,
    includeReplies: true,
    includeRetweets: false,
    delayBetweenAccounts: 10000, // 10 seconds for testing
    maxRetries: 2,
    logToFile: true,
    logFilePath: 'rate-limited-fetcher-test.log'
  });
  
  console.log('Fetcher configured with:');
  console.log('- Max accounts per batch: 2');
  console.log('- Tweets per account: 1');
  console.log('- Include replies: true');
  console.log('- Include retweets: false');
  console.log('- Delay between accounts: 10 seconds');
  console.log('- Max retries: 2');
  console.log('-'.repeat(80));
  
  // Add test accounts
  console.log(`Adding ${TEST_ACCOUNTS.length} test accounts:`);
  TEST_ACCOUNTS.forEach(account => console.log(`- @${account}`));
  fetcher.addAccounts(TEST_ACCOUNTS);
  
  console.log('-'.repeat(80));
  console.log('Starting fetcher...');
  console.log('This will demonstrate how the fetcher handles rate limits');
  console.log('by processing accounts in batches with appropriate delays.');
  console.log('-'.repeat(80));
  
  // Start the fetcher
  const startTime = Date.now();
  const results = await fetcher.start();
  const endTime = Date.now();
  
  // Calculate duration
  const durationSeconds = (endTime - startTime) / 1000;
  const durationMinutes = durationSeconds / 60;
  
  // Display results
  console.log('\n' + '='.repeat(80));
  console.log('TEST RESULTS');
  console.log('='.repeat(80));
  
  console.log(`Total duration: ${durationSeconds.toFixed(2)} seconds (${durationMinutes.toFixed(2)} minutes)`);
  console.log(`Processed accounts: ${results.processed.length}/${TEST_ACCOUNTS.length}`);
  
  console.log('\nProcessed accounts:');
  results.processed.forEach(account => console.log(`- @${account}`));
  
  if (Object.keys(results.failed).length > 0) {
    console.log('\nFailed accounts:');
    for (const [handle, reason] of Object.entries(results.failed)) {
      console.log(`- @${handle}: ${reason}`);
    }
  }
  
  // Display rate limit information
  if (results.rateLimits) {
    console.log('\nFinal rate limit status:');
    console.log(`- API calls remaining: ${results.rateLimits.remaining}/${results.rateLimits.limit}`);
    
    if (results.rateLimits.day) {
      console.log(`- Daily limit remaining: ${results.rateLimits.day.remaining}/${results.rateLimits.day.limit}`);
      console.log(`- Daily limit resets at: ${new Date(results.rateLimits.day.reset * 1000).toISOString()}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('TEST COMPLETED');
  console.log('='.repeat(80));
  console.log('Check rate-limited-fetcher-test.log for detailed logs');
}

// Run the test
testRateLimitedFetcher().catch(error => {
  console.error('Error in test:', error);
});
