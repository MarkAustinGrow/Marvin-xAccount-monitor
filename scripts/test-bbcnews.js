require('dotenv').config();
const twitter = require('../src/twitter');
const util = require('util');

// Test configuration
const TEST_ACCOUNT = 'BBCNews';
const TWEETS_TO_FETCH = 1; // Just fetch one tweet to minimize API usage
const INCLUDE_REPLIES = true; // This was causing the original issue
const INCLUDE_RETWEETS = false;

// Helper function to pretty-print objects
function prettyPrint(obj) {
  return util.inspect(obj, { colors: true, depth: 5, compact: false });
}

async function testBBCNewsTweets() {
  console.log('='.repeat(80));
  console.log(`TWITTER API TEST: Fetching tweets from @${TEST_ACCOUNT}`);
  console.log('='.repeat(80));
  console.log(`Configuration:`);
  console.log(`- Account: @${TEST_ACCOUNT}`);
  console.log(`- Tweets to fetch: ${TWEETS_TO_FETCH}`);
  console.log(`- Include replies: ${INCLUDE_REPLIES}`);
  console.log(`- Include retweets: ${INCLUDE_RETWEETS}`);
  console.log('-'.repeat(80));
  
  try {
    // Step 1: Get the user ID for the account
    console.log(`\nSTEP 1: Looking up user ID for @${TEST_ACCOUNT}...`);
    
    let userId;
    try {
      userId = await twitter.getUserId(TEST_ACCOUNT);
      console.log(`✅ Successfully retrieved user ID: ${userId}`);
    } catch (error) {
      console.error(`❌ Error getting user ID for @${TEST_ACCOUNT}:`);
      console.error(prettyPrint(error));
      return;
    }
    
    // Step 2: Fetch tweets for the user
    console.log(`\nSTEP 2: Fetching tweets for @${TEST_ACCOUNT} (ID: ${userId})...`);
    console.log(`Making API request with:`);
    console.log(`- includeReplies: ${INCLUDE_REPLIES}`);
    console.log(`- includeRetweets: ${INCLUDE_RETWEETS}`);
    
    let tweets;
    try {
      tweets = await twitter.fetchRecentTweets(
        TEST_ACCOUNT,
        TWEETS_TO_FETCH,
        INCLUDE_REPLIES,
        INCLUDE_RETWEETS
      );
      
      // Check if we got rate limit info
      if (tweets && tweets.rateLimit) {
        console.log('\nRate limit information:');
        console.log(prettyPrint(tweets.rateLimit));
      }
      
      // Check if we got any tweets
      if (!tweets || tweets.length === 0) {
        console.log(`\n❌ No tweets found for @${TEST_ACCOUNT}.`);
        return;
      }
      
      console.log(`\n✅ Successfully fetched ${tweets.length} tweets for @${TEST_ACCOUNT}!`);
      
      // Display the tweets
      tweets.forEach((tweet, index) => {
        console.log('\n' + '-'.repeat(80));
        console.log(`TWEET ${index + 1}:`);
        console.log(`ID: ${tweet.tweet_id}`);
        console.log(`Text: ${tweet.tweet_text}`);
        console.log(`URL: ${tweet.tweet_url}`);
        console.log(`Created: ${tweet.created_at}`);
        console.log(`Engagement Score: ${tweet.engagement_score}`);
        
        // Display public metrics if available
        if (tweet.public_metrics) {
          try {
            const metrics = JSON.parse(tweet.public_metrics);
            console.log('\nEngagement Metrics:');
            console.log(`- Retweets: ${metrics.retweet_count || 0}`);
            console.log(`- Replies: ${metrics.reply_count || 0}`);
            console.log(`- Likes: ${metrics.like_count || 0}`);
            console.log(`- Quotes: ${metrics.quote_count || 0}`);
          } catch (e) {
            console.log(`Could not parse public metrics: ${e.message}`);
          }
        }
      });
      
      console.log('\n' + '='.repeat(80));
      console.log('TEST COMPLETED SUCCESSFULLY!');
      console.log('The Twitter API integration is working correctly.');
      console.log('='.repeat(80));
    } catch (error) {
      console.error(`\n❌ Error fetching tweets for @${TEST_ACCOUNT}:`);
      console.error(prettyPrint(error));
      
      // Check for specific error types
      if (error.code === 429) {
        console.error('\nRATE LIMIT EXCEEDED!');
        if (error.rateLimit) {
          console.error(`Rate limit resets at: ${new Date(error.rateLimit.reset * 1000).toISOString()}`);
        }
      } else if (error.code === 'VALIDATION_ERROR') {
        console.error('\nVALIDATION ERROR!');
        console.error(`Message: ${error.message}`);
      } else if (error.code === 400) {
        console.error('\nBAD REQUEST ERROR!');
        if (error.errors) {
          console.error('Error details:');
          console.error(prettyPrint(error.errors));
        }
      }
    }
  } catch (error) {
    console.error('Unhandled error in test:');
    console.error(prettyPrint(error));
  }
}

// Run the test
testBBCNewsTweets().catch(error => {
  console.error('Fatal error in test:');
  console.error(prettyPrint(error));
});
