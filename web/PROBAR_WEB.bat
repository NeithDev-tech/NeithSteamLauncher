@echo off
setlocal
cd /d "%~dp0"
title Neith Web - Prueba local

echo ================================================
echo   NEITH WEB - LOCAL TEST SERVER
echo ================================================
echo.
echo The website will open automatically in your browser.
echo Keep this window open while testing the website.
echo.

where py >nul 2>nul
if %errorlevel%==0 (
  py -3 "_neith_local_server.py" --port 8080
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    python "_neith_local_server.py" --port 8080
  ) else (
    echo ERROR: Python is not installed or is not available in PATH.
    echo Install Python 3 and run PROBAR_WEB.bat again.
    pause
    exit /b 1
  )
)

if not %errorlevel%==0 (
  echo.
  echo The server stopped with an error. Check the message above.
  pause
)
endlocal
