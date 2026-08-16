@echo off
title RBT Git Push

echo ========================================
echo        RBT - Git Push
echo ========================================
echo.

echo [1/5] Checking remote...
git remote -v
echo.

echo [2/5] Checking status...
git status
echo.

echo [3/5] Adding files...
git add .
if errorlevel 1 goto error

echo.
echo [4/5] Creating commit...
set /p MSG=Commit message: 

if "%MSG%"=="" set "MSG=Update RBT"

git commit -m "%MSG%"

echo.
echo [5/5] Pushing to GitHub...
git push -u origin main

if errorlevel 1 goto error

echo.
echo ========================================
echo       PUSH SUCCESSFUL
echo ========================================
pause
exit /b 0

:error
echo.
echo ========================================
echo          PUSH FAILED
echo ========================================
echo Check the error above.
pause
exit /b 1