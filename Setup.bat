@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Setup.ps1"
if errorlevel 1 echo Setup ended with an error. Review the message above.
pause
