require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');

// Initialize Twitter client with bearer token for read-only access
const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
const readOnlyClient = twitterClient.readOnly;

async function testTwitterApi() {
  console.log('Testing Twitter API connection...');
  
  try {
    // Test a simple API call to get a user
    const testHandle = 'twitter'; // Using the official Twitter account as a test
    console.log(`Attempting to fetch user information for @${testHandle}...`);
    
    const user = await readOnlyClient.v2.userByUsername(testHandle);
    
    if (!user || !user.data) {
      console.error(`User @${testHandle} not found.`);
      return false;
    }
    
    console.log('Successfully connected to Twitter API!');
    console.log(`User information for @${testHandle}:`);
    console.log(JSON.stringify(user.data, null, 2));
    
    // Test fetching tweets
    console.log(`\nAttempting to fetch recent tweets for @${testHandle}...`);
    
    const tweets = await readOnlyClient.v2.userTimeline(user.data.id, {
      max_results: 3,
      'tweet.fields': ['created_at', 'text', 'id'],
    });
    
    if (!tweets || !tweets.data || tweets.data.length === 0) {
      console.error(`No tweets found for @${testHandle}.`);
      return false;
    }
    
    console.log(`Successfully fetched ${tweets.data.length} tweets!`);
    console.log('Recent tweets:');
    tweets.data.forEach((tweet, index) => {
      console.log(`\nTweet ${index + 1}:`);
      console.log(`ID: ${tweet.id}`);
      console.log(`Created at: ${tweet.created_at}`);
      console.log(`Text: ${tweet.text}`);
    });
    
    return true;
  } catch (error) {
    console.error('Error testing Twitter API connection:', error);
    
    if (error.code === 401) {
      console.error('\nAuthentication error. Please check your Twitter API credentials in the .env file.');
    } else if (error.code === 429) {
      console.error('\nRate limit exceeded. Please try again later.');
    }
    
    return false;
  }
}

// Run the test
testTwitterApi()
  .then(success => {
    if (success) {
      console.log('\nTwitter API connection test completed successfully.');
    } else {
      console.error('\nTwitter API connection test failed.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\nUnexpected error during Twitter API connection test:', error);
    process.exit(1);
  });
