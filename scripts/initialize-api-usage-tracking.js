/**
 * Initialize API Usage Tracking
 * 
 * This script initializes the api_usage_stats table with the current usage data from Twitter.
 * It should be run once to set up the tracking system.
 */

require('dotenv').config();
const db = require('../src/db');
const twitter = require('../src/twitter');
const logger = require('../src/logger');

// Configuration
const DAILY_API_LIMIT = 400; // Set to 80% of the 500/day app limit for Basic tier

async function initializeApiUsageTracking() {
  try {
    console.log('Initializing API usage tracking...');
    
    // Check if the api_usage_stats table exists and has data for today
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const { data: existingData, error: getError } = await db.supabase
      .from('api_usage_stats')
      .select('id, calls_made')
      .eq('date', today)
      .single();
    
    if (getError && getError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      console.error('Error checking API usage stats:', getError);
      return false;
    }
    
    if (existingData) {
      console.log(`Found existing API usage record for today with ${existingData.calls_made} calls made.`);
      console.log('No initialization needed.');
      return true;
    }
    
    // No existing data, get current usage from Twitter API
    console.log('No existing API usage record found for today. Checking Twitter API...');
    
    const result = await twitter.checkRateLimits();
    
    if (result.success && result.rateLimitInfo) {
      const rateLimitInfo = result.rateLimitInfo;
      
      // Calculate calls made today
      let callsMade = 1; // Count this call
      let resetTime = null;
      
      if (rateLimitInfo.day) {
        callsMade = rateLimitInfo.day.limit - rateLimitInfo.day.remaining;
        resetTime = rateLimitInfo.day.reset * 1000; // Convert to milliseconds
        
        console.log(`Twitter reports ${callsMade} API calls made today (${rateLimitInfo.day.remaining}/${rateLimitInfo.day.limit} remaining).`);
      } else {
        console.log('Could not get daily rate limit information from Twitter. Using default values.');
        callsMade = 1; // Just count this call
      }
      
      // Create a new entry in the database
      const { data: insertData, error: insertError } = await db.supabase
        .from('api_usage_stats')
        .insert({
          date: today,
          calls_made: callsMade,
          daily_limit: DAILY_API_LIMIT,
          reset_time: resetTime ? new Date(resetTime).toISOString() : null,
          created_at: new Date().toISOString()
        })
        .select();
      
      if (insertError) {
        console.error('Error inserting API usage stats:', insertError);
        return false;
      }
      
      console.log(`Successfully initialized API usage tracking with ${callsMade} calls made today.`);
      console.log(`Daily limit set to ${DAILY_API_LIMIT} calls.`);
      
      if (resetTime) {
        console.log(`Rate limit resets at ${new Date(resetTime).toISOString()}.`);
      }
      
      return true;
    } else {
      console.error('Failed to get rate limit information from Twitter:', result.error);
      
      // Create a record anyway with default values
      const { data: insertData, error: insertError } = await db.supabase
        .from('api_usage_stats')
        .insert({
          date: today,
          calls_made: 1, // Just count this call
          daily_limit: DAILY_API_LIMIT,
          reset_time: null,
          created_at: new Date().toISOString()
        })
        .select();
      
      if (insertError) {
        console.error('Error inserting default API usage stats:', insertError);
        return false;
      }
      
      console.log(`Created default API usage tracking record with 1 call made today.`);
      console.log(`Daily limit set to ${DAILY_API_LIMIT} calls.`);
      
      return true;
    }
  } catch (error) {
    console.error('Error initializing API usage tracking:', error);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the initialization if this script is executed directly
if (require.main === module) {
  initializeApiUsageTracking()
    .then(success => {
      if (success) {
        console.log('API usage tracking initialization completed successfully.');
      } else {
        console.error('API usage tracking initialization failed.');
        process.exit(1);
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('Unhandled error in initialization:', error);
      process.exit(1);
    });
}

module.exports = initializeApiUsageTracking;
