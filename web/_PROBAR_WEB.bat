@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title NEITH OFFICIAL WEB - SERVIDOR LOCAL

echo ==============================================================
echo   NEITH OFFICIAL WEB - PRUEBA LOCAL
echo ==============================================================
echo.

if not exist "%~dp0NEITH_BUILD.txt" (
  echo ERROR: falta NEITH_BUILD.txt en esta carpeta.
  pause
  exit /b 2
)

set "NEITH_BUILD="
set /p NEITH_BUILD=<"%~dp0NEITH_BUILD.txt"
echo Build detectada: %NEITH_BUILD%
echo.

set "PYTHON_CMD="
where py >nul 2>nul
if not errorlevel 1 set "PYTHON_CMD=py -3"
if not defined PYTHON_CMD (
  where python >nul 2>nul
  if not errorlevel 1 set "PYTHON_CMD=python"
)

if not defined PYTHON_CMD (
  echo ERROR: Python 3 no esta disponible en este PC.
  echo Instala Python 3 y vuelve a ejecutar _PROBAR_WEB.bat.
  pause
  exit /b 3
)

%PYTHON_CMD% "%~dp0_neith_local_server.py" --port 8080
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo.
  echo El servidor termino con codigo %RC%.
  pause
)
exit /b %RC%
