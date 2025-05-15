-- Add activity level and related fields to x_accounts table
ALTER TABLE x_accounts 
ADD COLUMN IF NOT EXISTS activity_level TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS tweets_per_week FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_check_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_tweet_date TIMESTAMP;

-- Create an index on the next_check_date column for faster queries
CREATE INDEX IF NOT EXISTS idx_x_accounts_next_check_date ON x_accounts(next_check_date);

-- Create an index on the activity_level column for faster filtering
CREATE INDEX IF NOT EXISTS idx_x_accounts_activity_level ON x_accounts(activity_level);

-- Create a table to track API usage
CREATE TABLE IF NOT EXISTS api_usage_stats (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  calls_made INTEGER DEFAULT 0,
  daily_limit INTEGER DEFAULT 500,
  reset_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create a unique index on the date column
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_usage_stats_date ON api_usage_stats(date);
