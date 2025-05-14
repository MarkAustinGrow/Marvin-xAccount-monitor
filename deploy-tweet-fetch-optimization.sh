#!/bin/bash

# Deploy Tweet Fetch Optimization
# This script deploys the optimization that only fetches new tweets based on the date of the latest tweet

echo "Deploying Tweet Fetch Optimization..."

# Set variables
REMOTE_USER="root"
REMOTE_HOST="172-236-22-45"
REMOTE_DIR="/opt/marvin-xaccount-monitor"
LOCAL_FILES=(
  "src/twitter.js"
  "index.js"
  "scripts/rate-limited-fetcher.js"
)

# Copy files to remote server
for file in "${LOCAL_FILES[@]}"; do
  echo "Copying $file to $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/$file"
  scp "$file" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/$file"
done

# Restart the Docker container
echo "Restarting Docker container..."
ssh "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_DIR && docker-compose restart"

echo "Deployment completed successfully!"
echo "This optimization will reduce API calls by only fetching tweets newer than the most recent one in the database."
