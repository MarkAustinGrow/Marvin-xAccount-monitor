#!/bin/bash

# Script to push the Twitter API fix to GitHub
# This script will:
# 1. Add the modified and new files to git
# 2. Commit the changes with a descriptive message
# 3. Push the changes to the GitHub repository
# 4. Provide instructions for pulling the changes to the Linode server

echo "===== Pushing Twitter API Fix to GitHub ====="
echo "This script will push the Twitter API 'exclude' parameter fix to GitHub."

# Check if we're on the correct branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $CURRENT_BRANCH"
echo ""

# Add the modified and new files
echo "Adding modified and new files to git..."
git add src/twitter.js
git add scripts/test-twitter-fix.js
git add deploy-twitter-api-fix.sh

# Don't add logs.txt as it's likely a temporary file
echo "Note: logs.txt will not be added to git as it's likely a temporary file."
echo ""

# Commit the changes
echo "Committing changes..."
git commit -m "Fix Twitter API exclude parameter issue

- Modified fetchRecentTweets function to properly handle the exclude parameter
- Added test script to verify the fix
- Added deployment script for easy deployment to production"

# Push the changes to GitHub
echo "Pushing changes to GitHub..."
git push origin $CURRENT_BRANCH

if [ $? -ne 0 ]; then
  echo "Error: Failed to push changes to GitHub. Please check your connection and try again."
  exit 1
fi

echo "===== Changes Pushed Successfully ====="
echo "The Twitter API fix has been pushed to GitHub on branch: $CURRENT_BRANCH"
echo ""
echo "To pull these changes to your Linode server, run the following commands on the server:"
echo ""
echo "  cd /path/to/your/app"
echo "  git pull origin $CURRENT_BRANCH"
echo "  ./deploy-twitter-api-fix.sh"
echo ""
echo "This will update the code and deploy the fix on your server."
