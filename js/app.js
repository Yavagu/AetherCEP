/* global require, navigator, AetherCEP */
(function (api) {
  'use strict';
  var historyKey = 'aethercep.activity.v1', urlKey = 'aethercep.sourceUrl.v1', convertTimer = null, activeDownload = null;
  if (!localStorage.getItem(historyKey) && localStorage.getItem('bunbunmedia.activity.v2')) {
    try { localStorage.setItem(historyKey, localStorage.getItem('bunbunmedia.activity.v2')); } catch (e) {}
  }
  if (!localStorage.getItem(urlKey) && localStorage.getItem('bunbunmedia.sourceUrl.v1')) {
    try { localStorage.setItem(urlKey, localStorage.getItem('bunbunmedia.sourceUrl.v1')); } catch (e) {}
  }

  function saveUrl(value) {
    var url = String(value || '').trim();
    if (url) localStorage.setItem(urlKey, url); else localStorage.removeItem(urlKey);
  }

  function setProgress(percent, text) {
    if (percent !== null && percent !== undefined) { api.byId('progress-bar').style.width = Math.max(0, Math.min(100, percent)) + '%'; api.byId('progress-value').textContent = Math.round(percent) + '%'; }
    if (text) api.byId('progress-label').textContent = text;
  }
  function stopTicker() { if (convertTimer) { clearInterval(convertTimer); convertTimer = null; } api.byId('progress-bar').classList.remove('pulse'); }
  function startTicker() {
    if (convertTimer) return; var started = Date.now(); api.byId('progress-bar').classList.add('pulse');
    convertTimer = setInterval(function () { var elapsed = Math.floor((Date.now() - started) / 1000); api.byId('progress-label').textContent = 'Processing with ffmpeg — ' + Math.floor(elapsed / 60) + ':' + ('0' + elapsed % 60).slice(-2); api.byId('progress-value').textContent = '…'; }, 1000);
  }
  function setDownloadBusy(busy) {
    var button = api.byId('download');
    button.disabled = busy;
    var title = button.querySelector('.download-button-copy b');
    var detail = button.querySelector('.download-button-copy small');
    if (title) title.textContent = busy ? 'Downloading media' : 'Download media';
    if (detail) detail.textContent = busy ? 'Keep Premiere open while processing' : 'Ready to process';
    api.byId('cancel-download').disabled = !busy;
    api.byId('close-progress').disabled = busy;
  }
  function dismissReportForNewSource() {
    if (activeDownload) return;
    api.show('progress', false);
    api.show('result', false);
  }
  function copyOutput() {
    var output = api.byId('progress-log').textContent, button = api.byId('copy-output');
    if (!output) return;
    function done(ok) { api.status(ok ? 'Command output copied. Include it when reporting a problem.' : 'Could not copy the command output. Select it from Technical details instead.', ok ? 'success' : 'error'); if (ok) { button.textContent = 'Copied'; setTimeout(function () { button.textContent = 'Copy command output'; }, 1600); } }
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(output).then(function () { done(true); }).catch(function () { done(false); }); return; }
    var field = document.createElement('textarea'); field.value = output; field.style.position = 'fixed'; field.style.opacity = '0'; document.body.appendChild(field); field.select();
    try { done(document.execCommand('copy')); } catch (e) { done(false); }
    document.body.removeChild(field);
  }
  function history() { try { return JSON.parse(localStorage.getItem(historyKey) || '[]'); } catch (e) { return []; } }
  function addHistory(url, outcome, detail) {
    var entries = history(); entries.unshift({ url: url, format: api.state.format, outcome: outcome, detail: detail, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    localStorage.setItem(historyKey, JSON.stringify(entries.slice(0, 5))); renderHistory();
  }
  function renderHistory() {
    var node = api.byId('history'), entries = history(); node.innerHTML = '';
    if (!entries.length) { node.innerHTML = '<div class="empty-state compact-empty"><b>No recent activity</b></div>'; return; }
    entries.forEach(function (entry) {
      var item = document.createElement('div'); item.className = 'list-item';
      item.innerHTML = '<span class="activity-mark ' + (entry.outcome === 'success' ? 'ok' : 'fail') + '">' + (entry.outcome === 'success' ? '✓' : '×') + '</span><div class="item-body"><div class="item-title">' + api.escapeHtml(entry.url.replace(/^https?:\/\/(www\.)?youtube\.com\/watch\?v=/, 'youtu.be/')) + '</div><div class="item-detail">' + api.escapeHtml(entry.detail) + '</div></div><small>' + api.escapeHtml(entry.time) + '</small>';
      node.appendChild(item);
    });
  }
  function importMedia(file, timeline) {
    api.media.prepareForImport(file, {
      converting: function () { api.status('VP9 video detected. Converting a Premiere-compatible H.264 copy…', 'info'); },
      error: function (message) { api.status(message, 'error'); },
      ready: function (importFile, converted) {
        if (converted) { if (api.state.latest === file) api.state.latest = importFile; renderLibrary(); }
        api.hostCall(timeline ? 'importAndAddToTimeline' : 'importToBin', importFile, function (result) {
          api.status(result === 'true' ? (converted ? 'Converted VP9 to H.264 and imported successfully.' : (timeline ? 'Imported to the timeline.' : 'Added to the project bin.')) : 'Import failed: ' + result, result === 'true' ? 'success' : 'error');
        });
      }
    });
  }
  function renderLibrary() {
    var fs = require('fs'), path = require('path'), node = api.byId('library'); node.innerHTML = '';
    if (!api.state.folder || !fs.existsSync(api.state.folder)) { node.innerHTML = '<div class="empty-state"><span>!</span><b>Destination unavailable</b><small>Choose another download folder.</small></div>'; return; }
    try {
      var files = fs.readdirSync(api.state.folder).filter(function (name) { return api.media.extensions.some(function (ext) { return name.toLowerCase().endsWith(ext); }); });
      files.sort(function (a, b) { return fs.statSync(path.join(api.state.folder, b)).mtimeMs - fs.statSync(path.join(api.state.folder, a)).mtimeMs; });
      if (!files.length) { node.innerHTML = '<div class="empty-state"><span>▱</span><b>No downloaded media</b><small>Your completed files will appear here.</small></div>'; return; }
      files.forEach(function (name) {
        var file = path.join(api.state.folder, name), size = 0; try { size = fs.statSync(file).size / 1048576; } catch (e) {}
        var item = document.createElement('div'); item.className = 'list-item';
        var audio = /\.(mp3|m4a)$/i.test(name);
        item.innerHTML = '<span class="media-type ' + (audio ? 'audio' : 'video') + '">' + (audio ? 'A' : 'V') + '</span><div class="item-body"><div class="item-title" title="' + api.escapeHtml(name) + '">' + api.escapeHtml(name) + '</div><div class="item-detail">' + size.toFixed(1) + ' MB · ' + api.escapeHtml(require('path').extname(name).slice(1).toUpperCase()) + '</div></div>';
        var actions = document.createElement('div'); actions.className = 'item-actions';
        var timeline = document.createElement('button'); timeline.textContent = 'Timeline'; timeline.title = 'Add to active timeline'; timeline.addEventListener('click', function () { importMedia(file, true); });
        var bin = document.createElement('button'); bin.textContent = 'Project'; bin.title = 'Add to project bin'; bin.addEventListener('click', function () { importMedia(file, false); });
        actions.appendChild(timeline); actions.appendChild(bin); item.appendChild(actions); node.appendChild(item);
      });
    } catch (e) { node.innerHTML = '<div class="empty-state"><span>!</span><b>Could not read destination</b><small>' + api.escapeHtml(e.message) + '</small></div>'; }
  }
  function cookieGuide() {
    var source = api.byId('cookies').value, node = api.byId('cookie-help');
    node.className = 'inline-notice';
    api.show('check-cookies', !!source && (source !== '__file__' || !!api.state.cookieFile));
    if (!source) { api.show('cookie-help', false); return; }
    api.show('cookie-help', true);
    if (source !== '__file__') { node.textContent = 'Click Check to verify that yt-dlp can read your ' + source + ' YouTube session.'; return; }
    node.innerHTML = '<b>Cookie-file sign-in:</b> export YouTube cookies in Netscape cookies.txt format, then select the file.' + (api.state.cookieFile ? '<div class="ok">✓ ' + api.escapeHtml(api.state.cookieFile) + '</div>' : '');
    var extension = document.createElement('button'); extension.textContent = 'Cookie exporter'; extension.addEventListener('click', function () { api.cs.openURLInDefaultBrowser('https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc'); });
    var youtube = document.createElement('button'); youtube.textContent = 'Open YouTube'; youtube.addEventListener('click', function () { api.cs.openURLInDefaultBrowser('https://www.youtube.com'); });
    var pick = document.createElement('button'); pick.textContent = 'Select cookies.txt'; pick.addEventListener('click', function () { api.hostCall('browseForCookieFile', '', function (result) { if (result && result !== 'null') { api.state.cookieFile = result; cookieGuide(); } }); });
    node.appendChild(extension); node.appendChild(youtube); node.appendChild(pick);
  }
  function updateDownloader() {
    var notice = api.byId('update-notice'); api.show('update-notice', true); notice.textContent = 'Updating yt-dlp…';
    api.media.update(function (ok) { notice.textContent = ok ? '✓ Downloader is up to date.' : '⚠ Could not update yt-dlp. Run yt-dlp -U manually.'; if (ok) setTimeout(function () { api.show('update-notice', false); }, 4000); });
  }
  function clearSourceFormats() {
    var select = api.byId('quality'), group = select.querySelector('optgroup[data-source-formats]');
    if (group) select.removeChild(group);
    if (String(select.value).indexOf('source') === 0) select.value = 'best';
  }
  function refreshFormats() {
    var raw = api.byId('video-url').value.trim(), button = api.byId('refresh-formats'), select = api.byId('quality');
    if (!raw) { api.status('Paste a media URL before refreshing formats.', 'error'); api.byId('video-url').focus(); return; }
    if (!api.validUrl(raw)) { api.status('That is not a supported media URL.', 'error'); return; }
    button.disabled = true; button.classList.add('loading'); button.querySelector('span').textContent = 'Loading';
    api.status('Reading formats available for this URL…', 'info');
    api.media.listFormats(raw, function (ok, formats, message) {
      button.disabled = false; button.classList.remove('loading'); button.querySelector('span').textContent = 'Refresh';
      if (!ok) { api.status(message || 'Could not load formats for this URL.', 'error'); return; }
      var previous = select.value, existing = select.querySelector('optgroup[data-source-formats]');
      if (existing) select.removeChild(existing);
      var group = document.createElement('optgroup'); group.label = 'Formats available for this URL'; group.setAttribute('data-source-formats', 'true');
      formats.forEach(function (format) {
        var option = document.createElement('option');
        option.value = 'source-' + format.kind + ':' + format.id;
        option.textContent = api.media.formatLabel(format);
        option.title = 'Format ' + format.id + ' · ' + format.ext.toUpperCase() + ' · ' + format.description;
        group.appendChild(option);
      });
      select.appendChild(group);
      if (Array.prototype.some.call(select.options, function (option) { return option.value === previous; })) select.value = previous;
      api.status('Loaded ' + formats.length + ' formats. They are listed below the built-in quality presets.', 'success');
    });
  }
  function beginDownload() {
    var raw = api.byId('video-url').value.trim();
    if (!raw) { api.status('Enter a YouTube URL.', 'error'); return; } if (!api.validUrl(raw)) { api.status('That is not a supported YouTube URL.', 'error'); return; }
    saveUrl(raw);
    var section = null;
    if (api.byId('timestamp-enabled').checked) {
      section = api.timecode.range(api.byId('timestamp-start').value, api.byId('timestamp-end').value, api.byId('precise-cuts').checked);
      if (section.error) { api.status(section.error, 'error'); return; }
      if (!api.media.ffmpeg()) { api.status('Timestamp downloads require ffmpeg. Run Setup.bat to restore the bundled ffmpeg tools.', 'error'); return; }
    }
    if (api.state.format === 'video+audio' && !api.media.ffmpeg()) api.status('ffmpeg is missing; only a pre-merged fallback may work. Run Setup.bat to restore full quality.', 'error'); else api.status('', '');
    api.show('result', false); api.show('progress', true); api.byId('progress-log').textContent = ''; document.querySelector('.process-details').open = true; setDownloadBusy(true); setProgress(0, section ? 'Preparing clip ' + section.label + '…' : 'Starting download…');
    api.byId('copy-output').disabled = false;
    activeDownload = api.media.download(raw, api.byId('quality').value, section, {
      command: function (line) { var log = api.byId('progress-log'); log.textContent += (log.textContent ? '\n\n' : '') + '$ ' + line + '\n'; log.scrollTop = log.scrollHeight; },
      output: function (text, pct) { var log = api.byId('progress-log'); log.textContent += text; log.scrollTop = log.scrollHeight; if (/\[Merger\]|\[VideoConvertor\]|\[ExtractAudio\]/.test(text)) startTicker(); else if (pct !== null) setProgress(pct, 'Downloading…'); },
      retry: function (message) { stopTicker(); setProgress(0, message); },
      error: function (message) { activeDownload = null; stopTicker(); setDownloadBusy(false); setProgress(null, 'Download failed'); api.byId('progress-value').textContent = 'Error'; api.status(message, 'error'); addHistory(raw, 'error', (section ? section.label + ' • ' : '') + message); renderLibrary(); },
      cancelled: function () { activeDownload = null; stopTicker(); setDownloadBusy(false); setProgress(0, 'Download cancelled'); api.byId('progress-value').textContent = 'Cancelled'; api.status('Download cancelled. Incomplete files were removed.', 'info'); addHistory(raw, 'error', 'Download cancelled'); renderLibrary(); },
      success: function (file, resolution) {
        activeDownload = null; stopTicker(); api.state.latest = file; setDownloadBusy(false); setProgress(100, 'Download complete');
        var path = require('path'), fs = require('fs'), mb = (fs.statSync(file).size / 1048576).toFixed(1);
        api.byId('result-name').textContent = path.basename(file); api.byId('result-meta').textContent = mb + ' MB • ' + api.state.format.replace('+', ' + ') + (section ? ' • ' + section.label : '') + ' • ' + path.dirname(file); api.show('result', true); api.status((section ? 'Timestamped clip ' + section.label : 'Download') + ' complete' + (resolution ? ' (' + resolution + ')' : '') + '.', 'success'); addHistory(raw, 'success', (section ? 'Clip ' + section.label + ' • ' : '') + (resolution ? 'Downloaded at ' + resolution : 'Downloaded successfully')); renderLibrary();
      }
    });
  }
  function updateDynamicVisibility() {
    var raw = api.byId('video-url').value.trim();
    var isUppbeat = /uppbeat\.io\//i.test(raw) || /\.mp3(?:\?.*)?$/i.test(raw);
    api.show('format-card', !isUppbeat);
    api.show('clip-card', !isUppbeat);
  }

  function bindEvents() {
    api.byId('formats').addEventListener('click', function (event) { var button = event.target.closest('.format'); if (!button) return; Array.prototype.forEach.call(document.querySelectorAll('.format'), function (node) { node.classList.remove('selected'); node.setAttribute('aria-checked', 'false'); }); button.classList.add('selected'); button.setAttribute('aria-checked', 'true'); api.state.format = button.getAttribute('data-format'); });
    api.byId('refresh-formats').addEventListener('click', refreshFormats);
    api.byId('video-url').addEventListener('input', function () { saveUrl(this.value); clearSourceFormats(); dismissReportForNewSource(); updateDynamicVisibility(); });
    api.byId('clear-url').addEventListener('click', function () { api.byId('video-url').value = ''; saveUrl(''); clearSourceFormats(); dismissReportForNewSource(); updateDynamicVisibility(); api.byId('video-url').focus(); api.status('', ''); });
    api.byId('paste-url').addEventListener('click', function () { var input = api.byId('video-url'); if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(function (text) { input.value = text.trim(); saveUrl(input.value); clearSourceFormats(); dismissReportForNewSource(); updateDynamicVisibility(); }).catch(function () { input.focus(); api.status('Press Ctrl+V to paste.', 'info'); }); else { input.focus(); api.status('Press Ctrl+V to paste.', 'info'); } });
    api.byId('cookies').addEventListener('change', function () { clearSourceFormats(); cookieGuide(); }); api.byId('check-cookies').addEventListener('click', function () { var node = api.byId('cookie-help'); node.textContent = 'Checking account access…'; api.media.verifyCookies(function (ok, message) { node.className = 'inline-notice ' + (ok ? 'ok' : 'fail'); node.textContent = (ok ? '✓ ' : '× ') + message; }); });
    api.byId('timestamp-enabled').addEventListener('change', function () { api.show('timestamp-options', this.checked); if (this.checked) api.byId('timestamp-start').focus(); });
    api.byId('browse-folder').addEventListener('click', function () { api.hostCall('browseForFolder', '', function (result) { if (result && result !== 'null') { api.state.folder = result; api.byId('folder').textContent = result; renderLibrary(); } }); });
    api.byId('download').addEventListener('click', beginDownload); api.byId('cancel-download').addEventListener('click', function () { if (activeDownload) { api.byId('cancel-download').disabled = true; setProgress(null, 'Stopping download...'); activeDownload.cancel(); } }); api.byId('close-progress').addEventListener('click', function () { if (!activeDownload) api.show('progress', false); }); api.byId('copy-output').addEventListener('click', copyOutput); api.byId('import-latest').addEventListener('click', function () { if (api.state.latest) importMedia(api.state.latest, true); });
    api.byId('refresh-library').addEventListener('click', renderLibrary); api.byId('clear-history').addEventListener('click', function () { localStorage.removeItem(historyKey); renderHistory(); });
  }
  var initialized = false;
  function initialize() {
    if (!initialized) { api.state.folder = api.defaultFolder(); api.byId('folder').textContent = api.state.folder; api.byId('video-url').value = localStorage.getItem(urlKey) || ''; bindEvents(); initialized = true; }
    updateDynamicVisibility();
    renderHistory(); renderLibrary();
    api.media.checkUpdate(function (outdated) { if (outdated) updateDownloader(); });
  }
  initialize();
})(AetherCEP);
