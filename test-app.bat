@echo off
echo.
echo ========================================
echo   🐝 Beesoft App Test
echo ========================================
echo.

echo [1/2] Testing Electron app startup...
echo Starting app in development mode...
echo.

start /wait npm run dev

echo.
echo [2/2] App test complete!
echo.
echo If the app opened successfully, you can now:
echo 1. Build the app: npm run build:win
echo 2. Test WhatsApp connection
echo 3. Use the refresh and restart features
echo.
pause