# Adaptive Monitoring System

This document describes the adaptive monitoring system implemented to optimize Twitter API usage and stay within rate limits.

## Overview

The adaptive monitoring system categorizes accounts based on their tweet frequency and adjusts the monitoring schedule accordingly. This significantly reduces API calls while ensuring that all accounts are monitored at an appropriate frequency.

## Key Features

### 1. Activity Level Classification

Accounts are classified into three activity levels based on their tweet frequency:

- **High Activity**: Accounts that tweet more than once per day on average (7+ tweets per week)
- **Medium Activity**: Accounts that tweet between 1-7 times per week
- **Low Activity**: Accounts that tweet less than once per week

### 2. Adaptive Monitoring Schedule

The monitoring frequency is adjusted based on the activity level:

- **High Activity Accounts**: Checked daily
- **Medium Activity Accounts**: Checked every 3 days
- **Low Activity Accounts**: Checked weekly

This ensures that frequently updating accounts are checked more often, while rarely updating accounts are checked less frequently, optimizing API usage.

### 3. API Usage Tracking

The system tracks API usage in a dedicated database table:

- Records daily API calls
- Stores rate limit information
- Tracks reset times

### 4. Circuit Breaker Pattern

To prevent hitting rate limits:

- The system checks current API usage before processing accounts
- If usage approaches 80% of the daily limit, processing is paused
- Processing resumes after the rate limit resets

### 5. Selective Account Processing

Instead of processing all accounts on each run:

- Only accounts that are due for checking (based on their next_check_date) are processed
- Next check dates are calculated based on activity level
- Check dates are staggered to distribute API calls evenly

## Database Schema Changes

The following fields were added to the `x_accounts` table:

- `activity_level`: The account's activity level (high, medium, low)
- `tweets_per_week`: The average number of tweets per week
- `next_check_date`: When the account is due to be checked next
- `last_tweet_date`: The date of the most recent tweet

A new table `api_usage_stats` was created to track API usage:

- `date`: The date of the API usage
- `calls_made`: Number of API calls made on this date
- `daily_limit`: The daily API call limit
- `reset_time`: When the rate limit resets

## Implementation Details

### Activity Level Calculation

Activity levels are calculated based on the date range of available tweets:

```javascript
// Calculate tweets per week based on the date range of available tweets
const newestTweet = new Date(tweets[0].created_at);
const oldestTweet = new Date(tweets[tweets.length - 1].created_at);

// Calculate the date range in days
const dateRangeInDays = (newestTweet - oldestTweet) / (1000 * 60 * 60 * 24);

// Calculate tweets per week
tweetsPerWeek = (tweets.length / dateRangeInDays) * 7;

// Determine activity level based on tweets per week
if (tweetsPerWeek >= 7) {
  // More than 1 tweet per day on average
  activityLevel = 'high';
} else if (tweetsPerWeek >= 1) {
  // Between 1-7 tweets per week
  activityLevel = 'medium';
} else {
  // Less than 1 tweet per week
  activityLevel = 'low';
}
```

### Next Check Date Calculation

Next check dates are calculated based on activity level:

```javascript
// Calculate next check date based on activity level
const now = new Date();
let nextCheckDate = new Date(now);

switch (account.activity_level) {
  case 'high':
    // Check high activity accounts daily
    nextCheckDate.setDate(now.getDate() + 1);
    break;
  case 'medium':
    // Check medium activity accounts every 3 days
    nextCheckDate.setDate(now.getDate() + 3);
    break;
  case 'low':
    // Check low activity accounts weekly
    nextCheckDate.setDate(now.getDate() + 7);
    break;
  default:
    // Default to medium (3 days)
    nextCheckDate.setDate(now.getDate() + 3);
}

// Stagger the next check dates to avoid checking all accounts at once
// Add a random offset of 0-6 hours
const randomHours = Math.floor(Math.random() * 6);
nextCheckDate.setHours(nextCheckDate.getHours() + randomHours);
```

### API Usage Tracking

API calls are tracked in the database:

```javascript
// Track the API call in the database
await db.trackApiUsage(callsMade, dailyLimit, resetTime);

// Get updated usage
const usage = await db.getTodayApiUsage();

// Check if we're approaching the limit
const isApproachingLimit = await db.isApproachingApiLimit(API_LIMIT_SAFETY_THRESHOLD);
if (isApproachingLimit) {
  // Skip processing to avoid hitting the limit
  logger.warn(`Skipping account - approaching daily API limit`);
  return;
}
```

## Expected Benefits

The adaptive monitoring system is expected to provide the following benefits:

1. **Reduced API Usage**: By only checking accounts when necessary, API calls are significantly reduced.
2. **Optimized Monitoring**: Frequently updating accounts are checked more often, while rarely updating accounts are checked less frequently.
3. **Rate Limit Protection**: The circuit breaker pattern prevents hitting rate limits.
4. **Scalability**: The system can handle more accounts without increasing API usage proportionally.

## Initialization

To initialize the adaptive monitoring system:

```bash
npm run init-adaptive-monitoring
```

This script:
1. Applies the schema changes
2. Calculates initial activity levels for all accounts
3. Sets next check dates based on activity levels
4. Initializes API usage tracking

## Monitoring and Maintenance

The system is self-maintaining, but you can:

- View account activity levels in the database
- Adjust the monitoring frequency by changing the activity level thresholds
- Monitor API usage through the `api_usage_stats` table
