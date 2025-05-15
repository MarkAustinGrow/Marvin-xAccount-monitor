# Marvin Account Monitor - Feature Overview

## Core Functionality

### X (Twitter) Account Monitoring
- **Automated Tweet Collection**: Automatically fetches and stores the most recent tweets from monitored accounts
- **Engagement Analytics**:
  - **Weighted Scoring**: Calculates engagement scores using a weighted formula (Retweets: 1.5x, Quotes: 1.2x, Replies: 1.0x, Likes: 0.8x)
  - **Visual Metrics**: Displays engagement scores with progress bars and color-coded badges
  - **Raw Metrics Storage**: Preserves original engagement counts for detailed analysis
  - **Trend Tracking**: Enables monitoring of engagement changes over time
- **Content Analysis**:
  - **Tweet Summaries**: Generates concise summaries of tweet content
  - **Hashtag Extraction**: Automatically extracts hashtags as "vibe tags"
  - **Content Categorization**: Groups tweets by topic and sentiment indicators
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
- **Advanced Queue System**: Implements a sophisticated queue system for account processing with configurable batch sizes
- **Adaptive Delays**: Calculates optimal delays between API calls based on batch size and rate limits
- **Proactive Rate Limit Monitoring**: Checks rate limits before processing to avoid unnecessary API calls
- **Automatic Pausing**: Automatically pauses processing when approaching rate limits and resumes after reset
- **Smart Retry Logic**: Implements intelligent retry with exponential backoff when rate limits are hit
- **Rate Limit Tracking**: Monitors and respects Twitter API rate limits in real-time with detailed logging
- **User ID Caching**: Caches user IDs to reduce API calls by approximately 50%
- **Incremental Tweet Fetching**: Only fetches tweets newer than the most recent cached tweet, significantly reducing API calls
- **Batch Interval Optimization**: Configurable intervals between batches to align with Twitter's rate limit reset cycles
- **Basic Tier Compatibility**: Optimized for Twitter's Basic tier rate limits (5 requests per 15 minutes)

### Account Review System
- **Validation Error Detection**: Automatically detects accounts with validation issues (e.g., usernames exceeding Twitter's 15-character limit)
- **Zero-Tweet Detection**: Identifies accounts that consistently return zero tweets despite successful API calls
- **Review Database**: Stores problematic accounts in a dedicated review table
- **Status Tracking**: Tracks review status (pending, fixed, ignored) for each account
- **Duplicate Entry Handling**: Intelligently manages duplicate entries for the same handle to maintain data integrity
- **Unique Constraint Management**: Handles unique constraints on the handle column to prevent conflicts
- **Bulk Status Updates**: Updates all entries for the same handle simultaneously to ensure consistency
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
- **Feature-Specific Deployment**: Specialized scripts for deploying specific feature updates:
  - **Rate Limit Management**: Scripts for deploying rate limit optimization changes
  - **Review System Fixes**: Scripts for deploying fixes to the account review system
  - **Twitter API Updates**: Scripts for deploying Twitter API integration changes
  - **Tweet Fetch Optimization**: Scripts for deploying the incremental tweet fetching feature
- **GitHub Integration**: Scripts for pushing changes to GitHub repositories
- **Documentation**: Comprehensive deployment and feature documentation
- **Environment Examples**: Example configuration files

### Monitoring & Logging
- **Comprehensive Logging**: Detailed logging of all operations
- **Log Levels**: Multiple log levels (DEBUG, INFO, WARN, ERROR)
- **Enhanced Rate Limit Tracking**: Detailed logging of rate limit information, including remaining limits and reset times
- **Queue Status Logging**: Logs queue size and processing status
- **Batch Processing Logs**: Detailed logs of batch processing operations
- **Account Processing Metrics**: Logs processing time and results for each account
- **Account Scan Reporting**: Reports on the success/failure of each account scan
- **Heartbeat Monitoring**: Regular heartbeat logs to confirm system activity
- **Error Diagnostics**: Detailed error logging with context for troubleshooting

### Testing & Development
- **Test Mode**: Special test mode for development and debugging
- **Single Account Testing**: Ability to test with a single account
- **Rate-Limited Fetcher Testing**: Dedicated tools to test the rate-limited fetcher
- **Twitter API Manager Testing**: Tools to test the Twitter API manager component
- **Database Connection Testing**: Tools to verify database connectivity
- **API Testing**: Utilities to test Twitter API connectivity
- **Account Parsing Testing**: Test account parsing without database insertion
- **Specific Account Testing**: Test tools for specific accounts (e.g., BBC News)
- **Integration Testing**: Tools to test integration between components

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
- `ACCOUNT_DELAY_SECONDS`: Delay between processing individual accounts
- `RATE_LIMIT_BUFFER`: Buffer to maintain below Twitter's rate limits
- `INITIAL_FETCH_SIZE`: Number of tweets to fetch in the initial API call
- `TWEETS_TO_STORE`: Number of tweets to store in the database

### Web Interface Configuration
- `WEB_PORT`: Port for the web interface
- `WEB_USERNAME`: Username for basic authentication
- `WEB_PASSWORD`: Password for basic authentication

## Security Features

- **API Key Protection**: Secure storage of Twitter API credentials
- **Basic Authentication**: Protected web interface
- **Environment Variable Configuration**: No hardcoded credentials
- **Docker Security**: Isolated container environment
