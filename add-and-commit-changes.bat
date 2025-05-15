@echo off
echo Adding and committing tweet fetch optimization changes...

REM Add the modified files
git add deploy-tweet-fetch-optimization.sh features.md package.json

REM Add the new files
git add TWEET_FETCH_OPTIMIZATION.md push-tweet-fetch-optimization.bat scripts/test-tweet-fetch-optimization.js

REM Commit with a descriptive message
git commit -m "Optimize tweet fetching to only retrieve tweets newer than the most recent cached tweet"

REM Push the branch to GitHub
git push

echo.
echo Changes committed and pushed to the 'tweet-fetch-optimization' branch.
echo.
