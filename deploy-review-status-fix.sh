#!/bin/bash
# Script to deploy the fix for the "Mark as Fixed" button

# Set variables
SERVER="root@xaccounts.marvn.club"
REMOTE_DIR="/root/Marvin-xAccount-monitor"
CONTAINER_NAME="marvin-xaccount-monitor_marvin-account-monitor_1"

# Display information
echo "Deploying fix for the 'Mark as Fixed' button to $SERVER..."
echo "This script will:"
echo "1. SSH into the server"
echo "2. Pull the latest changes from GitHub"
echo "3. Restart the Docker container"
echo ""

# Confirm with user
read -p "Do you want to continue? (y/n): " confirm
if [[ $confirm != "y" && $confirm != "Y" ]]; then
  echo "Deployment cancelled."
  exit 1
fi

# SSH into the server and execute commands
ssh $SERVER << 'EOF'
  cd /root/Marvin-xAccount-monitor

  # Pull the latest changes
  echo "Pulling the latest changes from GitHub..."
  git fetch origin
  git checkout previous-version
  git pull origin previous-version

  # Restart the container
  echo "Restarting the Docker container..."
  docker-compose down
  docker-compose build
  docker-compose up -d

  # Show the logs to verify it's working
  echo "Showing recent logs..."
  sleep 5 # Wait for container to start
  docker logs --tail 50 marvin-xaccount-monitor_marvin-account-monitor_1
EOF

echo ""
echo "Deployment completed!"
echo "The fix for the 'Mark as Fixed' button has been deployed."
echo ""
echo "The fix modifies the updateAccountReviewStatus function to:"
echo "1. First get the handle for the account with the given ID"
echo "2. Then update all entries with that handle to have the same status and notes"
echo ""
echo "This ensures that even if there are duplicate entries for the same handle,"
echo "they will all be updated together, avoiding conflicts with the unique constraint."
echo ""
echo "You can check the logs with:"
echo "  ssh $SERVER 'docker logs --tail 100 $CONTAINER_NAME'"
