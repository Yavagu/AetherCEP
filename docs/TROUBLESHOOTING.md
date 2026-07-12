# Troubleshooting

## The panel is missing

1. Confirm Premiere Pro 2019 or newer is installed.
2. Run `Setup.bat` again and check that it completes.
3. Confirm `%APPDATA%\Adobe\CEP\extensions\BunBunMedia\CSXS\manifest.xml` exists.
4. Restart Premiere completely, then check **Window > Extensions**.
5. Close Premiere, run `FixCache.bat`, and reopen it.

## A download fails

- Confirm the URL is for a single YouTube video, Short, or livestream.
- Retry a public video with account access set to **None**.
- Check the connection and wait before retrying if YouTube reports rate limiting.
- Run `Diagnose.bat` and enter the same URL.
- Enable technical output in the panel and copy the sanitized log into a bug report.
- Re-run setup if yt-dlp, FFmpeg, or Deno is reported missing.

Do not post cookies, account identifiers, private URLs, or local usernames. Replace them with `<redacted>`.

## Browser sign-in fails

Close the browser and retry. If Chromium reports DPAPI or decryption errors, use Firefox or export a Netscape-format `cookies.txt`. Verify that the selected account is actually allowed to view the media.

## The requested quality is unavailable

Not every video has every resolution or codec. BunBun Media automatically tries a compatible fallback. Higher resolutions often provide separate audio/video streams and therefore need FFmpeg. Run `Diagnose.bat` to see the formats YouTube currently exposes.

## The clip boundary is not exact

Normal cuts begin near a source keyframe. Enable **Precise cuts** for closer boundaries; processing will be slower. Very recent livestream content may not yet be available from the requested point.

## Import fails

- Open a Premiere project before importing.
- For timeline insertion, open a sequence with video track 1.
- Confirm the downloaded file still exists and is readable.
- Try **Import to project** first; Premiere may reject a codec even when the download itself succeeded.

## Collect useful diagnostics

Include BunBun Media version, Windows version, Premiere version, expected and actual behavior, exact reproduction steps, whether a public URL reproduces the issue, and sanitized technical output. Screenshots should hide account and filesystem details.

## An extension update fails

- Confirm the release contains `BunBunMedia-update-VERSION.zip` and its `.sha256` file.
- Save the project and close every Premiere Pro process after selecting **Update & restart**.
- Review `%TEMP%\BunBunMedia-update.log` for the exact failure.
- Run `Setup.bat` from a full release package if the update helper is missing.
- Automatic updates only install into `%APPDATA%\Adobe\CEP\extensions\BunBunMedia`.

Checksum or unsafe-archive errors are intentionally not bypassed. Download the release again or wait for a corrected release.
