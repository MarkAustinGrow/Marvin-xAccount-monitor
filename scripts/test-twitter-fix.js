require('dotenv').config();
const twitter = require('../src/twitter');
const logger = require('../src/logger');

// Test account to fetch tweets for
const TEST_ACCOUNT = process.argv[2] || 'OBEYGIANT'; // Default test account or use command line argument

// Configuration for testing
const TWEETS_PER_ACCOUNT = 5;
const INCLUDE_REPLIES = true; // This is the case that was causing the error
const INCLUDE_RETWEETS = true;

async function testTwitterFix() {
  try {
    console.log(`Testing Twitter API fix with account: @${TEST_ACCOUNT}`);
    console.log(`Include replies: ${INCLUDE_REPLIES}, Include retweets: ${INCLUDE_RETWEETS}`);
    
    // Fetch tweets using the fixed function
    console.log(`Fetching tweets for @${TEST_ACCOUNT}...`);
    const tweets = await twitter.fetchRecentTweets(
      TEST_ACCOUNT,
      TWEETS_PER_ACCOUNT,
      INCLUDE_REPLIES,
      INCLUDE_RETWEETS
    );
    
    if (!tweets || tweets.length === 0) {
      console.log(`No tweets found for @${TEST_ACCOUNT}.`);
      return;
    }
    
    console.log(`Successfully fetched ${tweets.length} tweets for @${TEST_ACCOUNT}:`);
    
    // Display the fetched tweets
    tweets.forEach((tweet, index) => {
      console.log(`\nTweet ${index + 1}:`);
      console.log(`ID: ${tweet.tweet_id}`);
      console.log(`Text: ${tweet.tweet_text}`);
      console.log(`URL: ${tweet.tweet_url}`);
      console.log(`Created: ${tweet.created_at}`);
      console.log(`Engagement Score: ${tweet.engagement_score}`);
    });
    
    console.log('\nTest completed successfully! The fix appears to be working.');
  } catch (error) {
    console.error('Error testing Twitter API fix:', error);
    
    if (error.code === 400) {
      console.error('The fix did not resolve the 400 Bad Request error.');
      console.error('Error details:', error.errors || error.message);
    } else if (error.code === 429) {
      console.error('Rate limit exceeded. Please try again later.');
      if (error.rateLimit && error.rateLimit.reset) {
        const resetDate = new Date(error.rateLimit.reset * 1000);
        console.error(`Rate limit resets at: ${resetDate.toISOString()}`);
      }
    }
  }
}

// Run the test
testTwitterFix().catch(error => {
  console.error('Unhandled error in test:', error);
});
