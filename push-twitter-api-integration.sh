#!/bin/bash

# Script to push the Twitter API integration to GitHub
# This script will:
# 1. Add the modified and new files to git
# 2. Commit the changes with a descriptive message
# 3. Push the changes to the GitHub repository

echo "===== Pushing Twitter API Integration to GitHub ====="
echo "This script will push the Twitter API integration to GitHub."

# Check if we're on the correct branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $CURRENT_BRANCH"
echo ""

# Add the modified and new files
echo "Adding modified and new files to git..."
git add src/twitter.js
git add scripts/rate-limited-fetcher.js
git add scripts/integrate-rate-limited-fetcher.js
git add scripts/test-bbcnews.js
git add scripts/test-rate-limited-fetcher.js
git add index.js
git add TWITTER_API_SOLUTION.md

# Don't add logs.txt as it's likely a temporary file
echo "Note: logs.txt will not be added to git as it's likely a temporary file."
echo ""

# Commit the changes
echo "Committing changes..."
git commit -m "Integrate rate-limited Twitter API fetcher

- Fixed Twitter API exclude parameter issue in src/twitter.js
- Added rate-limited fetcher implementation in scripts/rate-limited-fetcher.js
- Integrated rate-limited fetcher into index.js
- Added test scripts and documentation"

# Push the changes to GitHub
echo "Pushing changes to GitHub..."
git push origin $CURRENT_BRANCH

if [ $? -ne 0 ]; then
  echo "Error: Failed to push changes to GitHub. Please check your connection and try again."
  exit 1
fi

echo "===== Changes Pushed Successfully ====="
echo "The Twitter API integration has been pushed to GitHub on branch: $CURRENT_BRANCH"
echo ""
echo "To deploy these changes to your Linode server, run the following commands on the server:"
echo ""
echo "  cd /root/Marvin-xAccount-monitor"
echo "  git pull origin $CURRENT_BRANCH"
echo "  docker-compose down"
echo "  docker-compose build"
echo "  docker-compose up -d"
echo ""
echo "This will update the code and restart the Docker container with the new changes."
