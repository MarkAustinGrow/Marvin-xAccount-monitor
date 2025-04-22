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
    const { data, error } = await supabase
      .from('x_accounts')
      .select('*')
      .order('priority', { ascending: true });
    
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

// Function to update the last_checked timestamp for an account
async function updateLastChecked(accountId) {
  try {
    const { error } = await supabase
      .from('x_accounts')
      .update({ last_checked: new Date().toISOString() })
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
    const { error } = await supabase
      .from('accounts_to_review')
      .update({ 
        status, 
        notes,
        updated_at: new Date().toISOString() 
      })
      .eq('id', id);
    
    if (error) {
      console.error(`Error updating status for account review ${id}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateAccountReviewStatus:', error);
    return false;
  }
}

module.exports = {
  supabase,
  initializeDatabase,
  getAccountsToMonitor,
  updateLastChecked,
  getCachedTweets,
  deleteCachedTweets,
  insertTweets,
  addAccountToReview,
  getAccountsToReview,
  updateAccountReviewStatus
};
