@echo off
echo Pushing Review List Fix to GitHub...

REM Create a new branch for the review list fix
git checkout -b review-list-fix

REM Add the modified files
git add src/db.js REVIEW_LIST_FIX.md deploy-review-list-fix.sh

REM Commit with a descriptive message
git commit -m "Fix: Prevent monitoring accounts that are in the review list with pending status"

REM Push the branch to GitHub
git push -u origin review-list-fix

echo.
echo Changes pushed to GitHub in the 'review-list-fix' branch.
echo.
