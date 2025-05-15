# API Usage Tracking Fix

## Problem

The system was exceeding the Twitter API monthly limit of 15,000 calls because the circuit breaker mechanism wasn't working correctly. The main issues were:

1. The `api_usage_stats` table was empty, so the circuit breaker had no data to work with
2. The circuit breaker was returning `false` (not approaching limit) when it couldn't get usage data
3. API calls weren't being properly tracked in the database
4. The RateLimitedFetcher wasn't integrated with the circuit breaker

## Solution

We've implemented several fixes to ensure the system stays within the API limits:

1. **Improved API Usage Tracking**:
   - Modified `trackApiUsage()` in `db.js` to always use the correct daily limit (400)
   - Added better error logging to diagnose tracking issues
   - Added a fallback mechanism to get usage data directly from Twitter API

2. **Enhanced Circuit Breaker**:
   - Modified `isApproachingApiLimit()` to return `true` (safer) when it can't get usage data
   - Added a direct check of Twitter's rate limit information as a fallback
   - Added more detailed logging when approaching limits

3. **RateLimitedFetcher Integration**:
   - Added circuit breaker checks before processing each account in the fetcher
   - Ensured rate limit information is properly tracked in the database
   - Added the ability to skip remaining accounts in a batch when approaching limits

4. **Initialization Script**:
   - Created `scripts/initialize-api-usage-tracking.js` to set up the API usage tracking table
   - This script gets the current usage from Twitter and initializes the database

## Implementation Details

### Database Schema

The `api_usage_stats` table has the following structure:

```sql
CREATE TABLE IF NOT EXISTS api_usage_stats (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  calls_made INTEGER DEFAULT 0,
  daily_limit INTEGER DEFAULT 400,
  reset_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_usage_stats_date ON api_usage_stats(date);
```

### Usage

To initialize the API usage tracking:

```bash
node scripts/initialize-api-usage-tracking.js
```

This will:
1. Check if there's already a record for today in the `api_usage_stats` table
2. If not, get the current usage from Twitter API
3. Create a record with the correct values

The system will then automatically track API calls and enforce the daily limit.

## Configuration

The system uses the following configuration values:

- `DAILY_API_LIMIT = 400`: Set to 80% of the 500/day app limit for Basic tier
- `API_LIMIT_SAFETY_THRESHOLD = 0.8`: Stop processing when we reach 80% of the daily limit

These values ensure that we stay well within the monthly limit of 15,000 calls.

## Deployment

To deploy these changes to your server:

1. Copy the updated files to your server:
   - `src/db.js`
   - `index.js`
   - `scripts/rate-limited-fetcher.js`
   - `scripts/initialize-api-usage-tracking.js`

2. Create and apply the database schema:
   ```sql
   CREATE TABLE IF NOT EXISTS api_usage_stats (
     id SERIAL PRIMARY KEY,
     date DATE NOT NULL,
     calls_made INTEGER DEFAULT 0,
     daily_limit INTEGER DEFAULT 400,
     reset_time TIMESTAMP,
     created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE UNIQUE INDEX IF NOT EXISTS idx_api_usage_stats_date ON api_usage_stats(date);
   ```

3. Run the initialization script:
   ```bash
   node scripts/initialize-api-usage-tracking.js
   ```

4. Restart the Docker container:
   ```bash
   docker-compose restart
   ```

## Verification

After deployment, you can verify that the circuit breaker is working by:

1. Checking the logs for messages like:
   ```
   API usage tracked: X/400 calls made today
   ```

2. Verifying that the system stops making API calls when approaching the limit:
   ```
   APPROACHING DAILY API LIMIT: X/400 calls made (Y%)
   ```

3. Checking the `api_usage_stats` table in the database:
   ```sql
   SELECT * FROM api_usage_stats ORDER BY date DESC;
