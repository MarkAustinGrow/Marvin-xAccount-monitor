-- Add unique constraint to accounts_to_review table
ALTER TABLE accounts_to_review ADD CONSTRAINT unique_handle UNIQUE (handle);
