const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function loadCore() {
  const api = {};
  function CSInterface() {}
  CSInterface.prototype.getSystemPath = () => '.';
  const context = { window: { AetherCEP: api }, AetherCEP: api, BunBunMedia: api, CSInterface, SystemPath: {}, document: { getElementById: () => ({}) }, require };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/core.js', 'utf8'), context);
  return api;
}

function loadMedia(api) {
  const fields = { cookies: { value: '' }, verbose: { checked: false } };
  api.byId = id => fields[id] || { value: '', checked: false };
  api.bin = name => name + '.exe';
  api.exists = file => file === 'yt-dlp.exe';
  api.root = () => '.';
  api.state = { format: 'audio', folder: '.' };

  const context = { AetherCEP: api, BunBunMedia: api, require, process: { env: {}, platform: 'win32' } };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/media.js', 'utf8'), context);
  return api.media;
}

// 1. Test URL Validation & Video ID Extraction
const core = loadCore();

const trackUrl1 = 'https://uppbeat.io/music/tracks/simon-folwar/operation-frostfall';
const trackUrl2 = 'https://uppbeat.io/t/simon-folwar/operation-frostfall';
const directMp3Url = 'https://cdn.uppbeat.io/audio-files/0e5573c69208594d8a7e799df2ff2bcc/b5d604dde1721ee4425f938a1cecb8b0/b17ffb1a8312f22d6cb667e4181fcf1d/STREAMING-operation-frostfall-simon-folwar-main-version-47310-02-34.mp3';
const invalidUrl = 'https://example.com/some-audio.wav';

assert.strictEqual(core.validUrl(trackUrl1), true, 'Track URL 1 should be valid');
assert.strictEqual(core.validUrl(trackUrl2), true, 'Track URL 2 should be valid');
assert.strictEqual(core.validUrl(directMp3Url), true, 'Direct MP3 URL should be valid');
assert.strictEqual(core.validUrl(invalidUrl), false, 'Invalid URL should be rejected');

assert.strictEqual(core.videoId(trackUrl1), 'simon-folwar-operation-frostfall', 'Video ID for Track 1');
assert.strictEqual(core.videoId(trackUrl2), 'simon-folwar-operation-frostfall', 'Video ID for Track 2');
assert.ok(core.videoId(directMp3Url).length > 0, 'Direct MP3 should yield a hash ID');

// 2. Test Media Resolution & Format Listing
const media = loadMedia(core);

media.listFormats(trackUrl1, (ok, formats) => {
  assert.strictEqual(ok, true, 'listFormats should succeed for Uppbeat URLs');
  assert.strictEqual(formats.length, 1, 'Should return 1 format');
  assert.strictEqual(formats[0].ext, 'mp3', 'Format extension should be mp3');
  assert.strictEqual(formats[0].kind, 'audio', 'Format kind should be audio');
});

media.resolveUppbeatUrl(directMp3Url, (ok, audioUrl, title) => {
  assert.strictEqual(ok, true, 'resolveUppbeatUrl for direct MP3 should succeed');
  assert.strictEqual(audioUrl, directMp3Url, 'Direct MP3 URL should pass through');
  assert.ok(title.length > 0, 'Title should be extracted');
});

let outputLogged = false;
media.resolveUppbeatUrl(directMp3Url, {
  output: text => { outputLogged = true; }
}, (ok, audioUrl, title) => {
  assert.strictEqual(ok, true);
  assert.strictEqual(outputLogged, true, 'Output should be logged to handlers');
});

console.log('Uppbeat tests passed successfully!');
