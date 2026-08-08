/* global CSInterface, SystemPath, require, process, __dirname */
var AetherCEP = window.AetherCEP || window.BunBunMedia || {};
window.AetherCEP = AetherCEP;
window.BunBunMedia = AetherCEP;
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
    var value = String(url || '').trim(), match;
    match = value.match(/[?&]v=([\w-]{11})(?:[&#]|$)/i) || value.match(/(?:youtu\.be\/|youtube\.com\/(?:shorts|embed)\/)([\w-]{11})(?:[/?#]|$)/i);
    if (match) return match[1];

    match = value.match(/instagram\.com\/(?:p|reel|reels|tv)\/([\w-]+)(?:[/?#]|$)/i) ||
      value.match(/instagram\.com\/stories\/[^/?#]+\/([\w-]+)(?:[/?#]|$)/i) ||
      value.match(/(?:www\.)?snapchat\.com\/(?:spotlight|t|add|story|stories|p)\/([\w-]+)(?:[/?#]|$)/i) ||
      value.match(/(?:story|t)\.snapchat\.com\/(?:p\/)?([\w-]+)(?:[/?#]|$)/i);
    if (match) return match[1];

    match = value.match(/uppbeat\.io\/(?:music\/tracks|t)\/([\w-]+)\/([\w-]+)(?:[/?#]|$)/i);
    if (match) return match[1] + '-' + match[2];

    if (/(?:^|\/\/)(?:www\.)?instagram\.com\//i.test(value) || /(?:^|\/\/)(?:www\.|story\.|t\.)?snapchat\.com\//i.test(value) || /uppbeat\.io\//i.test(value) || /\.mp3(?:\?|$)/i.test(value)) {
      try { return require('crypto').createHash('md5').update(value).digest('hex').slice(0, 11); } catch (e) { return ''; }
    }
    return '';
  };
  api.validUrl = function (url) {
    var value = String(url || '').trim();
    return /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?(?:[^#\s]*&)?v=|shorts\/|embed\/)|youtu\.be\/)[\w-]+(?:[/?&#]|$)/i.test(value) ||
      /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:(?:p|reel|reels|tv)\/[\w-]+|stories\/[^/?#\s]+\/[\w-]+)(?:[/?#]|$)/i.test(value) ||
      /^(?:https?:\/\/)?(?:(?:www\.)?snapchat\.com\/(?:spotlight|t|add|story|stories|p)\/|(?:story|t)\.snapchat\.com\/(?:p\/)?)[\w-]+(?:[/?#]|$)/i.test(value) ||
      /^(?:https?:\/\/)?(?:www\.)?uppbeat\.io\/(?:music\/tracks\/|t\/)[\w-]+\/[\w-]+(?:[/?#]|$)/i.test(value) ||
      /^https?:\/\/.*\.mp3(?:\?.*)?$/i.test(value);
  };
  api.defaultFolder = function () {
    try {
      var path = require('path'), fs = require('fs');
      var folder = path.join(require('os').homedir(), 'Desktop', 'YT Downloads');
      if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
      return folder;
    } catch (e) { return api.cs.getSystemPath(SystemPath.MY_DOCUMENTS); }
  };
})(AetherCEP);
