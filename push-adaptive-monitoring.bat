@echo off
echo Pushing Adaptive Monitoring to GitHub...

REM Create a new branch for the adaptive monitoring
git checkout -b adaptive-monitoring

REM Add the modified files
git add src/db.js index.js scripts/initialize-adaptive-monitoring.js scripts/test-adaptive-monitoring.js adaptive-monitoring-schema.sql package.json ADAPTIVE_MONITORING.md deploy-adaptive-monitoring.sh features.md

REM Commit with a descriptive message
git commit -m "Implement adaptive monitoring to reduce API usage based on account activity levels"

REM Push the branch to GitHub
git push -u origin adaptive-monitoring

echo.
echo Changes pushed to GitHub in the 'adaptive-monitoring' branch.
echo.
