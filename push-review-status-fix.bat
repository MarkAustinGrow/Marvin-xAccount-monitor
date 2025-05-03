@echo off
REM Script to push the fix for the "Mark as Fixed" button to GitHub

echo ===== Pushing Fix for "Mark as Fixed" Button to GitHub =====
echo This script will push the fix for the "Mark as Fixed" button to GitHub.

REM Check if we're on the correct branch
for /f "tokens=*" %%a in ('git rev-parse --abbrev-ref HEAD') do set CURRENT_BRANCH=%%a
echo Current branch: %CURRENT_BRANCH%
echo.

REM Add the modified files
echo Adding modified files to git...
git add src/db.js
git add deploy-review-status-fix.sh
git add REVIEW_STATUS_FIX.md

REM Commit the changes
echo Committing changes...
git commit -m "Fix 'Mark as Fixed' button issue" -m "- Modified updateAccountReviewStatus function to handle duplicate entries" -m "- Added deployment script for the fix"

REM Push to GitHub
echo Pushing changes to GitHub...
git push origin %CURRENT_BRANCH%

if %ERRORLEVEL% neq 0 (
  echo Error: Failed to push changes to GitHub. Please check your connection and try again.
  exit /b 1
)

echo ===== Changes Pushed Successfully =====
echo The fix for the "Mark as Fixed" button has been pushed to GitHub on branch: %CURRENT_BRANCH%
echo.
echo To deploy these changes to your Linode server, run:
echo   ./deploy-review-status-fix.sh
echo.
echo This will update the code and restart the Docker container with the new changes.

pause
