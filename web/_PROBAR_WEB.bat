@echo off
setlocal
cd /d "%~dp0"
title NEITH WEB V34 R122 - SERVIDOR LOCAL

echo ==============================================================
echo   NEITH OFFICIAL WEB V34 R122 - PRUEBA LOCAL
echo ==============================================================
echo.

rem La validacion de version se hace en Python, que lee NEITH_BUILD.txt
rem con UTF-8/UTF-8-BOM de forma fiable. Evitamos FINDSTR, que puede
rem dar falsos negativos segun codificacion/salto de linea en Windows.

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
