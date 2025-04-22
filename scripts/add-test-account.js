require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Test account to add
const TEST_ACCOUNT = 'OBEYGIANT'; // Shepard Fairey's account

async function addTestAccount() {
  try {
    console.log(`Adding test account @${TEST_ACCOUNT} to the database...`);
    
    // Check if the account already exists
    const { data: existingAccount, error: checkError } = await supabase
      .from('x_accounts')
      .select('*')
      .eq('handle', TEST_ACCOUNT)
      .single();
    
    if (!checkError && existingAccount) {
      console.log(`Test account @${TEST_ACCOUNT} already exists in the database.`);
      return;
    }
    
    // Insert the test account
    const { error } = await supabase
      .from('x_accounts')
      .upsert({ 
        handle: TEST_ACCOUNT, 
        platform: 'x',
        priority: 1 // High priority
      }, { 
        onConflict: 'handle',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error(`Error adding test account @${TEST_ACCOUNT}:`, error);
    } else {
      console.log(`Successfully added test account @${TEST_ACCOUNT} to the database.`);
    }
  } catch (error) {
    console.error('Error in addTestAccount:', error);
  }
}

// Run the function
addTestAccount()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
