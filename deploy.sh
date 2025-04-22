#!/bin/bash

# Deploy script for Marvin Account Monitor
# This script automates the deployment process to a Linode server

# Check if SSH key is provided
if [ -z "$1" ]; then
  echo "Usage: ./deploy.sh <ssh_key_path>"
  echo "Example: ./deploy.sh ~/.ssh/id_rsa"
  exit 1
fi

SSH_KEY=$1
SERVER_IP="172.236.22.45"
DOMAIN="xaccounts.marvn.club"
REPO_URL="https://github.com/MarkAustinGrow/Marvin-xAccount-monitor.git"

echo "Deploying Marvin Account Monitor to $SERVER_IP ($DOMAIN)..."

# Create deployment script to run on the server
cat > remote_setup.sh << 'EOF'
#!/bin/bash

# Update packages
echo "Updating packages..."
apt update && apt upgrade -y

# Install Docker and Docker Compose
echo "Installing Docker and Docker Compose..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
fi

if ! command -v docker-compose &> /dev/null; then
  apt install docker-compose -y
fi

# Clone the repository
echo "Cloning repository..."
if [ ! -d "Marvin-xAccount-monitor" ]; then
  git clone https://github.com/MarkAustinGrow/Marvin-xAccount-monitor.git
fi

cd Marvin-xAccount-monitor

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo "Creating .env file..."
  cp .env.example .env
  echo "Please edit the .env file with your actual credentials:"
  echo "nano .env"
fi

# Build and run with Docker Compose
echo "Building and running with Docker Compose..."
docker-compose up -d --build

# Install Nginx and Certbot
echo "Installing Nginx and Certbot..."
apt install nginx certbot python3-certbot-nginx -y

# Create Nginx configuration
echo "Creating Nginx configuration..."
cat > /etc/nginx/sites-available/xaccounts.marvn.club << 'EOFNGINX'
server {
    listen 80;
    server_name xaccounts.marvn.club;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOFNGINX

# Enable the site
echo "Enabling Nginx site..."
ln -sf /etc/nginx/sites-available/xaccounts.marvn.club /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# Set up SSL with Let's Encrypt
echo "Setting up SSL with Let's Encrypt..."
certbot --nginx -d xaccounts.marvn.club --non-interactive --agree-tos --email admin@marvn.club

echo "Deployment completed!"
echo "Please check if the application is running at https://xaccounts.marvn.club"
EOF

# Copy the deployment script to the server
echo "Copying deployment script to server..."
scp -i $SSH_KEY remote_setup.sh root@$SERVER_IP:/root/

# Make the script executable and run it
echo "Running deployment script on server..."
ssh -i $SSH_KEY root@$SERVER_IP "chmod +x /root/remote_setup.sh && /root/remote_setup.sh"

# Clean up
rm remote_setup.sh

echo "Deployment process initiated on the server."
echo "Check the server logs for details."
