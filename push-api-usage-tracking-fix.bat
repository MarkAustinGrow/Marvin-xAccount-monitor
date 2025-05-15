@echo off
echo Pushing API Usage Tracking Fix to GitHub...

git add src/db.js
git add index.js
git add scripts/rate-limited-fetcher.js
git add scripts/initialize-api-usage-tracking.js
git add API_USAGE_TRACKING_FIX.md

git commit -m "Fix circuit breaker to properly track and limit API calls"

git push

echo Done!
pause
