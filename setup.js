const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to execute a command and log the output
function runCommand(command) {
  console.log(`\n> ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    return false;
  }
}

// Function to check if a file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

// Main setup function
function setup() {
  console.log('🧠 Setting up Marvin Account Monitor...');
  
  // Check if .env file exists
  const envPath = path.join(__dirname, '.env');
  if (!fileExists(envPath)) {
    console.error('\n❌ .env file not found. Please create a .env file with your Twitter API and Supabase credentials.');
    console.log('See README.md for required environment variables.');
    process.exit(1);
  }
  
  // Check if x-accounts.txt file exists
  const accountsPath = path.join(__dirname, 'x-accounts.txt');
  if (!fileExists(accountsPath)) {
    console.error('\n❌ x-accounts.txt file not found. Please create this file with the X accounts you want to monitor.');
    process.exit(1);
  }
  
  // Install dependencies
  console.log('\n📦 Installing dependencies...');
  if (!runCommand('npm install')) {
    console.error('\n❌ Failed to install dependencies.');
    process.exit(1);
  }
  
  // Test database connection
  console.log('\n🔌 Testing database connection...');
  if (!runCommand('node scripts/test-db-connection.js')) {
    console.warn('\n⚠️ Database connection test failed. Please check your Supabase credentials in .env file.');
    console.log('You can still proceed, but the application may not work correctly.');
  }
  
  // Test Twitter API connection
  console.log('\n🐦 Testing Twitter API connection...');
  if (!runCommand('node scripts/test-twitter-api.js')) {
    console.warn('\n⚠️ Twitter API connection test failed. Please check your Twitter API credentials in .env file.');
    console.log('You can still proceed, but the application may not work correctly.');
  }
  
  // Test account parsing
  console.log('\n📋 Testing account parsing...');
  if (!runCommand('node scripts/test-parse-accounts.js')) {
    console.warn('\n⚠️ Account parsing test failed. Please check your x-accounts.txt file.');
    console.log('You can still proceed, but the application may not work correctly.');
  }
  
  // Setup complete
  console.log('\n✅ Setup complete!');
  console.log('\nYou can now:');
  console.log('1. Run "npm run parse-accounts" to populate the database with X accounts');
  console.log('2. Run "npm start" to start the monitoring process');
  console.log('\nSee README.md for more information.');
}

// Run the setup
setup();
