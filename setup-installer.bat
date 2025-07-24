@echo off
echo.
echo ========================================
echo   🐝 Beesoft Installer Setup
echo ========================================
echo.

echo [1/3] Creating installer directory...
if not exist "installer" mkdir installer

echo [2/3] Opening graphics generator...
echo Please generate the installer graphics by opening the HTML file
start "" "installer\create-graphics.html"

echo.
echo Instructions:
echo 1. The graphics generator will open in your browser
echo 2. Click "Download Welcome Banner" and save as "welcome-bee.bmp" in the installer folder
echo 3. Click "Download Header Banner" and save as "header-bee.bmp" in the installer folder
echo 4. Close the browser when done
echo.

pause

echo [3/3] Checking for graphics files...
if exist "installer\welcome-bee.bmp" (
    echo ✅ Welcome banner found
) else (
    echo ❌ Welcome banner missing - please download it from the graphics generator
)

if exist "installer\header-bee.bmp" (
    echo ✅ Header banner found
) else (
    echo ❌ Header banner missing - please download it from the graphics generator
)

echo.
echo ========================================
echo   🎨 Installer Setup Complete!
echo ========================================
echo.
echo Your Material 3 bee-themed installer is ready!
echo Run "npm run build:win" to create the installer.
echo.
pause