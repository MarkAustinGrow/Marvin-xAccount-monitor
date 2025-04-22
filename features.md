# Marvin Account Monitor - Feature Overview

## Core Functionality

### X (Twitter) Account Monitoring
- **Automated Tweet Collection**: Automatically fetches and stores the most recent tweets from monitored accounts
- **Configurable Tweet Count**: Customizable number of tweets to store per account (default: 3)
- **Content Filtering**: Options to include or exclude replies and retweets
- **Scheduled Monitoring**: Runs on a configurable schedule (default: every 6 hours)
- **Account Prioritization**: Accounts can be assigned priority levels for processing order

### Database Integration
- **Supabase Integration**: Stores all data in a Supabase PostgreSQL database
- **Efficient Schema**: Optimized database schema for account and tweet storage
- **Cache Management**: Automatically updates tweet cache when new content is detected
- **Data Persistence**: Maintains historical data across application restarts

## Advanced Features

### Rate Limit Management
- **Intelligent Batch Processing**: Processes accounts in small batches (2 accounts per batch)
- **Adaptive Delays**: Calculates optimal delays between API calls based on batch size
- **Exponential Backoff**: Implements exponential backoff when rate limits are hit
- **Rate Limit Awareness**: Tracks Twitter API rate limit information from responses
- **User ID Caching**: Caches user IDs to reduce API calls by approximately 50%
- **Batch Interval Optimization**: 16-minute intervals between batches (aligned with Twitter's 15-minute reset cycle)

### Account Review System
- **Validation Error Detection**: Automatically detects accounts with validation issues (e.g., usernames exceeding Twitter's 15-character limit)
- **Zero-Tweet Detection**: Identifies accounts that consistently return zero tweets despite successful API calls
- **Review Database**: Stores problematic accounts in a dedicated review table
- **Status Tracking**: Tracks review status (pending, fixed, ignored) for each account
- **Notes System**: Allows adding notes to accounts for team communication

### Web Interface
- **Account Review Dashboard**: Web-based interface for reviewing problematic accounts
- **Tweet Cache Viewer**: Interface to browse all cached tweets by account
- **Filtering Capabilities**: Filter accounts by status or search by handle
- **Secure Access**: Protected with basic authentication
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Refresh functionality to see the latest data
- **Direct Tweet Links**: Links to view original tweets on X platform

### Command Line Tools
- **Account Parsing**: Tool to parse account handles from text files
- **Rate Limit Checking**: Utility to check current Twitter API rate limits
- **Account Testing**: Test functionality with a single account
- **Review List Viewing**: Command-line tool to view accounts that need review

## Deployment & Operations

### Docker Integration
- **Containerization**: Fully containerized for easy deployment
- **Docker Compose**: Simple deployment with docker-compose
- **Volume Mounting**: Persistent storage for cache data
- **Environment Variables**: Configurable through environment variables

### Deployment Tools
- **Deployment Scripts**: Scripts for easy deployment to remote servers
- **Documentation**: Comprehensive deployment documentation
- **Environment Examples**: Example configuration files

### Monitoring & Logging
- **Comprehensive Logging**: Detailed logging of all operations
- **Log Levels**: Multiple log levels (DEBUG, INFO, WARN, ERROR)
- **Rate Limit Tracking**: Specific logging for rate limit events
- **Account Scan Reporting**: Reports on the success/failure of each account scan
- **Heartbeat Monitoring**: Regular heartbeat logs to confirm system activity

### Testing & Development
- **Test Mode**: Special test mode for development and debugging
- **Single Account Testing**: Ability to test with a single account
- **Database Connection Testing**: Tools to verify database connectivity
- **API Testing**: Utilities to test Twitter API connectivity
- **Account Parsing Testing**: Test account parsing without database insertion

## Configuration Options

### Customizable Parameters
- `TWEETS_PER_ACCOUNT`: Number of tweets to store per account
- `INCLUDE_REPLIES`: Whether to include replies in collected tweets
- `INCLUDE_RETWEETS`: Whether to include retweets in collected tweets
- `BASE_API_DELAY_MS`: Minimum delay between API calls
- `MAX_RETRY_ATTEMPTS`: Maximum number of retry attempts for rate limit errors
- `BATCH_SIZE`: Number of accounts to process in each batch
- `BATCH_INTERVAL_MINUTES`: Time between processing batches
- `CRON_SCHEDULE`: Schedule for the monitoring job

### Web Interface Configuration
- `WEB_PORT`: Port for the web interface
- `WEB_USERNAME`: Username for basic authentication
- `WEB_PASSWORD`: Password for basic authentication

## Security Features

- **API Key Protection**: Secure storage of Twitter API credentials
- **Basic Authentication**: Protected web interface
- **Environment Variable Configuration**: No hardcoded credentials
- **Docker Security**: Isolated container environment
