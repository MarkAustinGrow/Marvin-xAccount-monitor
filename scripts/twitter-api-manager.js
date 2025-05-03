require('dotenv').config();
const twitter = require('../src/twitter');
const util = require('util');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to pretty-print objects
function prettyPrint(obj) {
  return util.inspect(obj, { colors: true, depth: 5, compact: false });
}

// Helper function to prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Function to check current rate limits
async function checkRateLimits() {
  console.log('\n=== Checking Twitter API Rate Limits ===');
  
  try {
    const result = await twitter.checkRateLimits();
    
    if (result.success) {
      console.log('\n✅ Successfully retrieved rate limit information:');
      console.log(prettyPrint(result.rateLimitInfo));
      
      // Calculate time until reset
      if (result.rateLimitInfo && result.rateLimitInfo.reset) {
        const resetTime = new Date(result.rateLimitInfo.reset * 1000);
        const now = new Date();
        const minutesUntilReset = Math.round((resetTime - now) / 60000);
        
        console.log(`\nRate limit resets at: ${resetTime.toISOString()}`);
        console.log(`Time until reset: ${minutesUntilReset} minutes`);
      }
      
      // Check daily limits if available
      if (result.rateLimitInfo && result.rateLimitInfo.day) {
        const dayLimit = result.rateLimitInfo.day;
        console.log(`\nDaily limit: ${dayLimit.remaining}/${dayLimit.limit} remaining`);
        console.log(`Daily limit resets at: ${new Date(dayLimit.reset * 1000).toISOString()}`);
      }
    } else {
      console.error('\n❌ Failed to retrieve rate limit information:');
      console.error(prettyPrint(result.error));
    }
  } catch (error) {
    console.error('\n❌ Error checking rate limits:');
    console.error(prettyPrint(error));
  }
}

// Function to test fetching tweets from an account
async function testFetchTweets() {
  const account = await prompt('\nEnter Twitter handle to test (without @): ');
  const count = parseInt(await prompt('Number of tweets to fetch (1-10): '), 10) || 1;
  const includeReplies = (await prompt('Include replies? (y/n): ')).toLowerCase() === 'y';
  const includeRetweets = (await prompt('Include retweets? (y/n): ')).toLowerCase() === 'y';
  
  console.log('\n=== Fetching Tweets ===');
  console.log(`Account: @${account}`);
  console.log(`Count: ${count}`);
  console.log(`Include replies: ${includeReplies}`);
  console.log(`Include retweets: ${includeRetweets}`);
  
  try {
    // Step 1: Get the user ID
    console.log('\nStep 1: Looking up user ID...');
    const userId = await twitter.getUserId(account);
    console.log(`✅ User ID: ${userId}`);
    
    // Step 2: Fetch tweets
    console.log('\nStep 2: Fetching tweets...');
    const tweets = await twitter.fetchRecentTweets(
      account,
      count,
      includeReplies,
      includeRetweets
    );
    
    // Check rate limit info
    if (tweets && tweets.rateLimit) {
      console.log('\nRate limit information:');
      console.log(prettyPrint(tweets.rateLimit));
    }
    
    // Check if we got any tweets
    if (!tweets || tweets.length === 0) {
      console.log(`\n❌ No tweets found for @${account}.`);
      return;
    }
    
    console.log(`\n✅ Successfully fetched ${tweets.length} tweets!`);
    
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
    
    // Ask if user wants to save the tweets
    const saveOption = await prompt('\nSave these tweets to a file? (y/n): ');
    if (saveOption.toLowerCase() === 'y') {
      const filename = `tweets_${account}_${new Date().toISOString().replace(/:/g, '-')}.json`;
      fs.writeFileSync(filename, JSON.stringify(tweets, null, 2));
      console.log(`Tweets saved to ${filename}`);
    }
  } catch (error) {
    console.error('\n❌ Error fetching tweets:');
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
}

// Function to display the main menu
async function showMainMenu() {
  console.log('\n=== Twitter API Manager ===');
  console.log('1. Check current rate limits');
  console.log('2. Test fetching tweets from an account');
  console.log('3. Exit');
  
  const choice = await prompt('\nEnter your choice (1-3): ');
  
  switch (choice) {
    case '1':
      await checkRateLimits();
      break;
    case '2':
      await testFetchTweets();
      break;
    case '3':
      console.log('\nExiting...');
      rl.close();
      return;
    default:
      console.log('\nInvalid choice. Please try again.');
  }
  
  // Return to main menu
  await showMainMenu();
}

// Main function
async function main() {
  console.log('='.repeat(80));
  console.log('TWITTER API MANAGER');
  console.log('This tool helps you test and monitor your Twitter API usage');
  console.log('='.repeat(80));
  
  await showMainMenu();
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:');
  console.error(prettyPrint(error));
  rl.close();
});

// Handle readline close
rl.on('close', () => {
  process.exit(0);
});
