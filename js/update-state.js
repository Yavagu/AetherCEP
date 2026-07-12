/* global require, process, BunBunMedia */
(function (api) {
  'use strict';

  function read(file) {
    try {
      var value = JSON.parse(require('fs').readFileSync(file, 'utf8'));
      return value && typeof value === 'object' ? value : null;
    } catch (e) { return null; }
  }

  function write(file, value) {
    var fs = require('fs'), path = require('path'), temporary = file + '.tmp-' + process.pid;
    if (!fs.existsSync(path.dirname(file))) fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2), 'utf8');
    try { fs.renameSync(temporary, file); }
    catch (e) {
      try { fs.unlinkSync(file); } catch (ignored) {}
      fs.renameSync(temporary, file);
    }
    return value;
  }

  function clear(file) {
    try { require('fs').unlinkSync(file); } catch (e) {}
  }

  function effectiveStatus(currentVersion, state) {
    if (!state || !api.versioning.valid(state.version)) return 'none';
    if (api.versioning.compare(currentVersion, state.version) >= 0) return 'installed';
    return /^(downloaded|launching|waiting|installing|failed)$/.test(state.status) ? state.status : 'none';
  }

  api.updateState = { read: read, write: write, clear: clear, effectiveStatus: effectiveStatus };
})(BunBunMedia);
