#!/bin/bash
# Script to deploy the Twitter API fix to the server

# Set variables
SERVER="root@xaccounts.marvn.club"
REMOTE_DIR="/root/Marvin-xAccount-monitor"
CONTAINER_NAME="marvin-xaccount-monitor_marvin-account-monitor_1"
LOCAL_FIX_FILE="src/twitter.js.fix"
REMOTE_TARGET_FILE="src/twitter.js"

# Display information
echo "Deploying Twitter API fix to $SERVER..."
echo "This script will:"
echo "1. SSH into the server"
echo "2. Copy the fixed twitter.js file"
echo "3. Restart the Docker container"
echo ""

# Confirm with user
read -p "Do you want to continue? (y/n): " confirm
if [[ $confirm != "y" && $confirm != "Y" ]]; then
  echo "Deployment cancelled."
  exit 1
fi

# First, copy the fix file to the server
echo "Copying fix file to server..."
scp $LOCAL_FIX_FILE $SERVER:$REMOTE_DIR/$REMOTE_TARGET_FILE

# SSH into the server and execute commands
ssh $SERVER << 'EOF'
  cd /root/Marvin-xAccount-monitor

  # Restart the container
  echo "Restarting the Docker container..."
  docker-compose down
  docker-compose up -d

  # Show the logs to verify it's working
  echo "Showing recent logs..."
  sleep 5 # Wait for container to start
  docker logs --tail 50 marvin-xaccount-monitor_marvin-account-monitor_1
EOF

echo ""
echo "Deployment completed!"
echo "The Twitter API fix has been applied and the container has been restarted."
echo "You can check the logs with:"
echo "  ssh $SERVER 'docker logs --tail 100 $CONTAINER_NAME'"
