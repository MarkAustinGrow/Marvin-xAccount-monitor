# Marvin Account Monitor

A Node.js application that monitors X (Twitter) accounts and keeps a rotating cache of their 3 most recent tweets in a Supabase database.

## Features

- Monitors X accounts listed in `x-accounts.txt`
- Stores the 3 most recent tweets for each account in Supabase
- Runs on a schedule (every 6 hours by default)
- Handles API rate limits with batch processing and adaptive delays
- Caches user IDs to reduce API calls
- Provides logging and monitoring

## Prerequisites

- Node.js (v14 or higher)
- Supabase account and project
- Twitter API credentials

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Make sure your `.env` file contains the following variables:
   ```
   # Twitter API Credentials
   TWITTER_API_KEY=your_api_key
   TWITTER_API_SECRET=your_api_secret
   TWITTER_ACCESS_TOKEN=your_access_token
   TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret
   TWITTER_BEARER_TOKEN=your_bearer_token

   # Supabase Credentials
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ```
4. Ensure your `x-accounts.txt` file contains the X accounts you want to monitor (the script will extract handles in the format `@username`)

## Database Structure

The application uses two tables in Supabase:

### x_accounts

Stores the accounts being monitored.

Fields:
- `id`: Serial primary key
- `handle`: X username (without @)
- `platform`: Always "x" for now
- `priority`: Integer (lower numbers are processed first)
- `last_checked`: Timestamp of the last check

### tweets_cache

Stores the last 3 tweets for each account.

Fields:
- `id`: Serial primary key
- `account_id`: Foreign key referencing x_accounts.id
- `tweet_id`: Unique ID of the tweet
- `tweet_text`: Content of the tweet
- `tweet_url`: URL to the tweet
- `created_at`: When the tweet was created
- `fetched_at`: When the tweet was fetched

## Usage

### Test Database Connection

To test the connection to your Supabase database:

```
npm run test-db
```

### Test Twitter API Connection

To test the connection to the Twitter API and verify your credentials:

```
npm run test-twitter
```

### Test Account Parsing

To test the extraction of X handles from `x-accounts.txt` without inserting them into the database:

```
npm run test-parse
```

### Parse Accounts

To extract X handles from `x-accounts.txt` and populate the database:

```
npm run parse-accounts
```

### Start Monitoring

To start the monitoring process:

```
npm start
```

This will:
1. Initialize the database tables if they don't exist
2. Schedule the monitoring job to run every 6 hours
3. Run an initial monitoring process immediately, processing accounts in batches

### Test Mode

First, add the test account to the database:

```
npm run add-test-account
```

Then you have two options:

1. Run a single test and exit (best for initial testing):

```
npm run run-single-test
```

2. Run in continuous test mode (runs every 30 minutes):

```
npm run start:test
```

Test mode:
1. Only processes a single account (default: 'OBEYGIANT')
2. Provides detailed logging about the tweets fetched
3. Uses the real Twitter API but minimizes API usage
4. Is ideal for testing the application before scaling up

## Configuration

You can modify the following constants in `index.js` to adjust the behavior:

- `TWEETS_PER_ACCOUNT`: Number of tweets to store per account (default: 3)
- `INCLUDE_REPLIES`: Whether to include replies (default: false)
- `INCLUDE_RETWEETS`: Whether to include retweets (default: false)
- `BASE_API_DELAY_MS`: Minimum delay between API calls in milliseconds (default: 10000)
- `MAX_RETRY_ATTEMPTS`: Maximum number of retry attempts for rate limit errors (default: 3)
- `BATCH_SIZE`: Number of accounts to process in each batch (default: 5)
- `BATCH_INTERVAL_MINUTES`: Time between processing batches in minutes (default: 60)
- `CRON_SCHEDULE`: Schedule for the monitoring job (default: '0 */6 * * *' - every 6 hours)

## Rate Limit Handling

The application implements several strategies to respect Twitter's API rate limits:

1. **Batch Processing**: Accounts are processed in small batches (default: 5 accounts per batch) with delays between batches.
2. **User ID Caching**: User IDs are cached to reduce API calls by 50%.
3. **Adaptive Delays**: The delay between API calls is calculated based on the batch size and Twitter's rate limits.
4. **Exponential Backoff**: When rate limits are hit, the application uses exponential backoff for retries.
5. **Rate Limit Monitoring**: The application tracks rate limit information from Twitter's API responses.

### Checking Current Rate Limits

You can check your current Twitter API rate limits at any time:

```
npm run check-limits
```

This will show:
- Current usage for each endpoint
- Remaining requests
- When limits will reset
- Recommendations based on your current usage

## Logging

The application uses a simple logging system with four levels:

- DEBUG: Detailed information for debugging
- INFO: General information about the process
- WARN: Warnings that don't prevent the application from running
- ERROR: Errors that may cause issues

You can change the log level by modifying the `currentLogLevel` in `src/logger.js`.

## Docker Deployment

This application can be deployed using Docker. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions on how to deploy to a server.

### Quick Docker Start

1. Build and run with Docker Compose:

```bash
docker-compose up -d
```

2. View logs:

```bash
docker-compose logs -f
```

3. Stop the container:

```bash
docker-compose down
```
