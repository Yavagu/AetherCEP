/* global CSInterface, SystemPath, require, process, __dirname */
var BunBunMedia = window.BunBunMedia || {};
(function (api) {
  'use strict';
  api.cs = new CSInterface();
  api.state = { format: 'video+audio', folder: '', latest: '', cookieFile: '' };
  api.byId = function (id) { return document.getElementById(id); };
  api.escapeHtml = function (value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); };
  api.root = function () { try { return __dirname.replace(/[\\/]js$/, ''); } catch (e) { return '.'; } };
  api.bin = function (name) { return require('path').join(api.root(), 'bin', name + (process.platform === 'win32' ? '.exe' : '')); };
  api.exists = function (file) { try { return require('fs').existsSync(file); } catch (e) { return false; } };
  api.hostCall = function (name, value, callback) {
    var arg = JSON.stringify(String(value || ''));
    api.cs.evalScript(name + '(' + arg + ')', callback || function () {});
  };
  api.show = function (id, visible) { api.byId(id).classList.toggle('hidden', !visible); };
  api.status = function (text, type) {
    var node = api.byId('status');
    node.textContent = text || '';
    node.className = text ? 'status-message ' + (type || 'info') : 'status-message hidden';
  };
  api.videoId = function (url) {
    var match = String(url).match(/[?&]v=([\w-]{11})/) || String(url).match(/(?:youtu\.be\/|shorts\/|embed\/)([\w-]{11})/);
    return match ? match[1] : '';
  };
  api.validUrl = function (url) { return /^(https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)[\w-]+/i.test(url); };
  api.defaultFolder = function () {
    try {
      var path = require('path'), fs = require('fs');
      var folder = path.join(require('os').homedir(), 'Desktop', 'YT Downloads');
      if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
      return folder;
    } catch (e) { return api.cs.getSystemPath(SystemPath.MY_DOCUMENTS); }
  };
})(BunBunMedia);
