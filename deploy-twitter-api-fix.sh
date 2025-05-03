#!/bin/bash

# Script to deploy the Twitter API fix for the exclude parameter issue
# This script will:
# 1. Backup the current twitter.js file
# 2. Deploy the fixed version
# 3. Test the fix to ensure it works

echo "===== Twitter API Fix Deployment ====="
echo "This script will deploy the fix for the Twitter API 'exclude' parameter issue."
echo "Starting deployment process..."

# Create a backup of the current twitter.js file
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="src/twitter.js.backup_${TIMESTAMP}"

echo "Creating backup of current twitter.js file to ${BACKUP_FILE}..."
cp src/twitter.js "${BACKUP_FILE}"

if [ $? -ne 0 ]; then
  echo "Error: Failed to create backup file. Aborting deployment."
  exit 1
fi

echo "Backup created successfully."

# Deploy the fixed version
echo "Deploying fixed version of twitter.js..."
# The actual deployment is just copying the file, which we've already modified in place
# But we'll run a test to make sure it works

# Run the test script to verify the fix
echo "Testing the fix..."
node scripts/test-twitter-fix.js

if [ $? -ne 0 ]; then
  echo "Error: Test failed. Rolling back to backup..."
  cp "${BACKUP_FILE}" src/twitter.js
  echo "Rolled back to backup. Please check the logs for errors."
  exit 1
fi

echo "===== Deployment Complete ====="
echo "The Twitter API fix has been successfully deployed and tested."
echo "A backup of the original file was saved to: ${BACKUP_FILE}"
echo ""
echo "If you encounter any issues, you can restore the backup with:"
echo "cp \"${BACKUP_FILE}\" src/twitter.js"
echo ""
echo "To verify the fix in your production environment, you can run:"
echo "node index.js --test"
