# Development guide

## Prerequisites

- Windows 10 or 11
- Adobe Premiere Pro 2019 or newer
- Node.js 18 or newer for tests
- yt-dlp, Deno, FFmpeg, and ffprobe for full manual testing

## Run tests

There are no npm runtime dependencies.

```powershell
npm test
```

The test loads `js/timecode.js` into a Node VM and checks valid, invalid, open-ended, and multi-hour ranges.

## Install a working tree

The normal installer copies the entire directory. Place the runtime executables in `bin\`, then run `Setup.bat`. The installer downloads yt-dlp and Deno when absent, but a complete FFmpeg/ffprobe pair must be bundled or installed separately and discoverable on `PATH`.

After a change, rerun setup or copy the changed source files to `%APPDATA%\Adobe\CEP\extensions\BunBunMedia`. Close Premiere and run `FixCache.bat` if cached panel code persists.

Useful debugging locations vary by Premiere/CEP version. Enable **Verbose technical output** in the panel for yt-dlp logs. Keep all logs sanitized before sharing.

## Compatibility rules

- Panel code must remain compatible with CEP's older Chromium and Node runtimes.
- ExtendScript is not modern browser JavaScript; keep `jsx/main.jsx` conservative.
- Pass subprocess arguments as arrays, never through a shell-built command string.
- Test paths containing spaces and non-ASCII characters.
- Test public downloads without cookies as well as authenticated flows.
- Treat cookies and private URLs as secrets.

## Building a release

1. Update `version` in `package.json` and both version fields in `CSXS/manifest.xml`.
2. Run `npm test` and manually test install, download, cancel, timestamp clipping, project import, and timeline insertion.
3. Create a clean staging directory containing the source files needed at runtime, maintenance scripts, documentation, and `bin\`.
4. Add current Windows x64 builds named `yt-dlp.exe`, `deno.exe`, `ffmpeg.exe`, and `ffprobe.exe`.
5. Verify every third-party license and include any required license texts. Update `THIRD_PARTY_NOTICES.md` when components or distributors change.
6. Scan the staging directory for cookies, downloaded media, logs, personal paths, and secrets.
7. Create `BunBunMedia.zip`, install from that ZIP on a clean test account, and verify checksums.
8. Attach the ZIP and a SHA-256 checksum to a GitHub Release. Do not commit the ZIP or executables to normal Git history.

Example checksum command:

```powershell
Get-FileHash .\BunBunMedia.zip -Algorithm SHA256
```

GitHub's generated source archives intentionally lack runtime executables and are not end-user installers.
