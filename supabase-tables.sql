-- Create the x_accounts table
CREATE TABLE IF NOT EXISTS x_accounts (
  id SERIAL PRIMARY KEY,
  handle TEXT UNIQUE NOT NULL,
  platform TEXT DEFAULT 'x',
  priority INTEGER DEFAULT 3,
  last_checked TIMESTAMP
);

-- Create the tweets_cache table
CREATE TABLE IF NOT EXISTS tweets_cache (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES x_accounts(id) ON DELETE CASCADE,
  tweet_id TEXT UNIQUE NOT NULL,
  tweet_text TEXT,
  tweet_url TEXT,
  created_at TIMESTAMP,
  fetched_at TIMESTAMP DEFAULT NOW()
);

-- Optional: Create an index on the account_id column for faster lookups
CREATE INDEX IF NOT EXISTS idx_tweets_cache_account_id ON tweets_cache(account_id);

-- Optional: Create an index on the created_at column for faster sorting
CREATE INDEX IF NOT EXISTS idx_tweets_cache_created_at ON tweets_cache(created_at);

-- Create the accounts_to_review table for tracking problematic accounts
CREATE TABLE IF NOT EXISTS accounts_to_review (
  id SERIAL PRIMARY KEY,
  handle TEXT NOT NULL,
  error_message TEXT,
  error_code TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'pending',
  notes TEXT
);

-- Create an index on the status column for faster filtering
CREATE INDEX IF NOT EXISTS idx_accounts_to_review_status ON accounts_to_review(status);
