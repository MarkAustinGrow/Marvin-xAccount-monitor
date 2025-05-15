# Tweet Fetch Optimization

## Overview

This optimization improves the efficiency of the Twitter API usage by only fetching tweets that are newer than the most recent tweet already stored in the database for each account. This significantly reduces the number of API calls and helps stay within Twitter's rate limits.

## Implementation Details

### Changes Made

1. **Modified `src/twitter.js`**:
   - Updated the `fetchRecentTweets` function to accept a `since_date` parameter
   - Added logic to use the Twitter API's `start_time` parameter when a `since_date` is provided

2. **Modified `index.js`**:
   - Updated the `processAccount` function to get the most recent tweet date from cached tweets
   - Pass this date to the `fetchRecentTweets` function
   - Optimized the comparison logic since we know all fetched tweets will be new when using `since_date`

3. **Modified `scripts/rate-limited-fetcher.js`**:
   - Made similar changes to the `processAccount` method to use the most recent tweet date

## Benefits

1. **Reduced API Calls**: Instead of fetching 30 tweets every time, we'll only fetch tweets newer than what we already have.
2. **Lower Rate Limit Impact**: This could reduce API calls by 50-90% depending on how frequently accounts tweet.
3. **Faster Processing**: Less data to fetch and process means faster execution.
4. **Simplified Comparison**: We can skip the tweet ID comparison step in many cases since we know all fetched tweets are new.

## How It Works

1. When processing an account, the system first checks the database for the most recent tweet's date for that account.
2. If a date is found, it's passed to the Twitter API call with a small buffer (1 second) to ensure no tweets are missed.
3. The Twitter API then only returns tweets newer than this date, significantly reducing the amount of data transferred.
4. If no tweets are returned, it means there are no new tweets since the last check.
5. If tweets are returned, they're all new and can be added to the database without additional comparison.

## Deployment

To deploy these changes:

1. Use the `push-tweet-fetch-optimization.bat` script to push changes to GitHub
2. Use the `deploy-tweet-fetch-optimization.sh` script to deploy directly to the server

## Testing

You can test this optimization by:

1. Running the application in test mode: `node index.js --test`
2. Checking the logs to see if the "Fetching tweets for @handle since [date]" message appears
3. Verifying that the number of API calls has decreased

## Potential Future Improvements

1. Add metrics to track the number of API calls saved by this optimization
2. Implement a similar optimization for the user ID lookup by caching user IDs more aggressively
3. Consider adding a minimum time between checks for accounts that rarely tweet
