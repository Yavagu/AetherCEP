/* global require, AetherCEP */
(function (api) {
  'use strict';
  var RELEASES_URL = 'https://github.com/Yavagu/AetherCEP/releases';
  var config, availableVersion = '';

  function readConfig() {
    if (config) return config;
    try { config = JSON.parse(require('fs').readFileSync(require('path').join(api.root(), 'version.json'), 'utf8'));
    } catch (e) { config = { version: '0.0.0', repository: 'Yavagu/AetherCEP' }; }
    return config;
  }

  function requestLatest(repository, done) {
    var https = require('https');
    var finished = false;
    function finish(error, release) {
      if (finished) return;
      finished = true;
      done(error, release);
    }
    var request = https.get('https://api.github.com/repos/' + repository + '/releases/latest', {
      headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'aether-cep-update-check', 'X-GitHub-Api-Version': '2022-11-28' }
    }, function (response) {
      var body = '';
      if (response.statusCode !== 200) { response.resume(); finish(new Error('GitHub returned HTTP ' + response.statusCode)); return; }
      response.on('data', function (chunk) {
        body += chunk;
        if (body.length > 1048576) {
          finish(new Error('GitHub returned an unexpectedly large response.'));
          if (request.destroy) request.destroy();
        }
      });
      response.on('error', finish);
      response.on('end', function () { try { finish(null, JSON.parse(body)); } catch (e) { finish(e); } });
    });
    request.on('error', finish);
    if (request.setTimeout) request.setTimeout(10000, function () {
      if (request.destroy) request.destroy();
      finish(new Error('GitHub update check timed out.'));
    });
  }

  function openReleases() { api.cs.openURLInDefaultBrowser(RELEASES_URL); }

  function footer(text, state) {
    var button = api.byId('check-extension-update');
    if (!button) return;
    button.disabled = false;
    button.textContent = text;
    button.className = state || '';
  }

  function notice(message, type, withLink) {
    var node = api.byId('update-notice');
    node.className = 'update-notice extension-update ' + (type || '');
    node.innerHTML = '';
    var copy = document.createElement('span'); copy.textContent = message; node.appendChild(copy);
    if (withLink) {
      var button = document.createElement('button'); button.type = 'button'; button.textContent = 'Download update ZIP';
      button.addEventListener('click', openReleases); node.appendChild(button);
    }
  }

  function check(manual) {
    var current = readConfig(), button = api.byId('check-extension-update');
    availableVersion = '';
    if (button) { button.disabled = true; button.textContent = 'Checking for updates…'; button.className = ''; }
    requestLatest(current.repository, function (error, release) {
      if (error) {
        footer('Check for updates', 'update-error');
        if (manual) notice('Could not check GitHub for updates: ' + error.message, 'error', false);
        return;
      }
      var version = String(release.tag_name || '').replace(/^v/i, '');
      if (!api.versioning.valid(version)) {
        footer('Check for updates', 'update-error');
        if (manual) notice('GitHub returned an invalid release version.', 'error', false);
        return;
      }
      if (api.versioning.compare(version, current.version) <= 0) {
        footer('You are on Latest Version', '');
        if (manual) notice('AetherCEP is up to date.', 'ready', false);
        return;
      }
      availableVersion = version;
      footer('Update ' + version + ' available', 'update-ready');
      notice('AetherCEP ' + version + ' is available. Download the update from GitHub Releases.', 'ready', true);
    });
  }

  api.extensionUpdateCheck = { check: check, releaseUrl: RELEASES_URL };
  var footerButton = api.byId('check-extension-update');
  if (footerButton) footerButton.addEventListener('click', function () { if (availableVersion) openReleases(); else check(true); });
  setTimeout(function () { check(false); }, 1200);
})(AetherCEP);
