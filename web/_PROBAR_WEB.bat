@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title NEITH WEB V20 - PRUEBA LOCAL FIABLE

set "PORT=8080"
set "PYTHON_CMD="

where py >nul 2>nul && set "PYTHON_CMD=py -3"
if not defined PYTHON_CMD (
    where python >nul 2>nul && set "PYTHON_CMD=python"
)

if not defined PYTHON_CMD (
    echo.
    echo ============================================================
    echo  NEITH WEB V20 - Python 3 no encontrado
    echo ============================================================
    echo Instala Python 3 y marca "Add Python to PATH".
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  NEITH WEB V20 - PRUEBA LOCAL FIABLE / SIN CACHE
echo ============================================================
echo.
echo Carpeta que se va a servir:
echo %CD%
echo.
if not exist "%CD%\NEITH_BUILD.txt" (
    echo ERROR: falta NEITH_BUILD.txt. No se inicia para evitar probar otra copia.
    pause
    exit /b 2
)
type "%CD%\NEITH_BUILD.txt"
echo.
echo Limpiando servidores locales Neith/Python antiguos del puerto %PORT%...

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='SilentlyContinue';" ^
  "$old=Get-CimInstance Win32_Process ^| Where-Object { ($_.Name -match '^python(w)?(\.exe)?$|^py(\.exe)?$') -and (($_.CommandLine -match '-m\s+http\.server\s+8080') -or ($_.CommandLine -match '_neith_local_server\.py')) };" ^
  "foreach($p in $old){ Write-Host ('  Cerrando PID ' + $p.ProcessId); Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }; Start-Sleep -Milliseconds 500"

set "PORT_OWNER="
for /f "usebackq delims=" %%L in (`powershell.exe -NoProfile -Command "$c=Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue ^| Select-Object -First 1; if($c){$p=Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue; if($p){$p.Id.ToString()+'^|'+$p.ProcessName}else{$c.OwningProcess.ToString()+'^|desconocido'}}"`) do set "PORT_OWNER=%%L"

if defined PORT_OWNER (
    echo.
    echo ERROR: el puerto %PORT% sigue ocupado por !PORT_OWNER!.
    echo No abro el navegador para evitar mostrar una version equivocada.
    echo Cierra ese proceso y vuelve a ejecutar _PROBAR_WEB.bat.
    echo.
    pause
    exit /b 3
)

echo Puerto %PORT% libre.
echo Arrancando EXCLUSIVAMENTE esta carpeta con cache desactivada...
echo.
%PYTHON_CMD% "%CD%\_neith_local_server.py"

if errorlevel 1 (
    echo.
    echo ERROR: el servidor local V20 se cerro con un error.
    pause
)
endlocal
