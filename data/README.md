# Account Data Import

This directory contains data files and scripts for importing accounts into the Marvin Account Monitor system.

## Files

- `twitter-accounts.json`: A JSON array of Twitter handles to be imported into the system.
- `accounts-data.json`: A more comprehensive JSON file containing account information across multiple platforms (Twitter, Instagram, YouTube, TikTok).

## Importing Twitter Accounts

To import Twitter accounts from the `twitter-accounts.json` file into the Supabase database, run:

```bash
npm run import-accounts
```

This command will:

1. Read the Twitter handles from `data/twitter-accounts.json`
2. Check if each account already exists in the database
3. Add new accounts with a default priority of 3
4. Skip accounts that already exist
5. Report statistics on the import process

## Format of twitter-accounts.json

The `twitter-accounts.json` file should contain an array of Twitter handles in the following format:

```json
[
  "@username1",
  "@username2",
  "@username3"
]
```

The `@` symbol is optional - the import script will handle handles with or without it.

## Multi-Platform Account Data

The `accounts-data.json` file contains a more comprehensive dataset with accounts across multiple platforms. While the current version of the Marvin Account Monitor only supports Twitter/X accounts, this data is stored for future expansion to other platforms.

The format of this file is:

```json
[
  {
    "Name": "Account Name",
    "Twitter": "@twitter_handle",
    "Instagram": "@instagram_handle",
    "YouTube": "@youtube_channel",
    "TikTok": "@tiktok_handle"
  },
  ...
]
```

## Future Expansion

To support additional platforms in the future, the database schema and application code would need to be updated. Potential approaches include:

1. Adding columns to the existing `x_accounts` table for other platform handles
2. Creating separate tables for each platform
3. Creating a new unified accounts table with platform-specific details

The `accounts-data.json` file provides the data needed for this future expansion.
