require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to initialize database tables if they don't exist
async function initializeDatabase() {
  try {
    console.log('Initializing database tables...');
    
    // We don't need to create the tables here since we've already created them manually in Supabase
    console.log('Using existing tables in Supabase...');
    
    console.log('Database tables initialized successfully.');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}

// Function to get all accounts to monitor
async function getAccountsToMonitor() {
  try {
    const now = new Date().toISOString();
    
    // Get accounts that are due for checking (next_check_date is null or in the past)
    // Order by next_check_date first (oldest first), then by priority
    const { data, error } = await supabase
      .from('x_accounts')
      .select('*')
      .or(`next_check_date.is.null,next_check_date.lt.${now}`) // Only get accounts that are due for checking
      .order('next_check_date', { ascending: true }) // Process accounts that are most overdue first
      .order('priority', { ascending: true });       // Then consider priority as a secondary factor
    
    if (error) {
      console.error('Error fetching accounts:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getAccountsToMonitor:', error);
    return [];
  }
}

// Function to get all accounts regardless of next_check_date
async function getAllAccounts() {
  try {
    const { data, error } = await supabase
      .from('x_accounts')
      .select('*')
      .order('handle', { ascending: true });
    
    if (error) {
      console.error('Error fetching all accounts:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getAllAccounts:', error);
    return [];
  }
}

// Function to update the last_checked timestamp and set next_check_date based on activity level
async function updateLastChecked(accountId) {
  try {
    // First, get the account to determine its activity level
    const { data: account, error: getError } = await supabase
      .from('x_accounts')
      .select('activity_level')
      .eq('id', accountId)
      .single();
    
    if (getError) {
      console.error(`Error getting activity level for account ${accountId}:`, getError);
      return false;
    }
    
    // Calculate next check date based on activity level
    const now = new Date();
    let nextCheckDate = new Date(now);
    
    switch (account.activity_level) {
      case 'high':
        // Check high activity accounts daily
        nextCheckDate.setDate(now.getDate() + 1);
        break;
      case 'medium':
        // Check medium activity accounts every 3 days
        nextCheckDate.setDate(now.getDate() + 3);
        break;
      case 'low':
        // Check low activity accounts weekly
        nextCheckDate.setDate(now.getDate() + 7);
        break;
      default:
        // Default to medium (3 days)
        nextCheckDate.setDate(now.getDate() + 3);
    }
    
    // Update the account
    const { error } = await supabase
      .from('x_accounts')
      .update({ 
        last_checked: now.toISOString(),
        next_check_date: nextCheckDate.toISOString()
      })
      .eq('id', accountId);
    
    if (error) {
      console.error(`Error updating last_checked for account ${accountId}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateLastChecked:', error);
    return false;
  }
}

// Function to get cached tweets for an account
async function getCachedTweets(accountId) {
  try {
    const { data, error } = await supabase
      .from('tweets_cache')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error(`Error fetching cached tweets for account ${accountId}:`, error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getCachedTweets:', error);
    return [];
  }
}

// Function to delete all cached tweets for an account
async function deleteCachedTweets(accountId) {
  try {
    const { error } = await supabase
      .from('tweets_cache')
      .delete()
      .eq('account_id', accountId);
    
    if (error) {
      console.error(`Error deleting cached tweets for account ${accountId}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteCachedTweets:', error);
    return false;
  }
}

// Function to insert new tweets into the cache
async function insertTweets(tweets) {
  try {
    if (!tweets || tweets.length === 0) {
      return true; // Nothing to insert
    }
    
    const { error } = await supabase
      .from('tweets_cache')
      .upsert(tweets, { 
        onConflict: 'tweet_id',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error('Error inserting tweets:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in insertTweets:', error);
    return false;
  }
}

// Function to add an account to the review list
async function addAccountToReview(handle, errorMessage, errorCode) {
  try {
    const { data, error } = await supabase
      .from('accounts_to_review')
      .upsert({
        handle,
        error_message: errorMessage,
        error_code: errorCode,
        created_at: new Date().toISOString(),
        status: 'pending'
      }, {
        onConflict: 'handle',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error(`Error adding account ${handle} to review:`, error);
      return false;
    }
    
    console.log(`Added account ${handle} to review list.`);
    return true;
  } catch (error) {
    console.error('Error in addAccountToReview:', error);
    return false;
  }
}

// Function to get all accounts to review
async function getAccountsToReview() {
  try {
    const { data, error } = await supabase
      .from('accounts_to_review')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching accounts to review:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getAccountsToReview:', error);
    return [];
  }
}

// Function to update the status of an account to review
async function updateAccountReviewStatus(id, status, notes) {
  try {
    // First, get the handle for this account
    const { data: account, error: getError } = await supabase
      .from('accounts_to_review')
      .select('handle')
      .eq('id', id)
      .single();
    
    if (getError) {
      console.error(`Error getting handle for account review ${id}:`, getError);
      return false;
    }
    
    if (!account || !account.handle) {
      console.error(`Account review ${id} not found or has no handle`);
      return false;
    }
    
    // Update all entries with this handle to avoid unique constraint conflicts
    const { error } = await supabase
      .from('accounts_to_review')
      .update({ 
        status, 
        notes
        // Removed updated_at field since the column doesn't exist in the table
      })
      .eq('handle', account.handle);
    
    if (error) {
      console.error(`Error updating status for account review ${id} (handle: ${account.handle}):`, error);
      return false;
    }
    
    console.log(`Successfully updated status for all entries with handle: ${account.handle}`);
    return true;
  } catch (error) {
    console.error('Error in updateAccountReviewStatus:', error);
    return false;
  }
}

// Function to get all accounts with their cached tweets
async function getAllAccountsWithTweets() {
  try {
    // First, get all accounts
    // Use the same ordering as getAccountsToMonitor for consistency
    const { data: accounts, error: accountsError } = await supabase
      .from('x_accounts')
      .select('*')
      .order('last_checked', { ascending: true }) // Order by last checked time first
      .order('priority', { ascending: true });    // Then by priority
    
    if (accountsError) {
      console.error('Error fetching accounts:', accountsError);
      return [];
    }
    
    if (!accounts || accounts.length === 0) {
      return [];
    }
    
    // For each account, get its tweets
    const accountsWithTweets = await Promise.all(accounts.map(async (account) => {
      const tweets = await getCachedTweets(account.id);
      return {
        ...account,
        tweets
      };
    }));
    
    return accountsWithTweets;
  } catch (error) {
    console.error('Error in getAllAccountsWithTweets:', error);
    return [];
  }
}

// Function to add a new account to monitor
async function addAccount(handle, priority = 3) {
  try {
    // Check if account already exists
    const { data: existingAccount, error: checkError } = await supabase
      .from('x_accounts')
      .select('id')
      .eq('handle', handle)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      console.error(`Error checking if account exists: ${handle}`, checkError);
      return { success: false, error: 'Error checking if account exists' };
    }
    
    if (existingAccount) {
      return { success: false, error: 'Account already exists' };
    }
    
    // Add the new account
    const { data, error } = await supabase
      .from('x_accounts')
      .insert({
        handle,
        priority: parseInt(priority) || 3,
        platform: 'x',
        last_checked: null
      });
    
    if (error) {
      console.error(`Error adding account: ${handle}`, error);
      return { success: false, error: 'Failed to add account' };
    }
    
    console.log(`Added account: @${handle}`);
    return { success: true };
  } catch (error) {
    console.error('Error in addAccount:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// Function to remove an account from monitoring
async function removeAccount(id) {
  try {
    // First delete any cached tweets for this account
    const { error: tweetsError } = await supabase
      .from('tweets_cache')
      .delete()
      .eq('account_id', id);
    
    if (tweetsError) {
      console.error(`Error deleting tweets for account ID ${id}:`, tweetsError);
      return { success: false, error: 'Failed to delete account tweets' };
    }
    
    // Then delete the account
    const { error } = await supabase
      .from('x_accounts')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting account ID ${id}:`, error);
      return { success: false, error: 'Failed to delete account' };
    }
    
    console.log(`Removed account ID: ${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error in removeAccount:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// Function to get an account by handle
async function getAccountByHandle(handle) {
  try {
    const { data, error } = await supabase
      .from('x_accounts')
      .select('*')
      .eq('handle', handle)
      .single();
    
    if (error) {
      console.error(`Error fetching account by handle: ${handle}`, error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getAccountByHandle:', error);
    return null;
  }
}

// Function to update account priority
async function updateAccountPriority(id, priority) {
  try {
    // Validate priority
    const priorityNum = parseInt(priority);
    if (isNaN(priorityNum) || priorityNum < 1 || priorityNum > 5) {
      return { success: false, error: 'Invalid priority value. Must be between 1 and 5.' };
    }
    
    // Update the account priority
    const { error } = await supabase
      .from('x_accounts')
      .update({ priority: priorityNum })
      .eq('id', id);
    
    if (error) {
      console.error(`Error updating priority for account ID ${id}:`, error);
      return { success: false, error: 'Failed to update account priority' };
    }
    
    console.log(`Updated priority for account ID ${id} to ${priorityNum}`);
    return { success: true };
  } catch (error) {
    console.error('Error in updateAccountPriority:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// Function to update the last tweet date for an account
async function updateLastTweetDate(accountId, tweetDate) {
  try {
    const { error } = await supabase
      .from('x_accounts')
      .update({ last_tweet_date: tweetDate })
      .eq('id', accountId);
    
    if (error) {
      console.error(`Error updating last_tweet_date for account ${accountId}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateLastTweetDate:', error);
    return false;
  }
}

// Function to calculate and update activity level based on tweet frequency
async function updateActivityLevel(accountId) {
  try {
    // Get the account's tweets
    const { data: tweets, error: tweetsError } = await supabase
      .from('tweets_cache')
      .select('created_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });
    
    if (tweetsError) {
      console.error(`Error getting tweets for account ${accountId}:`, tweetsError);
      return false;
    }
    
    // Default to medium if no tweets
    let activityLevel = 'medium';
    let tweetsPerWeek = 0;
    
    if (tweets && tweets.length >= 2) {
      // Calculate tweets per week based on the date range of available tweets
      const newestTweet = new Date(tweets[0].created_at);
      const oldestTweet = new Date(tweets[tweets.length - 1].created_at);
      
      // Calculate the date range in days
      const dateRangeInDays = (newestTweet - oldestTweet) / (1000 * 60 * 60 * 24);
      
      // Avoid division by zero
      if (dateRangeInDays > 0) {
        // Calculate tweets per week
        tweetsPerWeek = (tweets.length / dateRangeInDays) * 7;
        
        // Determine activity level based on tweets per week
        if (tweetsPerWeek >= 7) {
          // More than 1 tweet per day on average
          activityLevel = 'high';
        } else if (tweetsPerWeek >= 1) {
          // Between 1-7 tweets per week
          activityLevel = 'medium';
        } else {
          // Less than 1 tweet per week
          activityLevel = 'low';
        }
      }
    }
    
    // Update the account
    const { error } = await supabase
      .from('x_accounts')
      .update({ 
        activity_level: activityLevel,
        tweets_per_week: tweetsPerWeek
      })
      .eq('id', accountId);
    
    if (error) {
      console.error(`Error updating activity level for account ${accountId}:`, error);
      return false;
    }
    
    console.log(`Updated activity level for account ${accountId} to ${activityLevel} (${tweetsPerWeek.toFixed(2)} tweets/week)`);
    return true;
  } catch (error) {
    console.error('Error in updateActivityLevel:', error);
    return false;
  }
}

// Function to track API usage
async function trackApiUsage(callsMade = 1, dailyLimit = 500, resetTime = null) {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Check if we already have an entry for today
    const { data: existingData, error: getError } = await supabase
      .from('api_usage_stats')
      .select('id, calls_made')
      .eq('date', today)
      .single();
    
    if (getError && getError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      console.error('Error checking API usage stats:', getError);
      return false;
    }
    
    if (existingData) {
      // Update existing entry
      const { error: updateError } = await supabase
        .from('api_usage_stats')
        .update({ 
          calls_made: existingData.calls_made + callsMade,
          daily_limit: dailyLimit,
          reset_time: resetTime ? new Date(resetTime).toISOString() : null
        })
        .eq('id', existingData.id);
      
      if (updateError) {
        console.error('Error updating API usage stats:', updateError);
        return false;
      }
    } else {
      // Create new entry
      const { error: insertError } = await supabase
        .from('api_usage_stats')
        .insert({
          date: today,
          calls_made: callsMade,
          daily_limit: dailyLimit,
          reset_time: resetTime ? new Date(resetTime).toISOString() : null
        });
      
      if (insertError) {
        console.error('Error inserting API usage stats:', insertError);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in trackApiUsage:', error);
    return false;
  }
}

// Function to get today's API usage
async function getTodayApiUsage() {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const { data, error } = await supabase
      .from('api_usage_stats')
      .select('*')
      .eq('date', today)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      console.error('Error getting today\'s API usage:', error);
      return null;
    }
    
    return data || { date: today, calls_made: 0, daily_limit: 500, reset_time: null };
  } catch (error) {
    console.error('Error in getTodayApiUsage:', error);
    return null;
  }
}

// Function to check if we're approaching the API limit
async function isApproachingApiLimit(safetyThreshold = 0.8) {
  try {
    const usage = await getTodayApiUsage();
    
    if (!usage) {
      return false; // Assume we're not approaching the limit if we can't get the usage
    }
    
    return usage.calls_made >= (usage.daily_limit * safetyThreshold);
  } catch (error) {
    console.error('Error in isApproachingApiLimit:', error);
    return false;
  }
}

module.exports = {
  supabase,
  initializeDatabase,
  getAccountsToMonitor,
  getAllAccounts,
  updateLastChecked,
  updateLastTweetDate,
  updateActivityLevel,
  trackApiUsage,
  getTodayApiUsage,
  isApproachingApiLimit,
  getCachedTweets,
  deleteCachedTweets,
  insertTweets,
  addAccountToReview,
  getAccountsToReview,
  updateAccountReviewStatus,
  getAllAccountsWithTweets,
  addAccount,
  removeAccount,
  getAccountByHandle,
  updateAccountPriority
};
