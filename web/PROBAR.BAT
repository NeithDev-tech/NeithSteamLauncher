@echo off
setlocal
cd /d "%~dp0"
title Neith Web - Local Test

echo ================================================
echo   NEITH WEB - LOCAL TEST

echo ================================================
echo.
echo Opening the website at http://127.0.0.1:8080/
echo Keep this window open while testing.
echo.

where py >nul 2>nul
if %errorlevel%==0 (
  py -3 "_neith_local_server.py" --port 8080
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    python "_neith_local_server.py" --port 8080
  ) else (
    echo ERROR: Python 3 is not installed or is not available in PATH.
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
