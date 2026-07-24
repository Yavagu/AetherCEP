const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EventEmitter = require('events');

function child() {
  const process = new EventEmitter();
  process.stdout = new EventEmitter();
  process.stderr = new EventEmitter();
  return process;
}

function loadMedia(spawn, exists) {
  const api = {
    bin: name => name + '.exe',
    exists: exists,
    root: () => '.',
    state: {},
    byId: () => ({ value: '', checked: false })
  };
  const fakeFs = Object.assign({}, fs, { existsSync: exists, renameSync: () => {}, unlinkSync: () => {} });
  const localRequire = name => name === 'child_process' ? { spawn, spawnSync: () => ({ status: 1 }) } : (name === 'fs' ? fakeFs : require(name));
  const context = { AetherCEP: api, BunBunMedia: api, require: localRequire, process: { env: {}, platform: 'win32' } };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/media.js', 'utf8'), context);
  return api.media;
}

{
  const processes = [];
  const calls = [];
  const media = loadMedia((executable, args) => {
    calls.push({ executable, args });
    const process = child();
    processes.push(process);
    return process;
  }, file => file === 'ffprobe.exe' || file === 'ffmpeg.exe' || /converting\.mp4$/.test(file));
  let result;
  media.prepareForImport('sample.mp4', {
    converting: () => {},
    error: message => { throw new Error(message); },
    ready: (file, converted) => { result = { file, converted }; }
  });
  processes[0].stdout.emit('data', Buffer.from('h264,avc1\n'));
  processes[0].emit('close', 0);
  assert.deepStrictEqual(result, { file: 'sample.mp4', converted: false });
  assert.strictEqual(calls.length, 1, 'H.264 must not be converted');
}

{
  const processes = [];
  const calls = [];
  const media = loadMedia((executable, args) => {
    calls.push({ executable, args });
    const process = child();
    processes.push(process);
    return process;
  }, file => file === 'ffprobe.exe' || file === 'ffmpeg.exe' || /converting\.mp4$/.test(file));
  let converted = false;
  let result;
  media.prepareForImport(path.join('folder', 'sample.mp4'), {
    converting: () => { converted = true; },
    error: message => { throw new Error(message); },
    ready: (file, changed) => { result = { file, changed }; }
  });
  processes[0].stdout.emit('data', Buffer.from('vp9,vp09\n'));
  processes[0].emit('close', 0);
  assert.strictEqual(converted, true);
  assert.strictEqual(calls.length, 2);
  assert.ok(calls[1].args.includes('libx264'));
  assert.ok(calls[1].args.includes('aac'));
  processes[1].emit('close', 0);
  assert.deepStrictEqual(result, { file: path.join('folder', 'sample [H.264].mp4'), changed: true });
}

console.log('Media import tests passed');
