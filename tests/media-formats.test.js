const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const EventEmitter = require('events');

function child() {
  const process = new EventEmitter();
  process.stdout = new EventEmitter();
  process.stderr = new EventEmitter();
  return process;
}

function loadMedia(spawn, withFfmpeg) {
  const fields = { cookies: { value: '' }, verbose: { checked: false } };
  const api = {
    bin: name => name + '.exe', exists: file => file === 'yt-dlp.exe' || (withFfmpeg && file === 'ffmpeg.exe'), root: () => '.',
    videoId: () => 'DaVOaNCMjEB', state: { format: 'video+audio', folder: '.' },
    byId: id => fields[id] || { value: '', checked: false }
  };
  const localRequire = name => name === 'child_process' ? { spawn, spawnSync: () => ({ status: 1 }) } : require(name);
  const context = { AetherCEP: api, BunBunMedia: api, require: localRequire, process: { env: {}, platform: 'win32' } };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/media.js', 'utf8'), context);
  return api.media;
}

{
  const processes = [];
  const calls = [];
  const media = loadMedia((executable, args) => { calls.push({ executable, args }); const proc = child(); processes.push(proc); return proc; });
  let result;
  media.listFormats('https://www.instagram.com/reels/DaVOaNCMjEB/', (ok, formats, message) => { result = { ok, formats, message }; });
  assert.ok(calls[0].args.includes('--list-formats'));
  processes[0].stdout.emit('data', Buffer.from(
    '[info] Available formats:\n' +
    'ID      EXT   RESOLUTION FPS CH │ FILESIZE TBR PROTO │ VCODEC       VBR ACODEC     ABR MORE INFO\n' +
    '────────────────────────────────────────────────────────────────────────────────────────────────\n' +
    'dash-1  mp4   720x1280     30    │  2.50MiB 900k https │ avc1.64001f 900k video only\n' +
    'audio-0 m4a   audio only      2 │  1.00MiB 128k https │ audio only        mp4a.40.2 128k\n'
  ));
  processes[0].emit('close', 0);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.formats.length, 2);
  assert.strictEqual(result.formats[0].id, 'dash-1');
  assert.strictEqual(result.formats[0].kind, 'video');
  assert.strictEqual(result.formats[1].kind, 'audio');
  assert.strictEqual(media.formatLabel(result.formats[0]), '720 × 1280 · Video only · 900 kbps · MP4');
  assert.strictEqual(media.formatLabel(result.formats[1]), 'Audio only · 128 kbps · M4A');
  assert.ok(result.formats[0].description.includes('video only'));
}

{
  const media = loadMedia(() => child());
  assert.strictEqual(media.formatLabel({ id: '2', ext: 'mp4', kind: 'mixed', resolution: '', bitrate: '' }), 'Source format 2 · MP4');
}

{
  const calls = [];
  const media = loadMedia((executable, args) => { calls.push({ executable, args }); return child(); }, true);
  media.download('https://www.instagram.com/reels/DaVOaNCMjEB/', 'source-video:dash-1', null, { command: () => {}, output: () => {}, error: () => {}, success: () => {} });
  const formatAt = calls[0].args.indexOf('-f');
  assert.strictEqual(calls[0].args[formatAt + 1], 'dash-1+bestaudio[ext=m4a]/dash-1+bestaudio/dash-1');
  assert.ok(calls[0].args.includes('--merge-output-format'));
  assert.ok(!calls[0].args.some(value => /height<=/.test(value)), 'exact source formats must bypass preset filters');
}

console.log('Media format tests passed');
