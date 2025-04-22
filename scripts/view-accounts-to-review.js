require('dotenv').config();
const db = require('../src/db');
const logger = require('../src/logger');

// Function to view accounts that need review
async function viewAccountsToReview() {
  try {
    logger.info('Fetching accounts that need review...');
    
    // Get accounts to review
    const accountsToReview = await db.getAccountsToReview();
    
    if (!accountsToReview || accountsToReview.length === 0) {
      logger.info('No accounts require review at this time.');
      return;
    }
    
    logger.info(`Found ${accountsToReview.length} accounts that need review:`);
    console.log('\n=== ACCOUNTS TO REVIEW ===\n');
    
    // Group accounts by status
    const pendingAccounts = accountsToReview.filter(a => a.status === 'pending');
    const fixedAccounts = accountsToReview.filter(a => a.status === 'fixed');
    const ignoredAccounts = accountsToReview.filter(a => a.status === 'ignored');
    
    // Display pending accounts
    if (pendingAccounts.length > 0) {
      console.log(`\n⚠️  PENDING (${pendingAccounts.length}):\n`);
      pendingAccounts.forEach((account, index) => {
        console.log(`${index + 1}. @${account.handle}`);
        console.log(`   Error: ${account.error_message}`);
        console.log(`   Added: ${new Date(account.created_at).toLocaleString()}`);
        if (account.notes) {
          console.log(`   Notes: ${account.notes}`);
        }
        console.log('');
      });
    }
    
    // Display fixed accounts
    if (fixedAccounts.length > 0) {
      console.log(`\n✅ FIXED (${fixedAccounts.length}):\n`);
      fixedAccounts.forEach((account, index) => {
        console.log(`${index + 1}. @${account.handle}`);
        console.log(`   Error: ${account.error_message}`);
        console.log(`   Added: ${new Date(account.created_at).toLocaleString()}`);
        if (account.notes) {
          console.log(`   Notes: ${account.notes}`);
        }
        console.log('');
      });
    }
    
    // Display ignored accounts
    if (ignoredAccounts.length > 0) {
      console.log(`\n🔕 IGNORED (${ignoredAccounts.length}):\n`);
      ignoredAccounts.forEach((account, index) => {
        console.log(`${index + 1}. @${account.handle}`);
        console.log(`   Error: ${account.error_message}`);
        console.log(`   Added: ${new Date(account.created_at).toLocaleString()}`);
        if (account.notes) {
          console.log(`   Notes: ${account.notes}`);
        }
        console.log('');
      });
    }
    
    console.log('\n=== RECOMMENDATIONS ===\n');
    console.log('To review these accounts in the web interface:');
    console.log('1. Start the application: npm start');
    console.log('2. Visit: http://localhost:3000/');
    console.log('3. Log in with the credentials from your .env file');
    console.log('\nOr if deployed:');
    console.log('Visit: https://xaccounts.marvn.club/');
    
  } catch (error) {
    logger.error('Error viewing accounts to review:', error);
  }
}

// Initialize database and view accounts to review
async function init() {
  try {
    // Initialize database
    const dbInitialized = await db.initializeDatabase();
    if (!dbInitialized) {
      logger.error('Failed to initialize database. Exiting...');
      process.exit(1);
    }
    
    // View accounts to review
    await viewAccountsToReview();
    
    process.exit(0);
  } catch (error) {
    logger.error('Error initializing:', error);
    process.exit(1);
  }
}

// Start the script
init().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});
