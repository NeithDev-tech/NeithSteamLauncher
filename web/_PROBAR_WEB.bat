@echo off
setlocal
cd /d "%~dp0"
title NEITH WEB V32 - SERVIDOR LOCAL

echo ==============================================================
echo   NEITH OFFICIAL WEB V32 - PRUEBA LOCAL
 echo ==============================================================
echo.

findstr /I /C:"V32" "%~dp0NEITH_BUILD.txt" >nul 2>nul
if errorlevel 1 (
  echo ERROR: esta carpeta no esta marcada como V32.
  echo Contenido de NEITH_BUILD.txt:
  type "%~dp0NEITH_BUILD.txt"
  echo.
  pause
  exit /b 2
)

set "PYTHON_CMD="
where py >nul 2>nul
if not errorlevel 1 set "PYTHON_CMD=py -3"
if not defined PYTHON_CMD (
  where python >nul 2>nul
  if not errorlevel 1 set "PYTHON_CMD=python"
)

if not defined PYTHON_CMD (
  echo ERROR: Python no esta disponible en este PC.
  echo Esta V32 usa el servidor HTTP estandar de Python para evitar los
  echo bloqueos y retardos del antiguo servidor TCP de PowerShell.
  echo.
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
