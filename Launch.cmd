@echo off
setlocal
title CuBlocky Launcher

rem Port override: CUBLOCKY_URL=http://localhost:6000 Launch.cmd
if defined CUBLOCKY_URL set URL=%CUBLOCKY_URL%
if not defined URL set URL=http://localhost:5099

cd /d "%~dp0"

echo.
echo  ========================================
echo    CuBlocky - CU Mod Block Editor
echo  ========================================
echo.

if exist "CuBlocky.Server.exe" goto run_release

echo [1/4] Checking frontend...
if exist "server\wwwroot\index.html" goto build_server

echo        Building frontend...
pushd web
call npm install --silent
if errorlevel 1 goto build_failed
call npx vite build
if errorlevel 1 goto build_failed
popd

:build_server
echo.
echo [2/4] Building server...
dotnet build server\server.csproj -c Release --nologo -v q
if errorlevel 1 goto build_failed

echo [3/4] Starting server on %URL%
echo        The browser opens by itself once the server is up.
echo        Close this window or press Ctrl+C to stop.
echo.
dotnet run --project server\server.csproj -c Release --no-build --urls %URL%
goto done

:run_release
echo [1/2] Release mode detected.
echo [2/2] Starting CuBlocky.Server.exe on %URL%
echo.
CuBlocky.Server.exe --urls %URL%
goto done

:build_failed
echo.
echo  BUILD FAILED.
echo.
pause
exit /b 1

:done
echo.
echo  Server stopped.
pause
