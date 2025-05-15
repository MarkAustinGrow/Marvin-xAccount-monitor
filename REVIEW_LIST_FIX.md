# Review List Fix

## Problem

The system was continuing to check accounts that had already been added to the review list with a "pending" status. This resulted in:

1. Wasted API calls on accounts with known issues
2. Repeated errors in the logs for the same accounts
3. Inefficient use of rate limits
4. Slower processing of valid accounts

## Solution

The fix modifies the `getAccountsToMonitor` function in `src/db.js` to exclude accounts that are in the review list with a "pending" status:

```javascript
// Function to get all accounts to monitor
async function getAccountsToMonitor() {
  try {
    const now = new Date().toISOString();
    
    // First, get all accounts in the review list with status 'pending'
    const { data: accountsToReview, error: reviewError } = await supabase
      .from('accounts_to_review')
      .select('handle')
      .eq('status', 'pending');
    
    if (reviewError) {
      console.error('Error fetching accounts to review:', reviewError);
      return [];
    }
    
    // Create a set of handles to exclude
    const excludeHandles = new Set(accountsToReview.map(a => a.handle));
    
    // Get accounts that are due for checking (next_check_date is null or in the past)
    // Order by next_check_date first (oldest first), then by priority
    // Exclude accounts that are in the review list with status 'pending'
    const { data, error } = await supabase
      .from('x_accounts')
      .select('*')
      .or(`next_check_date.is.null,next_check_date.lt.${now}`) // Only get accounts that are due for checking
      .order('next_check_date', { ascending: true }) // Process accounts that are most overdue first
      .order('priority', { ascending: true });       // Then consider priority as a secondary factor
    
    if (error) {
      console.error('Error fetching accounts:', error);
      return [];
    }
    
    // Filter out accounts that are in the review list with status 'pending'
    const filteredAccounts = data ? data.filter(account => !excludeHandles.has(account.handle)) : [];
    
    console.log(`Filtered out ${data ? data.length - filteredAccounts.length : 0} accounts that are in the review list with status 'pending'`);
    
    return filteredAccounts;
  } catch (error) {
    console.error('Error in getAccountsToMonitor:', error);
    return [];
  }
}
```

## Implementation Details

The implementation:

1. Queries the `accounts_to_review` table for all accounts with a "pending" status
2. Creates a Set of handles to exclude for efficient lookups
3. Fetches accounts that are due for checking as before
4. Filters out any accounts whose handles are in the exclude set
5. Logs how many accounts were filtered out

## Benefits

This fix provides several benefits:

1. **Reduced API Usage**: By not checking accounts with known issues, we save API calls
2. **Cleaner Logs**: Fewer repeated errors in the logs
3. **Faster Processing**: More time spent on valid accounts
4. **Better Rate Limit Management**: API rate limits are used more efficiently

## Deployment

To deploy this fix:

1. Push the changes to GitHub:
   ```
   ./push-review-list-fix.bat
   ```

2. Deploy to the server:
   ```
   ./deploy-review-list-fix.sh
   ```

## Monitoring

After deployment, you should see log messages indicating how many accounts were filtered out:

```
Filtered out X accounts that are in the review list with status 'pending'
```

This will help you track the effectiveness of the fix.
