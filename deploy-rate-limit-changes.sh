#!/bin/bash
# Script to deploy rate limit configuration changes to the server

# Set variables
SERVER="root@xaccounts.marvn.club"
REMOTE_DIR="/opt/marvin-xaccount-monitor"
CONTAINER_NAME="marvin-xaccount-monitor_marvin-account-monitor_1"

# Display information
echo "Deploying rate limit configuration changes to $SERVER..."
echo "This script will:"
echo "1. SSH into the server"
echo "2. Stop the current container"
echo "3. Backup the current container"
echo "4. Pull the latest changes"
echo "5. Rebuild and restart the container"
echo ""

# Confirm with user
read -p "Do you want to continue? (y/n): " confirm
if [[ $confirm != "y" && $confirm != "Y" ]]; then
  echo "Deployment cancelled."
  exit 1
fi

# SSH into the server and execute commands
ssh $SERVER << 'EOF'
  cd /opt/marvin-xaccount-monitor

  # Stop the current container
  echo "Stopping the current container..."
  docker stop marvin-xaccount-monitor_marvin-account-monitor_1

  # Backup the current container
  echo "Creating a backup of the current container..."
  docker commit marvin-xaccount-monitor_marvin-account-monitor_1 marvin-backup-$(date +%Y%m%d)

  # Pull the latest changes
  echo "Pulling the latest changes..."
  git pull

  # Rebuild and restart the container
  echo "Rebuilding and restarting the container..."
  docker-compose up -d --build

  # Show the logs to verify it's working
  echo "Showing recent logs..."
  docker logs --tail 20 marvin-xaccount-monitor_marvin-account-monitor_1
EOF

echo ""
echo "Deployment completed!"
echo "The container has been updated with the new rate limit configuration."
echo "You can check the logs with:"
echo "  ssh $SERVER 'docker logs --tail 100 $CONTAINER_NAME'"
