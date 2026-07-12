# User guide

## Install and open the panel

Download the packaged release archive, extract it, and run `Setup.bat`. Restart Premiere Pro after installation, then choose **Window > Extensions > BunBun Media**.

The installer places the extension at `%APPDATA%\Adobe\CEP\extensions\BunBunMedia`. It also enables unsigned CEP extensions for the current Windows user. Administrator access is normally unnecessary.

## Download media

1. Paste one YouTube video, Short, or livestream URL. Playlists are intentionally ignored.
2. Choose **Video + Audio**, **Audio Only**, or **Video Only**.
3. Select a maximum resolution. **Best compatible** is capped at 1080p for reliable Premiere compatibility; 1440p and 2160p may require conversion and take longer.
4. Choose the output folder. The initial default is `Desktop\YT Downloads`.
5. Select **Download media** and keep Premiere open until processing finishes.

Completed media is validated when ffprobe is available. The library lists supported media in the selected folder, and activity history keeps the five most recent outcomes in local panel storage.

## Timestamped clips

Enable **Download only a timestamp range**, then provide a start, an end, or both.

| Input | Meaning |
| --- | --- |
| `90` | 1 minute 30 seconds |
| `2:15` | 2 minutes 15 seconds |
| `1:20:00` | 1 hour 20 minutes |
| blank start, `2:15` end | Beginning through 2:15 |
| `10:00` start, blank end | 10:00 through the end |

The end must be later than the start. Active livestream clips are measured from the beginning of the stream. **Precise cuts** asks FFmpeg to force keyframes at the cut boundaries; it can improve accuracy but may require slower re-encoding.

## Account access and cookies

Public videos usually work with **None** selected. For content your account is permitted to access:

- Select Firefox, Chrome, Edge, Brave, or Opera to let yt-dlp read that browser's session.
- Close the browser first if its cookie database is locked.
- Firefox is often more reliable when Chromium cookie encryption blocks access.
- Alternatively, export a Netscape-format `cookies.txt`, select it in the panel, and use **Check**.

A cookie file represents your signed-in session. Store it securely, never share it, and delete it when it is no longer required. BunBun Media does not need or ask for your YouTube password.

## Import into Premiere

After a successful download:

- **Import to project** adds the file to the open project's root bin.
- **Add to timeline** imports it and inserts it after the last clip on video track 1 of the active sequence. Linked audio follows where Premiere supports it.

Open a project before importing. Open or create a sequence with at least one video track before adding to the timeline.

## Maintenance

- `Diagnose.bat` shows available formats and simulates format selection for a URL.
- `FixCache.bat` clears matching CEP caches. Close Premiere before running it.
- The panel checks for a newer yt-dlp release and can update the installed executable.
- BunBun Media checks for a newer stable extension release at most once every 12 hours. It downloads and verifies updates in the background, then asks you to save your work and close Premiere before installation.
- `UNINSTALL.bat` removes only `%APPDATA%\Adobe\CEP\extensions\BunBunMedia`. Downloads and Premiere project files are not removed.

### Installing an automatic update

1. Wait until the update notice says the package is downloaded and verified.
2. Select **Update & restart**.
3. Save the active Premiere project and close Premiere Pro completely.
4. The external updater replaces the extension and preserves the installed `bin` tools.
5. Reopen Premiere and the BunBun Media panel.

The update log is written to `%TEMP%\BunBunMedia-update.log`. If installation fails, the updater restores the previous extension automatically. Automatic installation is disabled when the panel is running from a development folder rather than the standard CEP installation path.

For errors and recovery steps, see [Troubleshooting](TROUBLESHOOTING.md).
