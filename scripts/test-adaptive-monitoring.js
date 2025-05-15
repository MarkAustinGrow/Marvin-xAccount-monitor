/**
 * Test Adaptive Monitoring
 * 
 * This script tests the adaptive monitoring system by:
 * 1. Checking that activity levels are calculated correctly
 * 2. Verifying that next_check_date is set based on activity level
 * 3. Testing the API usage tracking functionality
 * 4. Simulating approaching the API limit to test the circuit breaker
 */

require('dotenv').config();
const db = require('../src/db');
const logger = require('../src/logger');

// Configuration
const TEST_ACCOUNT = process.argv[2] || 'OBEYGIANT'; // Default test account (Shepard Fairey's account)

// Function to test activity level calculation
async function testActivityLevelCalculation() {
  try {
    console.log('Testing activity level calculation...');
    
    // Get the test account
    const account = await db.getAccountByHandle(TEST_ACCOUNT);
    
    if (!account) {
      console.error(`Test account @${TEST_ACCOUNT} not found in database.`);
      return false;
    }
    
    console.log(`Using test account: @${account.handle} (ID: ${account.id})`);
    
    // Get the account's current activity level
    console.log(`Current activity level: ${account.activity_level || 'Not set'}`);
    console.log(`Current tweets per week: ${account.tweets_per_week || 'Not set'}`);
    
    // Calculate and update activity level
    const success = await db.updateActivityLevel(account.id);
    
    if (!success) {
      console.error('Failed to update activity level.');
      return false;
    }
    
    // Get the updated account
    const updatedAccount = await db.getAccountByHandle(TEST_ACCOUNT);
    
    console.log(`Updated activity level: ${updatedAccount.activity_level}`);
    console.log(`Updated tweets per week: ${updatedAccount.tweets_per_week}`);
    
    return true;
  } catch (error) {
    console.error('Error in testActivityLevelCalculation:', error);
    return false;
  }
}

// Function to test next_check_date calculation
async function testNextCheckDateCalculation() {
  try {
    console.log('\nTesting next_check_date calculation...');
    
    // Get the test account
    const account = await db.getAccountByHandle(TEST_ACCOUNT);
    
    if (!account) {
      console.error(`Test account @${TEST_ACCOUNT} not found in database.`);
      return false;
    }
    
    console.log(`Current next_check_date: ${account.next_check_date || 'Not set'}`);
    
    // Update last_checked and next_check_date
    const success = await db.updateLastChecked(account.id);
    
    if (!success) {
      console.error('Failed to update next_check_date.');
      return false;
    }
    
    // Get the updated account
    const updatedAccount = await db.getAccountByHandle(TEST_ACCOUNT);
    
    console.log(`Updated next_check_date: ${updatedAccount.next_check_date}`);
    
    // Calculate days until next check
    const now = new Date();
    const nextCheck = new Date(updatedAccount.next_check_date);
    const daysUntilNextCheck = Math.round((nextCheck - now) / (1000 * 60 * 60 * 24) * 10) / 10;
    
    console.log(`Days until next check: ${daysUntilNextCheck}`);
    
    // Verify that next_check_date is set correctly based on activity level
    let expectedDays = 3; // Default (medium)
    
    switch (updatedAccount.activity_level) {
      case 'high':
        expectedDays = 1;
        break;
      case 'medium':
        expectedDays = 3;
        break;
      case 'low':
        expectedDays = 7;
        break;
    }
    
    console.log(`Expected days until next check (based on ${updatedAccount.activity_level} activity): ${expectedDays}`);
    
    // Allow for a small difference due to the random offset
    const isCorrect = Math.abs(daysUntilNextCheck - expectedDays) <= 0.3;
    
    if (isCorrect) {
      console.log('✅ Next check date is set correctly based on activity level.');
    } else {
      console.error('❌ Next check date does not match expected value.');
    }
    
    return isCorrect;
  } catch (error) {
    console.error('Error in testNextCheckDateCalculation:', error);
    return false;
  }
}

// Function to test API usage tracking
async function testApiUsageTracking() {
  try {
    console.log('\nTesting API usage tracking...');
    
    // Get current API usage
    const initialUsage = await db.getTodayApiUsage();
    
    console.log(`Initial API usage: ${initialUsage ? initialUsage.calls_made : 0} calls made today.`);
    
    // Track a test API call
    const success = await db.trackApiUsage(1, 500, new Date().getTime() + 3600000);
    
    if (!success) {
      console.error('Failed to track API usage.');
      return false;
    }
    
    // Get updated API usage
    const updatedUsage = await db.getTodayApiUsage();
    
    console.log(`Updated API usage: ${updatedUsage.calls_made} calls made today.`);
    
    // Verify that the call was tracked
    const isTracked = updatedUsage.calls_made > initialUsage.calls_made;
    
    if (isTracked) {
      console.log('✅ API call was tracked successfully.');
    } else {
      console.error('❌ API call was not tracked.');
    }
    
    return isTracked;
  } catch (error) {
    console.error('Error in testApiUsageTracking:', error);
    return false;
  }
}

// Function to test the circuit breaker
async function testCircuitBreaker() {
  try {
    console.log('\nTesting circuit breaker...');
    
    // Get current API usage
    const initialUsage = await db.getTodayApiUsage();
    
    console.log(`Current API usage: ${initialUsage.calls_made}/${initialUsage.daily_limit} calls made today.`);
    
    // Check if we're approaching the limit
    const isApproachingLimit = await db.isApproachingApiLimit(0.8);
    
    console.log(`Is approaching limit (80% threshold): ${isApproachingLimit}`);
    
    // Simulate approaching the limit by setting a very low threshold
    const simulatedThreshold = initialUsage.calls_made / initialUsage.daily_limit - 0.01;
    
    console.log(`Simulating approaching limit with threshold: ${simulatedThreshold.toFixed(2)} (${Math.round(simulatedThreshold * 100)}%)`);
    
    const isSimulatedApproachingLimit = await db.isApproachingApiLimit(simulatedThreshold);
    
    console.log(`Is approaching limit (simulated threshold): ${isSimulatedApproachingLimit}`);
    
    if (isSimulatedApproachingLimit) {
      console.log('✅ Circuit breaker is working correctly.');
    } else {
      console.error('❌ Circuit breaker is not working as expected.');
    }
    
    return isSimulatedApproachingLimit;
  } catch (error) {
    console.error('Error in testCircuitBreaker:', error);
    return false;
  }
}

// Function to test getAccountsToMonitor
async function testGetAccountsToMonitor() {
  try {
    console.log('\nTesting getAccountsToMonitor...');
    
    // Get all accounts
    const allAccounts = await db.getAllAccounts();
    
    console.log(`Total accounts: ${allAccounts.length}`);
    
    // Get accounts due for monitoring
    const dueAccounts = await db.getAccountsToMonitor();
    
    console.log(`Accounts due for monitoring: ${dueAccounts.length}`);
    
    // Print the first few due accounts
    if (dueAccounts.length > 0) {
      console.log('\nFirst few accounts due for monitoring:');
      
      const accountsToShow = Math.min(dueAccounts.length, 5);
      
      for (let i = 0; i < accountsToShow; i++) {
        const account = dueAccounts[i];
        console.log(`- @${account.handle} (Activity: ${account.activity_level}, Next check: ${account.next_check_date})`);
      }
    } else {
      console.log('No accounts are due for monitoring at this time.');
    }
    
    return true;
  } catch (error) {
    console.error('Error in testGetAccountsToMonitor:', error);
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log('Testing Adaptive Monitoring System...');
    
    // Initialize database
    const dbInitialized = await db.initializeDatabase();
    if (!dbInitialized) {
      console.error('Failed to initialize database. Exiting...');
      process.exit(1);
    }
    
    // Run tests
    const activityLevelSuccess = await testActivityLevelCalculation();
    const nextCheckDateSuccess = await testNextCheckDateCalculation();
    const apiUsageSuccess = await testApiUsageTracking();
    const circuitBreakerSuccess = await testCircuitBreaker();
    const getAccountsSuccess = await testGetAccountsToMonitor();
    
    // Print summary
    console.log('\n--- Test Summary ---');
    console.log(`Activity Level Calculation: ${activityLevelSuccess ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Next Check Date Calculation: ${nextCheckDateSuccess ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`API Usage Tracking: ${apiUsageSuccess ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Circuit Breaker: ${circuitBreakerSuccess ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Get Accounts To Monitor: ${getAccountsSuccess ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = activityLevelSuccess && nextCheckDateSuccess && apiUsageSuccess && circuitBreakerSuccess && getAccountsSuccess;
    
    console.log(`\nOverall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('Error in main:', error);
    process.exit(1);
  }
}

// Run the main function
main();
