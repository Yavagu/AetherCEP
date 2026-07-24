@echo off
setlocal
set "DEST=%APPDATA%\Adobe\CEP\extensions\AetherCEP"
echo Removing AetherCEP...
if exist "%DEST%" rmdir /s /q "%DEST%"
echo Complete. Restart Premiere Pro.
pause
