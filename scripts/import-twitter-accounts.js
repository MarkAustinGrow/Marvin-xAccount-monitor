require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to import Twitter accounts from JSON file
async function importTwitterAccounts() {
  try {
    console.log('Starting Twitter account import...');
    
    // Read the Twitter accounts from the JSON file
    const filePath = path.join(__dirname, '..', 'data', 'twitter-accounts.json');
    const twitterAccounts = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    console.log(`Found ${twitterAccounts.length} Twitter accounts in the file.`);
    
    // Track statistics
    let stats = {
      total: twitterAccounts.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };
    
    // Process each Twitter account
    for (const twitterHandle of twitterAccounts) {
      try {
        // Remove @ symbol if present
        const handle = twitterHandle.startsWith('@') ? twitterHandle.substring(1) : twitterHandle;
        
        // Check if account already exists
        const { data: existingAccount, error: checkError } = await supabase
          .from('x_accounts')
          .select('id, handle, priority')
          .eq('handle', handle)
          .single();
        
        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
          console.error(`Error checking if account exists: ${handle}`, checkError);
          stats.errors++;
          continue;
        }
        
        if (existingAccount) {
          console.log(`Account @${handle} already exists with priority ${existingAccount.priority}.`);
          stats.skipped++;
          continue;
        }
        
        // Insert the new account
        const { data, error } = await supabase
          .from('x_accounts')
          .insert({
            handle,
            priority: 3, // Default priority
            platform: 'x',
            last_checked: null
          });
        
        if (error) {
          console.error(`Error adding account: ${handle}`, error);
          stats.errors++;
        } else {
          console.log(`Added account: @${handle}`);
          stats.inserted++;
        }
      } catch (error) {
        console.error(`Error processing account ${twitterHandle}:`, error);
        stats.errors++;
      }
    }
    
    // Print statistics
    console.log('\nImport completed with the following results:');
    console.log(`Total accounts processed: ${stats.total}`);
    console.log(`New accounts inserted: ${stats.inserted}`);
    console.log(`Existing accounts skipped: ${stats.skipped}`);
    console.log(`Errors: ${stats.errors}`);
    
    return stats;
  } catch (error) {
    console.error('Error importing Twitter accounts:', error);
    throw error;
  }
}

// Run the import function
importTwitterAccounts()
  .then((stats) => {
    console.log('Twitter account import completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error in import process:', error);
    process.exit(1);
  });
