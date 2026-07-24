@echo off
setlocal
set "BIN=%APPDATA%\Adobe\CEP\extensions\AetherCEP\bin"
set "YTDLP=%BIN%\yt-dlp.exe"
if not exist "%YTDLP%" set "YTDLP=yt-dlp"
set "PATH=%BIN%;%PATH%"
echo AetherCEP diagnostics
set /p "URL=Paste a YouTube URL: "
"%YTDLP%" --version
"%YTDLP%" --no-playlist -F "%URL%"
"%YTDLP%" --no-playlist -f "bestvideo+bestaudio/best" --simulate --print "Selected: %%(resolution)s codec: %%(vcodec)s bitrate: %%(tbr)sk" "%URL%"
pause
