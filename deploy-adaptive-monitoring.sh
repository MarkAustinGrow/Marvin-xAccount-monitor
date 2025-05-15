#!/bin/bash

# Deploy Adaptive Monitoring
# This script deploys the adaptive monitoring system that reduces API usage based on account activity levels

echo "Deploying Adaptive Monitoring..."

# Set variables
REMOTE_USER="root"
REMOTE_HOST="172-236-22-45"
REMOTE_DIR="/opt/marvin-xaccount-monitor"
LOCAL_FILES=(
  "src/db.js"
  "index.js"
  "scripts/initialize-adaptive-monitoring.js"
  "scripts/test-adaptive-monitoring.js"
  "adaptive-monitoring-schema.sql"
  "package.json"
  "ADAPTIVE_MONITORING.md"
  "features.md"
)

# Copy files to remote server
for file in "${LOCAL_FILES[@]}"; do
  echo "Copying $file to $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/$file"
  scp "$file" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/$file"
done

# Run the initialization script on the remote server
echo "Running initialization script on remote server..."
ssh "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_DIR && npm run init-adaptive-monitoring"

# Restart the Docker container
echo "Restarting Docker container..."
ssh "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_DIR && docker-compose restart"

echo "Deployment completed successfully!"
echo "The adaptive monitoring system will now:"
echo "1. Categorize accounts as high, medium, or low activity based on tweet frequency"
echo "2. Check high activity accounts daily, medium accounts every 3 days, and low activity accounts weekly"
echo "3. Track API usage to prevent hitting rate limits"
echo "4. Only process accounts that are due for checking"
echo "This will significantly reduce API calls and help stay within Twitter's rate limits."
