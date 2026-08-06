@echo off
chcp 65001 >nul
title Kilo Code RTL - Build & Package
echo ========================================
echo    Kilo Code RTL Support - Build
echo ========================================
echo.

echo [1/3] Copying source files to out/...
if not exist "out" mkdir out
copy /Y extension.js out\extension.js >nul
copy /Y rtl-inject.js out\rtl-inject.js >nul
copy /Y rtl-inject.css out\rtl-inject.css >nul
copy /Y markdown-rtl.js out\markdown-rtl.js >nul
copy /Y markdown-rtl.css out\markdown-rtl.css >nul
echo Done.
echo.

echo [2/3] Installing vsce...
call npm install -g vsce 2>&1
echo.

echo [3/3] Packaging .vsix...
call vsce package --out kilo-code-rtl.vsix 2>&1
echo.

if exist kilo-code-rtl.vsix (
    echo ========================================
    echo    Build successful!
    echo    Output: kilo-code-rtl.vsix
    echo ========================================
) else (
    echo Build failed. Check errors above.
)

pause
