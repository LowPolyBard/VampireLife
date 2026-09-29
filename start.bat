@echo off
rem ==========================================================
rem  Crimson Centuries - double-click to play
rem  Serves the game locally and opens it in your browser.
rem ==========================================================
cd /d "%~dp0"
title Crimson Centuries
set PORT=8123
set URL=http://localhost:%PORT%/index.html

rem Open the browser a moment after the server starts
start "" cmd /c "timeout /t 2 /nobreak >nul & start "" %URL%"

where python >nul 2>nul
if %errorlevel%==0 (
  echo Crimson Centuries is running at %URL%
  echo Close this window to stop the game server.
  python -m http.server %PORT%
  goto :eof
)

where py >nul 2>nul
if %errorlevel%==0 (
  echo Crimson Centuries is running at %URL%
  echo Close this window to stop the game server.
  py -m http.server %PORT%
  goto :eof
)

where npx >nul 2>nul
if %errorlevel%==0 (
  echo Crimson Centuries is running at %URL%
  echo Close this window to stop the game server.
  npx --yes http-server -p %PORT% -c-1 .
  goto :eof
)

rem No Python or Node: open the file directly (works in most browsers)
echo Python or Node.js not found - opening the game file directly.
start "" "%~dp0index.html"
