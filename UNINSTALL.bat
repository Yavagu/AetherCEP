@echo off
setlocal
set "DEST=%APPDATA%\Adobe\CEP\extensions\BunBunMedia"
echo Removing BunBun Media...
if exist "%DEST%" rmdir /s /q "%DEST%"
echo Complete. Restart Premiere Pro.
pause
