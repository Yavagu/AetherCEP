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

  function launchInstaller(zip, digest, version) {
    var path = require('path'), os = require('os'), child = require('child_process');
    var expectedRoot = path.join(process.env.APPDATA || '', 'Adobe', 'CEP', 'extensions', 'BunBunMedia');
    if (path.resolve(api.root()).toLowerCase() !== path.resolve(expectedRoot).toLowerCase()) {
      notice('Update downloaded. Install BunBun Media with Setup.bat before using automatic updates.', [], 'warning'); return;
    }
    var script = path.join(api.root(), 'updater', 'Update.ps1');
    if (!require('fs').existsSync(script)) { notice('The update helper is missing. Run Setup.bat from the latest release.', [], 'error'); return; }
    var args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-Package', zip, '-ExpectedSha256', digest, '-Destination', expectedRoot, '-Version', version, '-LogFile', path.join(os.tmpdir(), 'BunBunMedia-update.log')];
    try {
      var proc = child.spawn('powershell.exe', args, { detached: true, stdio: 'ignore', windowsHide: true }); proc.unref();
      notice('Updater is ready. Save your project and close Premiere Pro to install ' + version + '.', [], 'ready');
      footer('Close Premiere to finish update', 'update-ready');
    } catch (e) { notice('Could not start the updater: ' + e.message, [], 'error'); }
  }

  function prepare(release, version) {
    var path = require('path'), os = require('os'), fs = require('fs');
    var zipName = 'BunBunMedia-update-' + version + '.zip', zipAsset = asset(release, zipName), checksumAsset = asset(release, zipName + '.sha256');
    if (!zipAsset) { notice('Version ' + version + ' is published without the required update package.', [], 'error'); return; }
    var folder = path.join(os.tmpdir(), 'BunBunMediaUpdate', version), zip = path.join(folder, zipName), checksum = path.join(folder, zipName + '.sha256');
    try { if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true }); } catch (e) { notice('Could not create the update staging folder.', [], 'error'); return; }
    notice('Downloading BunBun Media ' + version + '… 0%', [], 'downloading');
    footer('Downloading update', '');
    download(zipAsset.browser_download_url, zip, function (percent) { notice('Downloading BunBun Media ' + version + '… ' + percent + '%', [], 'downloading'); }, function (zipError) {
      if (zipError) { notice('Update download failed: ' + zipError.message, [{ label: 'Retry', click: function () { prepare(release, version); } }], 'error'); return; }
      function verify(checksumText) {
        var expected = expectedDigest(zipAsset, checksumText), actual;
        if (!expected) { try { fs.unlinkSync(zip); } catch (e) {} notice('Update rejected: the release has no SHA-256 digest.', [], 'error'); return; }
        try { actual = sha256(zip); } catch (e) { notice('Could not verify the downloaded update.', [], 'error'); return; }
        if (actual !== expected) { try { fs.unlinkSync(zip); } catch (e) {} notice('Update rejected: checksum verification failed.', [], 'error'); return; }
        footer('An update is ready to Install', 'update-ready', function () { launchInstaller(zip, expected, version); });
        notice('BunBun Media ' + version + ' is downloaded and verified.', [
          { label: 'Update & restart', click: function () { launchInstaller(zip, expected, version); } },
          { label: 'Later', click: function () { localStorage.setItem(SKIPPED_KEY, version); footer('Check for updates', ''); api.show('update-notice', false); } }
        ], 'ready');
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

  api.extensionUpdater = { check: check, version: function () { return readConfig().version; } };
  var footerButton = api.byId('check-extension-update');
  if (footerButton) footerButton.addEventListener('click', function () { if (footerAction) footerAction(); else check(true); });
  setTimeout(function () { check(false); }, 1200);
})(BunBunMedia);
