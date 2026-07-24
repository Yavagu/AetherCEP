const assert = require('assert');
const EventEmitter = require('events');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

function loadMedia(spawn, folder = '.') {
  const api = {
    bin: name => name + '.exe',
    exists: file => file === 'yt-dlp.exe',
    root: () => '.',
    videoId: () => 'aqz-KE-bpKQ',
    state: { format: 'video+audio', folder },
    byId: () => ({ value: '', checked: false })
  };
  const localRequire = name => name === 'child_process' ? { spawn, spawnSync: () => ({ status: 1 }) } : require(name);
  const context = { AetherCEP: api, BunBunMedia: api, require: localRequire, process: { env: {}, platform: 'win32' } };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/media.js', 'utf8'), context);
  return api.media;
}

{
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'aether-cleanup-'));
  const completed = path.join(folder, 'completed.webm');
  const partial = path.join(folder, 'download.webm.part');
  fs.writeFileSync(completed, 'complete');
  fs.writeFileSync(partial, 'partial');
  try {
    const process = new EventEmitter();
    process.pid = 123;
    process.stdout = new EventEmitter();
    process.stderr = new EventEmitter();
    const media = loadMedia(() => process, folder);
    media.download('https://youtu.be/aqz-KE-bpKQ', 'best', null, {
      command: () => {}, output: () => {}, error: () => {}, success: () => {}, cancelled: () => {}
    }).cancel();
    assert.strictEqual(fs.existsSync(completed), true, 'cleanup must preserve completed WebM media');
    assert.strictEqual(fs.existsSync(partial), false, 'cleanup must remove yt-dlp partial files');
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
}

{
  const media = loadMedia(() => { throw new Error('missing executable'); });
  let result;
  media.update((ok, message) => { result = { ok, message }; });
  assert.deepStrictEqual(result, { ok: false, message: 'missing executable' });
}

{
  const media = loadMedia(() => { throw new Error('missing executable'); });
  let result;
  media.download('https://youtu.be/aqz-KE-bpKQ', 'best', null, {
    command: () => {}, output: () => {}, success: () => {},
    error: message => { result = message; }
  });
  assert.strictEqual(result, 'Could not start yt-dlp: missing executable');
}

{
  const process = new EventEmitter();
  process.stdout = new EventEmitter();
  process.stderr = new EventEmitter();
  const media = loadMedia(() => process);
  let calls = 0;
  media.update(() => { calls += 1; });
  process.emit('error', new Error('missing executable'));
  process.emit('close', 1);
  assert.strictEqual(calls, 1, 'process completion must be reported once');
}

console.log('Media lifecycle tests passed');
