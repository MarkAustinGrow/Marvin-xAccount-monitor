require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs');
const path = require('path');

// Initialize Twitter client with bearer token for read-only access
const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
const readOnlyClient = twitterClient.readOnly;

// Cache for user IDs to reduce API calls
const userIdCache = new Map();
const USER_CACHE_FILE = path.join(__dirname, '..', 'cache', 'user_id_cache.json');

// Load user ID cache from file if it exists
function loadUserIdCache() {
  try {
    if (fs.existsSync(USER_CACHE_FILE)) {
      const cacheData = JSON.parse(fs.readFileSync(USER_CACHE_FILE, 'utf8'));
      Object.entries(cacheData).forEach(([handle, id]) => {
        userIdCache.set(handle, id);
      });
      console.log(`Loaded ${userIdCache.size} user IDs from cache.`);
    }
  } catch (error) {
    console.error('Error loading user ID cache:', error);
  }
}

// Save user ID cache to file
function saveUserIdCache() {
  try {
    // Create cache directory if it doesn't exist
    const cacheDir = path.dirname(USER_CACHE_FILE);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    const cacheData = {};
    userIdCache.forEach((id, handle) => {
      cacheData[handle] = id;
    });
    fs.writeFileSync(USER_CACHE_FILE, JSON.stringify(cacheData, null, 2));
    console.log(`Saved ${userIdCache.size} user IDs to cache.`);
  } catch (error) {
    console.error('Error saving user ID cache:', error);
  }
}

// Load the cache on startup
loadUserIdCache();

// Function to get user ID from handle (with caching)
async function getUserId(handle, db) {
  // Check cache first
  if (userIdCache.has(handle)) {
    return userIdCache.get(handle);
  }
  
  // If not in cache, fetch from API
  try {
    const user = await readOnlyClient.v2.userByUsername(handle);
    
    if (!user || !user.data) {
      console.error(`User @${handle} not found.`);
      return null;
    }
    
    const userId = user.data.id;
    
    // Add to cache
    userIdCache.set(handle, userId);
    
    // Save cache periodically (every 10 new entries)
    if (userIdCache.size % 10 === 0) {
      saveUserIdCache();
    }
    
    return userId;
  } catch (error) {
    console.error(`Error fetching user ID for @${handle}:`, error);
    
    // Handle rate limit errors
    if (error.code === 429) {
      throw error; // Let the caller handle rate limits
    }
    
    // Handle validation errors (username format/length)
    if (error.code === 400 && 
        error.errors && 
        error.errors.some(e => e.message && e.message.includes('username') && e.message.includes('does not match'))) {
      
      // Extract the specific error message
      const validationError = error.errors.find(e => e.message && e.message.includes('username'));
      const errorMessage = validationError ? validationError.message : 'Username validation error';
      
      console.error(`Validation error for @${handle}: ${errorMessage}`);
      
      // Add to review list if db is provided
      if (db) {
        await db.addAccountToReview(handle, errorMessage, '400');
      }
      
      // Return special error code to indicate validation error
      throw {
        code: 'VALIDATION_ERROR',
        originalError: error,
        message: errorMessage
      };
    }
    
    return null;
  }
}

// Function to fetch recent tweets for a user
async function fetchRecentTweets(handle, count = 3, includeReplies = false, includeRetweets = false, db = null) {
  try {
    console.log(`Fetching recent tweets for @${handle}...`);
    
    // Get user ID (from cache if possible)
    const userId = await getUserId(handle, db);
    
    if (!userId) {
      return [];
    }
    
    // Fetch tweets for the user
    const tweets = await readOnlyClient.v2.userTimeline(userId, {
      max_results: 10, // Fetch more than needed to filter out replies/retweets if necessary
      'tweet.fields': ['created_at', 'text', 'id', 'referenced_tweets'],
      exclude: includeReplies ? [] : ['replies'],
    });
    
    if (!tweets || !tweets.data || tweets.data.length === 0) {
      console.log(`No tweets found for @${handle}.`);
      return [];
    }
    
    // According to Twitter API v2 documentation, the response structure should be:
    // {
    //   "data": [ array of tweet objects ],
    //   "meta": { metadata about the response },
    //   "includes": { expanded objects }
    // }
    
    // Log the response structure for debugging
    console.log(`Response structure for @${handle}:`, 
      JSON.stringify({
        hasData: !!tweets.data,
        dataType: typeof tweets.data,
        isDataArray: Array.isArray(tweets.data),
        hasMeta: !!tweets.meta,
        hasIncludes: !!tweets.includes
      }, null, 2)
    );
    
    // Ensure we have an array of tweets to work with
    let filteredTweets = [];
    
    // Standard Twitter API v2 response format
    if (tweets.data && Array.isArray(tweets.data)) {
      console.log(`Found ${tweets.data.length} tweets in standard format`);
      filteredTweets = tweets.data;
    }
    // Handle paginated results where tweets might be in _realData.data
    else if (tweets._realData && tweets._realData.data && Array.isArray(tweets._realData.data)) {
      console.log(`Found ${tweets._realData.data.length} tweets in _realData format`);
      filteredTweets = tweets._realData.data;
    }
    // Handle case where the library might have already extracted the data
    else if (tweets.tweets && Array.isArray(tweets.tweets)) {
      console.log(`Found ${tweets.tweets.length} tweets in tweets property`);
      filteredTweets = tweets.tweets;
    }
    // Handle case where we might have a single tweet object
    else if (tweets.data && typeof tweets.data === 'object' && tweets.data.id) {
      console.log(`Found a single tweet object`);
      filteredTweets = [tweets.data];
    }
    // If we still don't have an array, log the error and return empty
    else {
      console.error(`Unexpected response format for @${handle}. Could not find tweet data.`);
      console.log("Response keys:", Object.keys(tweets));
      if (tweets.data) {
        console.log("Data keys:", Object.keys(tweets.data));
      }
      return [];
    }
    
    // Filter out retweets if necessary
    if (!includeRetweets) {
      filteredTweets = filteredTweets.filter(tweet => {
        return !tweet.referenced_tweets || !tweet.referenced_tweets.some(ref => ref.type === 'retweeted');
      });
    }
    
    // Take only the requested number of tweets
    const limitedTweets = filteredTweets.slice(0, count);
    
    // Check if we found any tweets after filtering
    if (limitedTweets.length === 0) {
      console.log(`No tweets found for @${handle} after filtering.`);
      return [];
    }
    
    // Format the tweets for storage
    const formattedTweets = limitedTweets.map(tweet => ({
      tweet_id: tweet.id,
      tweet_text: tweet.text,
      tweet_url: `https://twitter.com/${handle}/status/${tweet.id}`,
      created_at: new Date(tweet.created_at).toISOString(),
      fetched_at: new Date().toISOString()
    }));
    
    console.log(`Fetched ${formattedTweets.length} tweets for @${handle}.`);
    return formattedTweets;
  } catch (error) {
    console.error(`Error fetching tweets for @${handle}:`, error);
    
    // Handle rate limit errors
    if (error.code === 429) {
      const resetTime = error.rateLimit?.reset;
      if (resetTime) {
        const resetDate = new Date(resetTime * 1000);
        console.error(`Rate limit exceeded. Resets at ${resetDate.toISOString()}`);
      }
      throw error; // Let the caller handle rate limits
    }
    
    return [];
  }
}

// Function to add a delay between API calls to respect rate limits
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Exponential backoff for retries
async function exponentialBackoff(retryCount, baseDelay = 1000) {
  const delayMs = baseDelay * Math.pow(2, retryCount);
  const jitter = Math.random() * 1000;
  const totalDelay = delayMs + jitter;
  console.log(`Exponential backoff: Waiting ${Math.round(totalDelay / 1000)} seconds before retry #${retryCount + 1}...`);
  await delay(totalDelay);
}

// Save cache on process exit
process.on('exit', () => {
  saveUserIdCache();
});

module.exports = {
  twitterClient,
  readOnlyClient,
  fetchRecentTweets,
  getUserId,
  delay,
  exponentialBackoff,
  userIdCache
};
