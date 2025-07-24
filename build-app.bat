@echo off
echo.
echo ========================================
echo   🐝 Beesoft App Builder
echo ========================================
echo.

echo [1/4] Installing dependencies...
call npm install

echo.
echo [2/4] Cleaning previous builds...
if exist "dist" rmdir /s /q "dist"

echo.
echo [3/4] Building Windows installer...
call npm run build:win

echo.
echo [4/4] Building portable version...
call npm run build:portable

echo.
echo ========================================
echo   ✅ Build Complete!
echo ========================================
echo.
echo Your app files are in the 'dist' folder:
echo - Installer: Beesoft 🐝 - WhatsApp Automation-1.0.0-x64.exe
echo - Portable:  Beesoft 🐝 - WhatsApp Automation-1.0.0-portable.exe
echo.
pause