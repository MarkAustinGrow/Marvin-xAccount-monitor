/**
 * Test Tweet Fetch Optimization
 * 
 * This script tests the tweet fetch optimization that only fetches tweets
 * newer than the most recent cached tweet.
 */

require('dotenv').config();
const db = require('../src/db');
const twitter = require('../src/twitter');
const logger = require('../src/logger');

// Configuration
const TEST_ACCOUNT = process.argv[2] || 'OBEYGIANT'; // Default test account or use command line argument
const TWEETS_TO_FETCH = 10;

// Main test function
async function testTweetFetchOptimization() {
  try {
    console.log('🧪 TESTING TWEET FETCH OPTIMIZATION 🧪');
    console.log(`Testing with account: @${TEST_ACCOUNT}`);
    
    // Initialize database
    const dbInitialized = await db.initializeDatabase();
    if (!dbInitialized) {
      console.error('Failed to initialize database. Exiting...');
      process.exit(1);
    }
    
    // Get the test account from the database
    const { data: account, error } = await db.supabase
      .from('x_accounts')
      .select('*')
      .eq('handle', TEST_ACCOUNT)
      .single();
    
    if (error || !account) {
      console.error(`Test account @${TEST_ACCOUNT} not found in database. Please add it first.`);
      console.log(`You can add it by running: npm run parse-accounts`);
      process.exit(1);
    }
    
    // Step 1: Get existing cached tweets for this account
    console.log('\n📊 STEP 1: Checking existing cached tweets');
    const cachedTweets = await db.getCachedTweets(account.id);
    console.log(`Found ${cachedTweets.length} cached tweets for @${TEST_ACCOUNT}`);
    
    // Find the most recent tweet date if we have cached tweets
    let mostRecentTweetDate = null;
    if (cachedTweets.length > 0) {
      // Find the most recent tweet by created_at date
      mostRecentTweetDate = cachedTweets.reduce((latest, tweet) => {
        const tweetDate = new Date(tweet.created_at);
        return tweetDate > latest ? tweetDate : latest;
      }, new Date(0)).toISOString();
      
      console.log(`Most recent tweet is from: ${mostRecentTweetDate}`);
    } else {
      console.log('No cached tweets found. Will fetch without since_date parameter.');
    }
    
    // Step 2: Fetch tweets without optimization (for comparison)
    console.log('\n📊 STEP 2: Fetching tweets WITHOUT optimization');
    console.time('Without optimization');
    const tweetsWithoutOptimization = await twitter.fetchRecentTweets(
      TEST_ACCOUNT,
      TWEETS_TO_FETCH,
      true, // includeReplies
      true, // includeRetweets
      db
    );
    console.timeEnd('Without optimization');
    
    console.log(`Fetched ${tweetsWithoutOptimization.length} tweets without optimization`);
    
    // Step 3: Fetch tweets with optimization
    console.log('\n📊 STEP 3: Fetching tweets WITH optimization');
    console.time('With optimization');
    const tweetsWithOptimization = await twitter.fetchRecentTweets(
      TEST_ACCOUNT,
      TWEETS_TO_FETCH,
      true, // includeReplies
      true, // includeRetweets
      db,
      mostRecentTweetDate
    );
    console.timeEnd('With optimization');
    
    console.log(`Fetched ${tweetsWithOptimization.length} tweets with optimization`);
    
    // Step 4: Compare results
    console.log('\n📊 STEP 4: Comparing results');
    
    if (mostRecentTweetDate) {
      console.log('Since we had cached tweets, we should only get new tweets (if any)');
      
      if (tweetsWithOptimization.length === 0) {
        console.log('✅ No new tweets found since the most recent cached tweet - this is expected if no new tweets were posted');
      } else {
        console.log(`✅ Found ${tweetsWithOptimization.length} new tweets since the most recent cached tweet`);
        
        // Check if all new tweets are actually newer than the most recent cached tweet
        const allTweetsAreNewer = tweetsWithOptimization.every(tweet => {
          return new Date(tweet.created_at) > new Date(mostRecentTweetDate);
        });
        
        if (allTweetsAreNewer) {
          console.log('✅ All fetched tweets are newer than the most recent cached tweet');
        } else {
          console.log('❌ Some fetched tweets are older than the most recent cached tweet - this should not happen!');
        }
      }
    } else {
      console.log('Since we had no cached tweets, both methods should return the same number of tweets');
      
      if (tweetsWithOptimization.length === tweetsWithoutOptimization.length) {
        console.log('✅ Both methods returned the same number of tweets');
      } else {
        console.log('❌ Methods returned different numbers of tweets - this should not happen!');
      }
    }
    
    // Step 5: Display tweet details
    if (tweetsWithOptimization.length > 0) {
      console.log('\n📊 STEP 5: Displaying fetched tweets');
      
      tweetsWithOptimization.forEach((tweet, index) => {
        console.log(`\nTweet ${index + 1}:`);
        console.log(`ID: ${tweet.tweet_id}`);
        console.log(`Created: ${tweet.created_at}`);
        console.log(`Text: ${tweet.tweet_text.substring(0, 50)}...`);
      });
    }
    
    console.log('\n🎉 Test completed successfully!');
    
    // Clean up and exit
    process.exit(0);
  } catch (error) {
    console.error('Error in test:', error);
    process.exit(1);
  }
}

// Run the test
testTweetFetchOptimization();
