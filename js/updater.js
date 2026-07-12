/* global require, process, BunBunMedia */
(function (api) {
  'use strict';
  var LAST_CHECK_KEY = 'bunbunmedia.extensionUpdate.lastCheck';
  var SKIPPED_KEY = 'bunbunmedia.extensionUpdate.skippedVersion';
  var config, footerAction;

  function readConfig() {
    if (config) return config;
    try { config = JSON.parse(require('fs').readFileSync(require('path').join(api.root(), 'version.json'), 'utf8')); }
    catch (e) { config = { version: '0.0.0', channel: 'stable', repository: 'xosmos01-cyber/BunBunMedia' }; }
    return config;
  }

  function updateRoot() { return require('path').join(require('os').tmpdir(), 'BunBunMediaUpdate'); }
  function stateFile() { return require('path').join(updateRoot(), 'state.json'); }
  function pathsFor(version) {
    var path = require('path'), root = updateRoot(), folder = path.join(root, version);
    return {
      root: root,
      folder: folder,
      state: stateFile(),
      helper: path.join(root, 'Update-' + version + '.ps1'),
      log: path.join(root, 'BunBunMedia-update.log')
    };
  }

  function requestJson(url, done) {
    var https = require('https');
    https.get(url, { headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'bunbun-media-updater', 'X-GitHub-Api-Version': '2022-11-28' } }, function (response) {
      var body = '';
      if (response.statusCode !== 200) { response.resume(); done(new Error('GitHub returned HTTP ' + response.statusCode)); return; }
      response.on('data', function (chunk) { body += chunk; });
      response.on('end', function () { try { done(null, JSON.parse(body)); } catch (e) { done(e); } });
    }).on('error', done);
  }

  function asset(release, name) {
    var items = release.assets || [], i;
    for (i = 0; i < items.length; i += 1) if (items[i].name === name) return items[i];
    return null;
  }

  function download(url, destination, progress, done, redirects) {
    var https = require('https'), fs = require('fs'), count = redirects || 0;
    if (count > 5) { done(new Error('Too many download redirects.')); return; }
    https.get(url, { headers: { 'User-Agent': 'bunbun-media-updater' } }, function (response) {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume(); download(response.headers.location, destination, progress, done, count + 1); return;
      }
      if (response.statusCode !== 200) { response.resume(); done(new Error('Download returned HTTP ' + response.statusCode)); return; }
      var total = parseInt(response.headers['content-length'] || '0', 10), received = 0;
      var output = fs.createWriteStream(destination);
      response.on('data', function (chunk) { received += chunk.length; if (total && progress) progress(Math.round(received * 100 / total)); });
      response.pipe(output);
      output.on('finish', function () { output.close(function () { done(null); }); });
      output.on('error', function (error) { try { fs.unlinkSync(destination); } catch (e) {} done(error); });
    }).on('error', done);
  }

  function sha256(file) {
    var crypto = require('crypto'), fs = require('fs');
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toLowerCase();
  }

  function expectedDigest(releaseAsset, checksumText) {
    var digest = String(releaseAsset.digest || '').match(/^sha256:([a-f0-9]{64})$/i);
    if (digest) return digest[1].toLowerCase();
    digest = String(checksumText || '').match(/\b([a-f0-9]{64})\b/i);
    return digest ? digest[1].toLowerCase() : '';
  }

  function notice(message, actions, type) {
    var node = api.byId('update-notice');
    node.className = 'update-notice extension-update ' + (type || '');
    node.innerHTML = '';
    var copy = document.createElement('span'); copy.textContent = message; node.appendChild(copy);
    (actions || []).forEach(function (action) {
      var button = document.createElement('button'); button.type = 'button'; button.textContent = action.label;
      button.addEventListener('click', action.click); node.appendChild(button);
    });
  }

  function footer(message, state, action) {
    var button = api.byId('check-extension-update');
    if (!button) return;
    button.textContent = message;
    button.className = state || '';
    footerAction = action || null;
  }

  function stateValue(version, status, zip, digest, message, log) {
    return { version: version, status: status, package: zip, digest: digest, message: message || '', log: log || '', updatedAt: new Date().toISOString() };
  }

  function saveState(value) {
    try { api.updateState.write(stateFile(), value); return true; }
    catch (e) { notice('Could not save updater status: ' + e.message, [], 'error'); return false; }
  }

  function safePackage(file, version) {
    var path = require('path'), expected = path.resolve(pathsFor(version).folder) + path.sep;
    return path.resolve(String(file || '')).toLowerCase().indexOf(expected.toLowerCase()) === 0;
  }

  function openLog(file) {
    if (!file || !require('fs').existsSync(file)) return;
    try { var proc = require('child_process').spawn('notepad.exe', [file], { detached: true, stdio: 'ignore', windowsHide: false }); proc.unref(); } catch (e) {}
  }

  function failedState(version, zip, digest, message, log) {
    var value = stateValue(version, 'failed', zip, digest, message, log);
    saveState(value);
    renderState(value);
  }

  function launchInstaller(zip, digest, version) {
    var path = require('path'), fs = require('fs'), child = require('child_process'), paths = pathsFor(version);
    var expectedRoot = path.join(process.env.APPDATA || '', 'Adobe', 'CEP', 'extensions', 'BunBunMedia');
    if (path.resolve(api.root()).toLowerCase() !== path.resolve(expectedRoot).toLowerCase()) {
      notice('Update downloaded. Install BunBun Media with Setup.bat before using automatic updates.', [], 'warning'); return;
    }
    if (!api.versioning.valid(version) || !safePackage(zip, version) || !fs.existsSync(zip) || !/^[a-f0-9]{64}$/i.test(digest)) {
      notice('The pending update is incomplete or unsafe. Download it again.', [], 'error'); return;
    }
    var sourceScript = path.join(api.root(), 'updater', 'Update.ps1');
    if (!fs.existsSync(sourceScript)) { notice('The update helper is missing. Run Setup.bat from the latest release.', [], 'error'); return; }
    try {
      if (!fs.existsSync(paths.root)) fs.mkdirSync(paths.root, { recursive: true });
      fs.copyFileSync(sourceScript, paths.helper);
    } catch (e) { failedState(version, zip, digest, 'Could not prepare the installer: ' + e.message, paths.log); return; }

    var launching = stateValue(version, 'launching', zip, digest, 'Starting the external updater.', paths.log);
    if (!saveState(launching)) return;
    notice('Starting the BunBun Media updater…', [], 'downloading');
    footer('Starting updater', '');

    var executable = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    var args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', paths.helper, '-Package', zip, '-ExpectedSha256', digest, '-Destination', expectedRoot, '-Version', version, '-LogFile', paths.log, '-StateFile', paths.state];
    var settled = false, proc;
    function fail(message) { if (settled) return; settled = true; failedState(version, zip, digest, message, paths.log); }
    try {
      proc = child.spawn(executable, args, { cwd: paths.root, detached: true, stdio: 'ignore', windowsHide: true });
      proc.once('error', function (error) { fail('Could not start the updater: ' + error.message); });
      proc.once('exit', function (code) {
        var current = api.updateState.read(paths.state);
        if (current && current.status === 'failed') { renderState(current); return; }
        if (current && current.status === 'installed') { renderState(current); return; }
        if (code) { settled = false; fail('The updater exited before installation (code ' + code + ').'); }
      });
      proc.unref();
    } catch (e) { fail('Could not start the updater: ' + e.message); return; }

    var attempts = 0;
    (function confirmLaunch() {
      if (settled) return;
      var current = api.updateState.read(paths.state);
      if (current && /^(waiting|installing|installed)$/.test(current.status)) { settled = true; renderState(current); return; }
      if (current && current.status === 'failed') { settled = true; renderState(current); return; }
      attempts += 1;
      if (attempts >= 20) { fail('The updater process did not confirm that it started.'); return; }
      setTimeout(confirmLaunch, 250);
    })();
  }

  function stateActions(state, includeRetry) {
    var actions = [];
    if (includeRetry && state.package && state.digest) actions.push({ label: 'Retry installer', click: function () { launchInstaller(state.package, state.digest, state.version); } });
    if (state.log && require('fs').existsSync(state.log)) actions.push({ label: 'Open log', click: function () { openLog(state.log); } });
    actions.push({ label: 'Dismiss', click: function () { api.updateState.clear(stateFile()); footer('Check for updates', ''); api.show('update-notice', false); } });
    return actions;
  }

  function renderState(state) {
    var status = api.updateState.effectiveStatus(readConfig().version, state);
    if (status === 'none') return false;
    if (status === 'installed') {
      notice('BunBun Media ' + state.version + ' was installed successfully.', stateActions(state, false), 'ready');
      footer('You are on Latest Version', ''); return true;
    }
    if (status === 'downloaded') {
      notice('BunBun Media ' + state.version + ' is downloaded and verified.', [
        { label: 'Install after closing Premiere', click: function () { launchInstaller(state.package, state.digest, state.version); } },
        { label: 'Later', click: function () { localStorage.setItem(SKIPPED_KEY, state.version); api.updateState.clear(stateFile()); footer('Check for updates', ''); api.show('update-notice', false); } }
      ], 'ready');
      footer('An update is ready to install', 'update-ready', function () { launchInstaller(state.package, state.digest, state.version); }); return true;
    }
    if (status === 'failed') {
      notice('Update ' + state.version + ' failed: ' + (state.message || 'See the updater log for details.'), stateActions(state, true), 'error');
      footer('Update failed', 'update-error', function () { renderState(state); }); return true;
    }
    notice(status === 'installing' ? 'Installing BunBun Media ' + state.version + '…' : 'Updater started. Save your project, close Premiere Pro completely, and wait a few seconds before reopening it.', stateActions(state, false), 'ready');
    footer(status === 'installing' ? 'Installing update' : 'Close Premiere to install', 'update-ready'); return true;
  }

  function restoreState() {
    var state = api.updateState.read(stateFile());
    return state ? renderState(state) : false;
  }

  function prepare(release, version) {
    var path = require('path'), fs = require('fs'), paths = pathsFor(version);
    var zipName = 'BunBunMedia-update-' + version + '.zip', zipAsset = asset(release, zipName), checksumAsset = asset(release, zipName + '.sha256');
    if (!zipAsset) { notice('Version ' + version + ' is published without the required update package.', [], 'error'); return; }
    var zip = path.join(paths.folder, zipName), checksum = path.join(paths.folder, zipName + '.sha256');
    try { if (!fs.existsSync(paths.folder)) fs.mkdirSync(paths.folder, { recursive: true }); } catch (e) { notice('Could not create the update staging folder.', [], 'error'); return; }
    notice('Downloading BunBun Media ' + version + '… 0%', [], 'downloading');
    footer('Downloading update', '');
    download(zipAsset.browser_download_url, zip, function (percent) { notice('Downloading BunBun Media ' + version + '… ' + percent + '%', [], 'downloading'); }, function (zipError) {
      if (zipError) { notice('Update download failed: ' + zipError.message, [{ label: 'Retry', click: function () { prepare(release, version); } }], 'error'); return; }
      function verify(checksumText) {
        var expected = expectedDigest(zipAsset, checksumText), actual;
        if (!expected) { try { fs.unlinkSync(zip); } catch (e) {} notice('Update rejected: the release has no SHA-256 digest.', [], 'error'); return; }
        try { actual = sha256(zip); } catch (e) { notice('Could not verify the downloaded update.', [], 'error'); return; }
        if (actual !== expected) { try { fs.unlinkSync(zip); } catch (e) {} notice('Update rejected: checksum verification failed.', [], 'error'); return; }
        var ready = stateValue(version, 'downloaded', zip, expected, 'The update package is verified.', paths.log);
        if (saveState(ready)) renderState(ready);
      }
      if (zipAsset.digest) { verify(''); return; }
      if (!checksumAsset) { verify(''); return; }
      download(checksumAsset.browser_download_url, checksum, null, function (checksumError) {
        if (checksumError) { verify(''); return; }
        try { verify(fs.readFileSync(checksum, 'utf8')); } catch (e) { verify(''); }
      });
    });
  }

  function check(force) {
    var current = readConfig();
    footer('Checking for updates…', '');
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
    requestJson('https://api.github.com/repos/' + current.repository + '/releases/latest', function (error, release) {
      if (error) { footer('Check for updates', 'update-error'); if (force) notice('Could not check for updates: ' + error.message, [], 'error'); return; }
      var version = String(release.tag_name || '').replace(/^v/i, '');
      if (!api.versioning.valid(version) || api.versioning.compare(version, current.version) <= 0) { footer('You are on Latest Version', ''); if (force) notice('BunBun Media is up to date.', [], 'ready'); return; }
      if (!force && localStorage.getItem(SKIPPED_KEY) === version) { footer('Check for updates', ''); return; }
      prepare(release, version);
    });
  }

  api.extensionUpdater = { check: check, version: function () { return readConfig().version; }, restoreState: restoreState };
  var footerButton = api.byId('check-extension-update');
  if (footerButton) footerButton.addEventListener('click', function () { if (footerAction) footerAction(); else check(true); });
  if (!restoreState()) setTimeout(function () { check(false); }, 1200);
})(BunBunMedia);
