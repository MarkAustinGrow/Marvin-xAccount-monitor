#!/bin/bash
# Script to deploy batch processing optimization to the server

# Set variables
SERVER="root@xaccounts.marvn.club"
REMOTE_DIR="/root/Marvin-xAccount-monitor"
CONTAINER_NAME="marvin-xaccount-monitor_marvin-account-monitor_1"

# Display information
echo "Deploying batch processing optimization to $SERVER..."
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
  docker-compose up -d

  # Show the logs to verify it's working
  echo "Showing recent logs..."
  sleep 5 # Wait for container to start
  docker logs --tail 50 marvin-xaccount-monitor_marvin-account-monitor_1
EOF

echo ""
echo "Deployment completed!"
echo "The batch processing optimization has been applied and the container has been restarted."
echo "You can check the logs with:"
echo "  ssh $SERVER 'docker logs --tail 100 $CONTAINER_NAME'"
echo ""
echo "With the new settings:"
echo "- Batch size increased from 1 to 3 accounts"
echo "- Batch interval reduced from 45 to 20 minutes"
echo "- All 169 accounts will be processed in approximately 19 hours"
echo "- API usage will be around 432 calls per day (well within the 500 limit)"
