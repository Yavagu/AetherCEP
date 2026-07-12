@echo off
setlocal
tasklist /FI "IMAGENAME eq Adobe Premiere Pro.exe" 2>nul | find /I "Adobe Premiere Pro.exe" >nul
if not errorlevel 1 (
  echo Close Premiere Pro before clearing its CEP cache.
  pause
  exit /b 1
)
for /d %%D in ("%LOCALAPPDATA%\Temp\cep_cache\*bunbunmedia*") do rmdir /s /q "%%D"
echo CEP cache cleared.
pause
