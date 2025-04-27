@echo off
echo ===== Preparing for Vercel Deployment =====

echo Checking for required files...
if not exist "next.config.js" (
  echo ERROR: next.config.js not found!
  exit /b 1
)

if not exist "vercel.json" (
  echo ERROR: vercel.json not found!
  exit /b 1
)

echo Running build to test configuration...
call npm run build

if %ERRORLEVEL% neq 0 (
  echo Build failed! Please fix the errors before deploying.
  exit /b 1
)

echo Build successful!
echo.
echo ===== Deployment Instructions =====
echo 1. Make sure you have the Vercel CLI installed:
echo    npm i -g vercel
echo.
echo 2. Run the following command to deploy:
echo    vercel
echo.
echo 3. Follow the prompts to complete deployment
echo.
echo For more detailed instructions, see VERCEL_DEPLOYMENT.md
echo ===== End of Deployment Script =====

choice /C YN /M "Do you want to run 'vercel' now"
if %ERRORLEVEL% equ 1 (
  vercel
)
