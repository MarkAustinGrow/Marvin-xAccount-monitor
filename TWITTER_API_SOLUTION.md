# Twitter API Rate Limiting Solution

This document explains the changes made to fix the Twitter API integration issues and provides guidance on how to use the new rate-limited fetcher.

## Problem Summary

The application was encountering several issues with the Twitter API:

1. **Parameter Validation Error**: The `exclude` parameter was being set to an empty array when `includeReplies` was true, causing a 400 Bad Request error.

2. **Rate Limiting Issues**: Twitter's Basic tier has very strict rate limits (5 requests per 15 minutes for user timelines), making it impossible to fetch tweets for all accounts in a reasonable timeframe.

3. **Accounts Being Added to Review List**: Many accounts were being added to the review list with "Account consistently returns 0 tweets despite successful API calls" because the API was returning empty results due to rate limiting.

## Solutions Implemented

### 1. Fixed Parameter Validation Issue

We modified the `fetchRecentTweets` function in `src/twitter.js` to properly handle the `exclude` parameter:

```javascript
// Build the request parameters
const requestParams = {
  max_results: 30,
  'tweet.fields': [
    'created_at', 
    'text', 
    'id', 
    'referenced_tweets',
    'public_metrics',
    'context_annotations',
    'entities',
    'lang'
  ]
};

// Only add the exclude parameter if we want to exclude replies
if (!includeReplies) {
  requestParams.exclude = ['replies'];
}

// Fetch tweets for the user with engagement metrics
const tweets = await readOnlyClient.v2.userTimeline(userId, requestParams);
```

This ensures that the `exclude` parameter is only included when it has a valid value.

### 2. Created Rate-Limited Fetcher

We created a new `RateLimitedFetcher` class that implements a sophisticated rate-limiting strategy:

- **Queue System**: Processes accounts in batches with configurable delays between accounts
- **Rate Limit Awareness**: Checks rate limits before processing and pauses when limits are approached
- **Intelligent Retry Logic**: Uses exponential backoff for rate limit errors
- **Detailed Logging**: Logs all operations and errors for debugging

### 3. Integration Example

We provided an integration example that shows how to use the rate-limited fetcher with your existing database and configuration.

## How to Use the Rate-Limited Fetcher

### Option 1: Run the Integration Script

The simplest way to use the rate-limited fetcher is to run the integration script:

```bash
node scripts/integrate-rate-limited-fetcher.js
```

This script:
- Connects to your database
- Fetches accounts to monitor
- Processes them in batches with appropriate delays
- Updates the database with the results

### Option 2: Modify Your Docker Configuration

You can modify your Docker configuration to use the integration script instead of the original index.js:

```yaml
services:
  marvin-account-monitor:
    build: .
    command: node scripts/integrate-rate-limited-fetcher.js
    # ... rest of your configuration
```

### Option 3: Integrate into Your Existing Code

You can also integrate the `RateLimitedFetcher` directly into your existing code:

```javascript
const RateLimitedFetcher = require('./scripts/rate-limited-fetcher');

// Create and configure the fetcher
const fetcher = new RateLimitedFetcher({
  maxAccountsPerBatch: 3,
  tweetsPerAccount: 10,
  includeReplies: true,
  includeRetweets: false,
  delayBetweenAccounts: 180000, // 3 minutes
  db: yourDbConnection
});

// Add accounts to process
fetcher.addAccounts(accountsToProcess);

// Start processing
const results = await fetcher.start();
```

## Configuration Options

The `RateLimitedFetcher` accepts the following configuration options:

| Option | Description | Default |
|--------|-------------|---------|
| `maxAccountsPerBatch` | Number of accounts to process in each batch | 3 |
| `tweetsPerAccount` | Number of tweets to fetch per account | 5 |
| `includeReplies` | Whether to include replies in fetched tweets | true |
| `includeRetweets` | Whether to include retweets in fetched tweets | false |
| `delayBetweenAccounts` | Delay between processing accounts (ms) | 180000 (3 min) |
| `maxRetries` | Maximum number of retry attempts | 3 |
| `logToFile` | Whether to log to a file | true |
| `logFilePath` | Path to the log file | logs/twitter-fetcher.log |
| `db` | Database connection | null |

## Rate Limit Considerations

With Twitter's Basic tier, you're limited to:
- 5 requests per 15 minutes for user timelines
- 100 requests per 24 hours for user lookups
- 1M posts retrievable per month

This means you can process at most:
- 20 accounts per hour (with the default 3-minute delay)
- 480 accounts per day
- ~15,000 accounts per month

If you need to monitor more accounts, consider:
1. Prioritizing accounts based on importance
2. Reducing the frequency of checks for less important accounts
3. Upgrading to Twitter's Pro tier for higher limits

## Testing

You can test the Twitter API integration with:

```bash
node scripts/test-bbcnews.js
```

This will fetch a single tweet from the @BBCNews account to verify that the API integration is working correctly.

## Troubleshooting

If you encounter issues:

1. Check the logs in `logs/twitter-fetcher.log`
2. Run the test script to verify API connectivity
3. Check your Twitter API rate limits using the rate-limited fetcher's `checkRateLimits` method
4. Verify your Twitter API credentials in the `.env` file
