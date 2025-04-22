require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');

// Initialize Twitter client with bearer token for read-only access
const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
const readOnlyClient = twitterClient.readOnly;

// Function to check rate limits for specific endpoints
async function checkRateLimits() {
  try {
    console.log('Checking Twitter API rate limits...');
    
    // Make a test request to get rate limit headers
    const testUserLookup = await readOnlyClient.v2.userByUsername('twitter')
      .catch(error => {
        // Even if the request fails due to rate limits, we'll still get the headers
        return error;
      });
    
    // Extract rate limit info from headers
    const userLookupHeaders = testUserLookup.rateLimit || 
                             (testUserLookup._headers ? {
                               limit: parseInt(testUserLookup._headers['x-rate-limit-limit'] || '0'),
                               remaining: parseInt(testUserLookup._headers['x-rate-limit-remaining'] || '0'),
                               reset: parseInt(testUserLookup._headers['x-rate-limit-reset'] || '0')
                             } : null);
    
    // Make a test request to get user timeline rate limit headers
    // First get a user ID
    const userId = testUserLookup.data?.id || '12';  // Twitter's official account ID as fallback
    
    const testUserTimeline = await readOnlyClient.v2.userTimeline(userId, { max_results: 5 })
      .catch(error => {
        // Even if the request fails due to rate limits, we'll still get the headers
        return error;
      });
    
    // Extract rate limit info from headers
    const userTimelineHeaders = testUserTimeline.rateLimit || 
                               (testUserTimeline._headers ? {
                                 limit: parseInt(testUserTimeline._headers['x-rate-limit-limit'] || '0'),
                                 remaining: parseInt(testUserTimeline._headers['x-rate-limit-remaining'] || '0'),
                                 reset: parseInt(testUserTimeline._headers['x-rate-limit-reset'] || '0')
                               } : null);
    
    // Create a rate limits object similar to what we'd expect from rateLimitStatus
    const rateLimits = {
      data: {
        resources: {
          '/users/by/username/:username': userLookupHeaders,
          '/users/:id/tweets': userTimelineHeaders
        }
      }
    };
    
    console.log('\n=== TWITTER API RATE LIMITS ===\n');
    
    // Display rate limits for user lookup endpoint
    const userLookupLimits = rateLimits.data.resources['/users/by/username/:username'];
    if (userLookupLimits) {
      console.log('User Lookup Endpoint (/users/by/username/:username):');
      console.log(`  Limit: ${userLookupLimits.limit} requests`);
      console.log(`  Remaining: ${userLookupLimits.remaining} requests`);
      
      const resetTime = new Date(userLookupLimits.reset * 1000);
      console.log(`  Resets at: ${resetTime.toISOString()} (${formatTimeUntil(resetTime)})`);
      
      // Calculate usage percentage
      const usagePercentage = ((userLookupLimits.limit - userLookupLimits.remaining) / userLookupLimits.limit) * 100;
      console.log(`  Usage: ${usagePercentage.toFixed(2)}%`);
      console.log();
    }
    
    // Display rate limits for user tweets endpoint
    const userTweetsLimits = rateLimits.data.resources['/users/:id/tweets'];
    if (userTweetsLimits) {
      console.log('User Tweets Endpoint (/users/:id/tweets):');
      console.log(`  Limit: ${userTweetsLimits.limit} requests`);
      console.log(`  Remaining: ${userTweetsLimits.remaining} requests`);
      
      const resetTime = new Date(userTweetsLimits.reset * 1000);
      console.log(`  Resets at: ${resetTime.toISOString()} (${formatTimeUntil(resetTime)})`);
      
      // Calculate usage percentage
      const usagePercentage = ((userTweetsLimits.limit - userTweetsLimits.remaining) / userTweetsLimits.limit) * 100;
      console.log(`  Usage: ${usagePercentage.toFixed(2)}%`);
      console.log();
    }
    
    // Display app-wide rate limits if available
    if (rateLimits.data.resources.app) {
      console.log('App-wide Rate Limits:');
      console.log(`  Limit: ${rateLimits.data.resources.app.limit} requests`);
      console.log(`  Remaining: ${rateLimits.data.resources.app.remaining} requests`);
      
      const resetTime = new Date(rateLimits.data.resources.app.reset * 1000);
      console.log(`  Resets at: ${resetTime.toISOString()} (${formatTimeUntil(resetTime)})`);
      
      // Calculate usage percentage
      const usagePercentage = ((rateLimits.data.resources.app.limit - rateLimits.data.resources.app.remaining) / rateLimits.data.resources.app.limit) * 100;
      console.log(`  Usage: ${usagePercentage.toFixed(2)}%`);
      console.log();
    }
    
    console.log('=== RECOMMENDATIONS ===\n');
    
    // Provide recommendations based on rate limit status
    const lowestRemainingPercentage = Math.min(
      userLookupLimits ? (userLookupLimits.remaining / userLookupLimits.limit) * 100 : 100,
      userTweetsLimits ? (userTweetsLimits.remaining / userTweetsLimits.limit) * 100 : 100
    );
    
    if (lowestRemainingPercentage < 10) {
      console.log('⚠️ CRITICAL: Rate limits are nearly exhausted!');
      console.log('Recommendations:');
      console.log('- Pause all monitoring for at least 15 minutes');
      console.log('- Reduce batch size to 1-2 accounts');
      console.log('- Increase delay between API calls');
    } else if (lowestRemainingPercentage < 30) {
      console.log('⚠️ WARNING: Rate limits are running low.');
      console.log('Recommendations:');
      console.log('- Reduce batch size');
      console.log('- Increase delay between API calls');
      console.log('- Consider pausing non-essential monitoring');
    } else if (lowestRemainingPercentage < 60) {
      console.log('ℹ️ NOTICE: Rate limits are being used at a moderate rate.');
      console.log('Recommendations:');
      console.log('- Current settings should be fine');
      console.log('- Monitor usage if processing many accounts');
    } else {
      console.log('✅ GOOD: Plenty of rate limit capacity available.');
      console.log('Recommendations:');
      console.log('- Current settings are working well');
      console.log('- You can safely process more accounts if needed');
    }
    
  } catch (error) {
    console.error('Error checking rate limits:', error);
    
    if (error.code === 401) {
      console.error('\nAuthentication error. Please check your Twitter API credentials in the .env file.');
    } else if (error.code === 429) {
      console.error('\nRate limit exceeded. Please try again later.');
    }
  }
}

// Helper function to format time until reset
function formatTimeUntil(date) {
  const now = new Date();
  const diffMs = date - now;
  
  if (diffMs <= 0) {
    return 'reset now';
  }
  
  const diffSecs = Math.floor(diffMs / 1000);
  const mins = Math.floor(diffSecs / 60);
  const secs = diffSecs % 60;
  
  return `${mins}m ${secs}s until reset`;
}

// Run the check
checkRateLimits()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
