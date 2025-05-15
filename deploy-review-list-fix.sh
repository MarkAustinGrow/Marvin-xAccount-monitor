#!/bin/bash

# Deploy Review List Fix
# This script deploys the fix to prevent monitoring accounts that are in the review list with pending status

echo "Deploying Review List Fix..."

# Set variables
REMOTE_USER="root"
REMOTE_HOST="172-236-22-45"
REMOTE_DIR="/opt/marvin-xaccount-monitor"
LOCAL_FILES=(
  "src/db.js"
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
echo "The system will now:"
echo "1. Skip accounts that are in the review list with 'pending' status"
echo "2. Log how many accounts were filtered out due to being in the review list"
echo "This will reduce API calls and prevent repeatedly checking accounts with known issues."
