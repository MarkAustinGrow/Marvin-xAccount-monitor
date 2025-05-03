@echo off
REM Script to push the Twitter API integration to GitHub
REM This script will:
REM 1. Add the modified and new files to git
REM 2. Commit the changes with a descriptive message
REM 3. Push the changes to the GitHub repository

echo ===== Pushing Twitter API Integration to GitHub =====
echo This script will push the Twitter API integration to GitHub.

REM Check if we're on the correct branch
for /f "tokens=*" %%a in ('git rev-parse --abbrev-ref HEAD') do set CURRENT_BRANCH=%%a
echo Current branch: %CURRENT_BRANCH%
echo.

REM Add the modified and new files
echo Adding modified and new files to git...
git add src/twitter.js
git add scripts/rate-limited-fetcher.js
git add scripts/integrate-rate-limited-fetcher.js
git add scripts/test-bbcnews.js
git add scripts/test-rate-limited-fetcher.js
git add index.js
git add TWITTER_API_SOLUTION.md

REM Don't add logs.txt as it's likely a temporary file
echo Note: logs.txt will not be added to git as it's likely a temporary file.
echo.

REM Commit the changes
echo Committing changes...
git commit -m "Integrate rate-limited Twitter API fetcher" -m "- Fixed Twitter API exclude parameter issue in src/twitter.js" -m "- Added rate-limited fetcher implementation in scripts/rate-limited-fetcher.js" -m "- Integrated rate-limited fetcher into index.js" -m "- Added test scripts and documentation"

REM Push the changes to GitHub
echo Pushing changes to GitHub...
git push origin %CURRENT_BRANCH%

if %ERRORLEVEL% neq 0 (
  echo Error: Failed to push changes to GitHub. Please check your connection and try again.
  exit /b 1
)

echo ===== Changes Pushed Successfully =====
echo The Twitter API integration has been pushed to GitHub on branch: %CURRENT_BRANCH%
echo.
echo To deploy these changes to your Linode server, run the following commands on the server:
echo.
echo   cd /root/Marvin-xAccount-monitor
echo   git pull origin %CURRENT_BRANCH%
echo   docker-compose down
echo   docker-compose build
echo   docker-compose up -d
echo.
echo This will update the code and restart the Docker container with the new changes.

pause
