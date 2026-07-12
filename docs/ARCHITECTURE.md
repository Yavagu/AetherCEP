# Architecture

BunBun Media is an Adobe CEP panel with three execution layers:

```text
Panel UI (HTML/CSS + js/app.js)
    │
    ├── js/core.js / js/timecode.js
    │       State, validation, CEP helpers, pure timestamp logic
    │
    ├── js/media.js ──> yt-dlp ──> Deno / FFmpeg / ffprobe
    │       Download process, retries, conversion, validation
    │
    └── CSInterface.evalScript()
            │
            └── jsx/main.jsx ──> Premiere Pro project and sequence APIs
```

## Panel layer

`index.html` defines the panel, `css/app.css` styles it, and `js/app.js` binds controls, progress, local history, the output library, and import actions. `js/core.js` owns shared state, validates supported URLs, resolves bundled tools, and wraps CEP host calls.

`js/timecode.js` is intentionally independent of the DOM-heavy workflow so it can be tested in Node through a VM context.

## Media layer

`js/media.js` constructs argument arrays and launches yt-dlp without a command shell. It chooses formats based on media type, maximum quality, and FFmpeg availability. It can retry without inaccessible browser cookies, choose a compatible stream after format failures, and try a public age-gate extractor fallback. Successful video output is checked with ffprobe when available.

## Host layer

`jsx/main.jsx` runs inside Premiere's ExtendScript engine. It selects folders, selects cookie files, imports media into the root project bin, and inserts a clip after the last clip on video track 1.

## Installation

`CSXS/manifest.xml` declares Premiere 13.0+ and enables CEP's Node runtime. `Setup.ps1` enables the required per-user debug flags and copies the release contents into Adobe's per-user CEP extension directory.

## Extension updates

`version.json` is the canonical installed version. `js/version.js` provides dependency-free semantic version comparison, while `js/updater.js` checks the repository's latest stable GitHub Release, downloads the matching update asset into `%TEMP%`, and validates SHA-256 before enabling installation.

`js/update-state.js` persists the updater handoff under the user's temporary directory. The panel records verified downloads, confirms that the external helper started, and restores waiting, failure, or success details on the next launch instead of downloading the same release again.

`updater/Update.ps1` is copied outside the installed extension before launch so it remains available while the extension directory is replaced. It writes durable waiting, installing, installed, and failed states plus an append-only log; waits for Premiere to close; rejects archive traversal paths; extracts into staging; verifies required files and versions; preserves installed runtime tools; and swaps the staged directory into place. The previous installation is kept as a temporary backup and restored if the swap fails.

## Trust boundaries

URLs, filesystem paths, yt-dlp output, browser cookies, and imported files are untrusted inputs. Keep process invocation shell-free, escape text placed into HTML, pass host values through JSON serialization, avoid logging secrets, and validate completed output before import.
