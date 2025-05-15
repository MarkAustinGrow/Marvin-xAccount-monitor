@echo off
echo Pushing Tweet Fetch Optimization to GitHub...

REM Create a new branch for the tweet fetch optimization
git checkout -b tweet-fetch-optimization

REM Add the modified files
git add index.js scripts/rate-limited-fetcher.js src/twitter.js deploy-tweet-fetch-optimization.sh scripts/test-tweet-fetch-optimization.js TWEET_FETCH_OPTIMIZATION.md features.md package.json

REM Commit with a descriptive message
git commit -m "Optimize tweet fetching to only retrieve tweets newer than the most recent cached tweet"

REM Push the branch to GitHub
git push -u origin tweet-fetch-optimization

echo.
echo Changes pushed to GitHub in the 'tweet-fetch-optimization' branch.
echo.
