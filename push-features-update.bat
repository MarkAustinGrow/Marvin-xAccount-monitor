@echo off
REM Script to push the updated features.md file to GitHub

echo ===== Pushing Updated Features Documentation to GitHub =====
echo This script will push the updated features.md file to GitHub.

REM Check if we're on the correct branch
for /f "tokens=*" %%a in ('git rev-parse --abbrev-ref HEAD') do set CURRENT_BRANCH=%%a
echo Current branch: %CURRENT_BRANCH%
echo.

REM Add the modified files
echo Adding modified files to git...
git add features.md

REM Commit the changes
echo Committing changes...
git commit -m "Update features documentation with rate-limited fetcher and review system fixes" -m "- Added details about the rate-limited fetcher implementation" -m "- Added information about the fix for the Mark as Fixed button issue" -m "- Updated configuration parameters and testing tools"

REM Push to GitHub
echo Pushing changes to GitHub...
git push origin %CURRENT_BRANCH%

if %ERRORLEVEL% neq 0 (
  echo Error: Failed to push changes to GitHub. Please check your connection and try again.
  exit /b 1
)

echo ===== Changes Pushed Successfully =====
echo The updated features documentation has been pushed to GitHub on branch: %CURRENT_BRANCH%
echo.
echo To deploy these changes to your Linode server, run:
echo   ./deploy-review-status-fix.sh
echo.
echo This will update the code and restart the Docker container with the new changes.

pause
