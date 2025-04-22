#!/bin/bash

# Script to deploy changes to the Linode server

# Set variables
SERVER="root@172-236-22-45"
REPO_PATH="~/Marvin-xAccount-monitor"

# Display banner
echo "====================================="
echo "Deploying changes to Linode server..."
echo "====================================="

# Connect to the server and execute commands
ssh $SERVER << 'EOF'
  # Navigate to the repository
  cd ~/Marvin-xAccount-monitor

  # Pull the latest changes from GitHub
  echo "Pulling latest changes from GitHub..."
  git fetch origin
  git pull origin master

  # Restart the Docker container
  echo "Restarting Docker container..."
  docker-compose down
  docker-compose up -d --build

  # Display container status
  echo "Container status:"
  docker ps

  # Display initial logs
  echo "Initial logs:"
  docker-compose logs --tail=20
EOF

echo "====================================="
echo "Deployment completed!"
echo "====================================="
echo "To view logs in real-time, run:"
echo "ssh $SERVER 'cd $REPO_PATH && docker-compose logs -f'"
echo "====================================="
