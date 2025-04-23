require('dotenv').config();
const twitter = require('../src/twitter');
const logger = require('../src/logger');

// Set logger to debug level for more detailed output
logger.setLogLevel('DEBUG');

// Function to check rate limits for specific endpoints
async function checkRateLimits() {
  try {
    console.log('Checking Twitter API rate limits...');
    
    // Use the new checkRateLimits function from twitter.js
    const result = await twitter.checkRateLimits();
    
    if (!result.success) {
      console.error('Error checking rate limits:', result.error);
      return;
    }
    
    const rateLimitInfo = result.rateLimitInfo;
    
    if (!rateLimitInfo) {
      console.error('No rate limit information available');
      return;
    }
    
    // Create a rate limits object for display
    const rateLimits = {
      data: {
        resources: {
          'userLookup': {
            limit: rateLimitInfo.limit || 0,
            remaining: rateLimitInfo.remaining || 0,
            reset: rateLimitInfo.reset || 0
          },
          'userTimeline': {
            limit: rateLimitInfo.limit || 0,
            remaining: rateLimitInfo.remaining || 0,
            reset: rateLimitInfo.reset || 0
          }
        }
      }
    };
    
    // Add daily limit information if available
    if (rateLimitInfo.day) {
      rateLimits.data.resources.app = {
        limit: rateLimitInfo.day.limit || 0,
        remaining: rateLimitInfo.day.remaining || 0,
        reset: rateLimitInfo.day.reset || 0
      };
    }
    
    console.log('\n=== TWITTER API RATE LIMITS ===\n');
    
    // Display rate limits for user lookup endpoint
    const userLookupEndpoint = rateLimits.data.resources['userLookup'];
    if (userLookupEndpoint) {
      console.log('User Lookup Endpoint (/users/by/username/:username):');
      console.log(`  Limit: ${userLookupEndpoint.limit} requests`);
      console.log(`  Remaining: ${userLookupEndpoint.remaining} requests`);
      
      const resetTime = new Date(userLookupEndpoint.reset * 1000);
      console.log(`  Resets at: ${resetTime.toISOString()} (${formatTimeUntil(resetTime)})`);
      
      // Calculate usage percentage
      const usagePercentage = ((userLookupEndpoint.limit - userLookupEndpoint.remaining) / userLookupEndpoint.limit) * 100;
      console.log(`  Usage: ${usagePercentage.toFixed(2)}%`);
      console.log();
    }
    
    // Display rate limits for user tweets endpoint
    const userTimelineEndpoint = rateLimits.data.resources['userTimeline'];
    if (userTimelineEndpoint) {
      console.log('User Tweets Endpoint (/users/:id/tweets):');
      console.log(`  Limit: ${userTimelineEndpoint.limit} requests`);
      console.log(`  Remaining: ${userTimelineEndpoint.remaining} requests`);
      
      const resetTime = new Date(userTimelineEndpoint.reset * 1000);
      console.log(`  Resets at: ${resetTime.toISOString()} (${formatTimeUntil(resetTime)})`);
      
      // Calculate usage percentage
      const usagePercentage = ((userTimelineEndpoint.limit - userTimelineEndpoint.remaining) / userTimelineEndpoint.limit) * 100;
      console.log(`  Usage: ${usagePercentage.toFixed(2)}%`);
      console.log();
    }
    
    // Display app-wide rate limits if available
    if (rateLimits.data.resources.app) {
      console.log('App-wide Rate Limits (Daily):');
      console.log(`  Limit: ${rateLimits.data.resources.app.limit} requests`);
      console.log(`  Remaining: ${rateLimits.data.resources.app.remaining} requests`);
      
      const resetTime = new Date(rateLimits.data.resources.app.reset * 1000);
      console.log(`  Resets at: ${resetTime.toISOString()} (${formatTimeUntil(resetTime)})`);
      
      // Calculate usage percentage
      const usagePercentage = ((rateLimits.data.resources.app.limit - rateLimits.data.resources.app.remaining) / rateLimits.data.resources.app.limit) * 100;
      console.log(`  Usage: ${usagePercentage.toFixed(2)}%`);
      
      // Use the new logger function for daily rate limit status
      logger.dailyRateLimitStatus(
        rateLimits.data.resources.app.remaining,
        rateLimits.data.resources.app.limit,
        rateLimits.data.resources.app.reset * 1000
      );
      
      console.log();
    }
    
    console.log('=== RECOMMENDATIONS ===\n');
    
    // Provide recommendations based on rate limit status
    let lowestRemainingPercentage = 100;
    
    // Check endpoint-specific limits
    if (userLookupEndpoint && userLookupEndpoint.limit > 0) {
      lowestRemainingPercentage = Math.min(
        lowestRemainingPercentage,
        (userLookupEndpoint.remaining / userLookupEndpoint.limit) * 100
      );
    }
    
    if (userTimelineEndpoint && userTimelineEndpoint.limit > 0) {
      lowestRemainingPercentage = Math.min(
        lowestRemainingPercentage,
        (userTimelineEndpoint.remaining / userTimelineEndpoint.limit) * 100
      );
    }
    
    // Check daily app-wide limits
    if (rateLimits.data.resources.app && rateLimits.data.resources.app.limit > 0) {
      const appRemainingPercentage = (rateLimits.data.resources.app.remaining / rateLimits.data.resources.app.limit) * 100;
      lowestRemainingPercentage = Math.min(lowestRemainingPercentage, appRemainingPercentage);
    }
    
    if (lowestRemainingPercentage < 10) {
      console.log('⚠️ CRITICAL: Rate limits are nearly exhausted!');
      console.log('Recommendations:');
      console.log('- Pause all monitoring for at least 15 minutes');
      console.log('- Reduce batch size to 1 account');
      console.log('- Increase batch interval to 30 minutes');
      console.log('- Increase delay between API calls to at least 20 seconds');
    } else if (lowestRemainingPercentage < 30) {
      console.log('⚠️ WARNING: Rate limits are running low.');
      console.log('Recommendations:');
      console.log('- Reduce batch size to 1 account');
      console.log('- Increase batch interval to 25 minutes');
      console.log('- Increase delay between API calls to at least 15 seconds');
      console.log('- Consider pausing non-essential monitoring');
    } else if (lowestRemainingPercentage < 60) {
      console.log('ℹ️ NOTICE: Rate limits are being used at a moderate rate.');
      console.log('Recommendations:');
      console.log('- Current settings should be fine');
      console.log('- Keep batch size at 1 account');
      console.log('- Maintain batch interval of at least 20 minutes');
      console.log('- Monitor usage if processing many accounts');
    } else {
      console.log('✅ GOOD: Plenty of rate limit capacity available.');
      console.log('Recommendations:');
      console.log('- Current settings are working well');
      console.log('- Keep batch size at 1 account for safety');
      console.log('- Maintain batch interval of at least 15 minutes');
    }
    
    // Display current application settings
    console.log('\n=== CURRENT APPLICATION SETTINGS ===\n');
    console.log('- Batch Size: 1 account');
    console.log('- Batch Interval: 25 minutes');
    console.log('- Base API Delay: 15 seconds');
    console.log('- Daily API Limit: 90 calls');
    
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
