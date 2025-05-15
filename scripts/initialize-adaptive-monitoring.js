/**
 * Initialize Adaptive Monitoring
 * 
 * This script initializes the adaptive monitoring system by:
 * 1. Applying the schema changes to add activity level fields
 * 2. Calculating initial activity levels for all accounts
 * 3. Setting next_check_date for all accounts based on their activity level
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/db');

// Configuration
const SCHEMA_FILE = path.join(__dirname, '..', 'adaptive-monitoring-schema.sql');

async function applySchemaChanges() {
  try {
    console.log('Applying schema changes...');
    
    // Read the schema file
    const schemaSQL = fs.readFileSync(SCHEMA_FILE, 'utf8');
    
    // Execute the SQL
    const { error } = await db.supabase.rpc('exec_sql', { sql: schemaSQL });
    
    if (error) {
      console.error('Error applying schema changes:', error);
      return false;
    }
    
    console.log('Schema changes applied successfully.');
    return true;
  } catch (error) {
    console.error('Error in applySchemaChanges:', error);
    return false;
  }
}

async function calculateActivityLevels() {
  try {
    console.log('Calculating activity levels for all accounts...');
    
    // Get all accounts
    const accounts = await db.getAllAccounts();
    
    if (!accounts || accounts.length === 0) {
      console.log('No accounts found.');
      return false;
    }
    
    console.log(`Found ${accounts.length} accounts.`);
    
    // Process each account
    let successCount = 0;
    let failCount = 0;
    
    for (const account of accounts) {
      try {
        console.log(`Processing account: @${account.handle}...`);
        
        // Calculate and update activity level
        const success = await db.updateActivityLevel(account.id);
        
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Error processing account @${account.handle}:`, error);
        failCount++;
      }
    }
    
    console.log(`Activity level calculation completed.`);
    console.log(`Success: ${successCount}, Failed: ${failCount}`);
    
    return true;
  } catch (error) {
    console.error('Error in calculateActivityLevels:', error);
    return false;
  }
}

async function setNextCheckDates() {
  try {
    console.log('Setting next_check_date for all accounts...');
    
    // Get all accounts
    const accounts = await db.getAllAccounts();
    
    if (!accounts || accounts.length === 0) {
      console.log('No accounts found.');
      return false;
    }
    
    // Process each account
    let successCount = 0;
    let failCount = 0;
    
    for (const account of accounts) {
      try {
        console.log(`Setting next_check_date for @${account.handle}...`);
        
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
        
        // Stagger the next check dates to avoid checking all accounts at once
        // Add a random offset of 0-6 hours
        const randomHours = Math.floor(Math.random() * 6);
        nextCheckDate.setHours(nextCheckDate.getHours() + randomHours);
        
        // Update the account
        const { error } = await db.supabase
          .from('x_accounts')
          .update({ next_check_date: nextCheckDate.toISOString() })
          .eq('id', account.id);
        
        if (error) {
          console.error(`Error updating next_check_date for account ${account.id}:`, error);
          failCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`Error setting next_check_date for @${account.handle}:`, error);
        failCount++;
      }
    }
    
    console.log(`Next check date setting completed.`);
    console.log(`Success: ${successCount}, Failed: ${failCount}`);
    
    return true;
  } catch (error) {
    console.error('Error in setNextCheckDates:', error);
    return false;
  }
}

async function initializeApiUsageStats() {
  try {
    console.log('Initializing API usage stats...');
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Check if we already have an entry for today
    const { data, error: getError } = await db.supabase
      .from('api_usage_stats')
      .select('id')
      .eq('date', today)
      .single();
    
    if (getError && getError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      console.error('Error checking API usage stats:', getError);
      return false;
    }
    
    if (!data) {
      // Create initial entry for today
      const { error: insertError } = await db.supabase
        .from('api_usage_stats')
        .insert({
          date: today,
          calls_made: 0,
          daily_limit: 500,
          reset_time: null
        });
      
      if (insertError) {
        console.error('Error inserting API usage stats:', insertError);
        return false;
      }
      
      console.log('Created initial API usage stats entry for today.');
    } else {
      console.log('API usage stats entry for today already exists.');
    }
    
    return true;
  } catch (error) {
    console.error('Error in initializeApiUsageStats:', error);
    return false;
  }
}

async function main() {
  try {
    console.log('Initializing adaptive monitoring system...');
    
    // Initialize database
    const dbInitialized = await db.initializeDatabase();
    if (!dbInitialized) {
      console.error('Failed to initialize database. Exiting...');
      process.exit(1);
    }
    
    // Apply schema changes
    const schemaApplied = await applySchemaChanges();
    if (!schemaApplied) {
      console.error('Failed to apply schema changes. Exiting...');
      process.exit(1);
    }
    
    // Initialize API usage stats
    const apiUsageInitialized = await initializeApiUsageStats();
    if (!apiUsageInitialized) {
      console.error('Failed to initialize API usage stats. Exiting...');
      process.exit(1);
    }
    
    // Calculate activity levels
    const activityLevelsCalculated = await calculateActivityLevels();
    if (!activityLevelsCalculated) {
      console.error('Failed to calculate activity levels. Exiting...');
      process.exit(1);
    }
    
    // Set next check dates
    const nextCheckDatesSet = await setNextCheckDates();
    if (!nextCheckDatesSet) {
      console.error('Failed to set next check dates. Exiting...');
      process.exit(1);
    }
    
    console.log('Adaptive monitoring system initialized successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error in main:', error);
    process.exit(1);
  }
}

// Run the main function
main();
