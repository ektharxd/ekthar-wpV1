@echo off
echo.
echo ========================================
echo   🐝 Beesoft Quick Build
echo ========================================
echo.

echo [1/3] Installing dependencies...
call npm install

echo.
echo [2/3] Building Windows app...
call npm run build:win

echo.
echo [3/3] Building portable version...
call npm run build:portable

echo.
echo ========================================
echo   ✅ Build Complete!
echo ========================================
echo.
echo Your app files are in the 'dist' folder:
dir dist\*.exe
echo.
echo To test your app:
echo - Run the installer: dist\Beesoft*.exe
echo - Or run portable: dist\Beesoft*portable.exe
echo.
pause