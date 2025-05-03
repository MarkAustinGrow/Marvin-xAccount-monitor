#!/bin/bash

# Script to deploy the Twitter API integration on the Linode server
# This script will:
# 1. Pull the latest changes from GitHub
# 2. Rebuild and restart the Docker container

echo "===== Deploying Twitter API Integration ====="
echo "This script will deploy the Twitter API integration on the Linode server."
echo ""

# Check if we're in the correct directory
if [ ! -f "docker-compose.yml" ]; then
  echo "Error: docker-compose.yml not found. Please run this script from the root directory of the project."
  exit 1
fi

# Check if we're on the correct branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $CURRENT_BRANCH"
echo ""

# Pull the latest changes from GitHub
echo "Pulling latest changes from GitHub..."
git pull origin $CURRENT_BRANCH

if [ $? -ne 0 ]; then
  echo "Error: Failed to pull changes from GitHub. Please check your connection and try again."
  exit 1
fi

# Stop the Docker container
echo "Stopping Docker container..."
docker-compose down

if [ $? -ne 0 ]; then
  echo "Warning: Failed to stop Docker container. It may not be running or there might be an issue with Docker."
  echo "Continuing with deployment..."
fi

# Rebuild the Docker container
echo "Rebuilding Docker container..."
docker-compose build

if [ $? -ne 0 ]; then
  echo "Error: Failed to build Docker container. Please check the Docker logs for more information."
  exit 1
fi

# Start the Docker container
echo "Starting Docker container..."
docker-compose up -d

if [ $? -ne 0 ]; then
  echo "Error: Failed to start Docker container. Please check the Docker logs for more information."
  exit 1
fi

# Check if the container is running
echo "Checking if container is running..."
sleep 5
CONTAINER_RUNNING=$(docker-compose ps | grep "Up" | wc -l)

if [ $CONTAINER_RUNNING -eq 0 ]; then
  echo "Warning: Container may not be running. Please check the Docker logs for more information."
  echo "You can check the logs with: docker-compose logs"
else
  echo "Container is running!"
fi

echo "===== Deployment Completed ====="
echo "The Twitter API integration has been deployed on the Linode server."
echo ""
echo "To check the logs, run:"
echo "  docker-compose logs -f"
echo ""
echo "To check the status of the container, run:"
echo "  docker-compose ps"
echo ""
echo "If you encounter any issues, please check the logs for more information."
