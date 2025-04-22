# Deployment Guide for Marvin Account Monitor

This guide explains how to deploy the Marvin Account Monitor application to a Linode server using Docker.

## Prerequisites

- A Linode server (already set up at 172.236.22.45)
- Domain name pointing to the server (xaccounts.marvn.club)
- SSH access to the server

## Deployment Steps

### 1. SSH into your Linode server

```bash
ssh root@172.236.22.45
```

### 2. Install Docker and Docker Compose

```bash
# Update packages
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y
```

### 3. Clone the repository

```bash
# Clone the repository
git clone https://github.com/MarkAustinGrow/Marvin-xAccount-monitor.git
cd Marvin-xAccount-monitor
```

### 4. Create .env file

Create a `.env` file with your actual credentials:

```bash
nano .env
```

Add your environment variables based on the `.env.example` file:

```
# Twitter API Credentials
TWITTER_API_KEY=your_actual_api_key
TWITTER_API_SECRET=your_actual_api_secret
TWITTER_ACCESS_TOKEN=your_actual_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_actual_access_token_secret
TWITTER_BEARER_TOKEN=your_actual_bearer_token

# Supabase Credentials
SUPABASE_URL=your_actual_supabase_url
SUPABASE_KEY=your_actual_supabase_key
```

### 5. Build and run with Docker Compose

```bash
# Build and run the Docker container
docker-compose up -d
```

### 6. Set up Nginx as a reverse proxy

```bash
# Install Nginx and Certbot for SSL
apt install nginx certbot python3-certbot-nginx -y

# Create Nginx configuration
nano /etc/nginx/sites-available/xaccounts.marvn.club
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name xaccounts.marvn.club;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable the site and restart Nginx:

```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/xaccounts.marvn.club /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

### 7. Set up SSL with Let's Encrypt

```bash
# Obtain SSL certificate
certbot --nginx -d xaccounts.marvn.club
```

Follow the prompts to complete the SSL setup.

### 8. Verify the deployment

Visit https://xaccounts.marvn.club to verify that the application is running correctly.

## Maintenance

### Viewing logs

```bash
# View container logs
docker-compose logs -f
```

### Updating the application

```bash
# Pull latest changes
git pull

# Rebuild and restart the container
docker-compose up -d --build
```

### Stopping the application

```bash
# Stop the container
docker-compose down
```

## Troubleshooting

### Check if the container is running

```bash
docker ps
```

### Check container logs

```bash
docker-compose logs -f
```

### Check Nginx logs

```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
