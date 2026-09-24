@echo off
REM Double-click to publish IceT Play Designer to GitHub (github.com/jayalalj/IceTPlayDesigner-)
cd /d "%~dp0"
where git >nul 2>nul || (echo Git is not installed. Get it from https://git-scm.com/download/win & pause & exit /b 1)
echo Publishing IceT Play Designer to GitHub...
git -c safe.directory=* push -u origin main
if errorlevel 1 (echo. & echo Push failed - see the message above.) else (echo. & echo Done! The site updates at https://jayalalj.github.io/IceTPlayDesigner-/ in a minute or two.)
pause
