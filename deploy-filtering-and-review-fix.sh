#!/bin/bash
# Script to deploy filtering changes and fix the accounts_to_review table

# Set variables
SERVER="root@xaccounts.marvn.club"
REMOTE_DIR="/root/Marvin-xAccount-monitor"
CONTAINER_NAME="marvin-xaccount-monitor_marvin-account-monitor_1"

# Display information
echo "Deploying filtering changes and database fixes to $SERVER..."
echo "This script will:"
echo "1. SSH into the server"
echo "2. Pull the latest changes from GitHub"
echo "3. Apply the SQL fix to the accounts_to_review table"
echo "4. Restart the Docker container"
echo ""

# Confirm with user
read -p "Do you want to continue? (y/n): " confirm
if [[ $confirm != "y" && $confirm != "Y" ]]; then
  echo "Deployment cancelled."
  exit 1
fi

# Copy the SQL fix file to the server
echo "Copying SQL fix file to server..."
scp fix-accounts-to-review.sql $SERVER:$REMOTE_DIR/

# SSH into the server and execute commands
ssh $SERVER << 'EOF'
  cd /root/Marvin-xAccount-monitor

  # Pull the latest changes
  echo "Pulling the latest changes from GitHub..."
  git fetch origin
  git checkout previous-version
  git pull origin previous-version

  # Apply the SQL fix to the accounts_to_review table
  echo "Applying SQL fix to the accounts_to_review table..."
  PGPASSWORD=$SUPABASE_PASSWORD psql -h $SUPABASE_HOST -U $SUPABASE_USER -d $SUPABASE_DB -f fix-accounts-to-review.sql

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
echo "The following changes have been applied:"
echo "1. Filtering settings have been relaxed:"
echo "   - Replies and retweets are now included"
echo "   - Tweets per account increased from 3 to 10"
echo "   - Initial fetch size increased from 10 to 30"
echo "2. The accounts_to_review table has been fixed with a unique constraint"
echo ""
echo "You can check the logs with:"
echo "  ssh $SERVER 'docker logs --tail 100 $CONTAINER_NAME'"
echo ""
echo "These changes should dramatically increase the number of tweets collected,"
echo "giving you much better value for your £200/month Twitter API subscription."
