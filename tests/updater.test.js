const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');
const vm = require('vm');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bunbun-updater-test-'));
const stateFile = path.join(root, 'state.json');
const context = {
  BunBunMedia: {
    versioning: {
      valid: value => /^\d+\.\d+\.\d+$/.test(value),
      compare: (left, right) => left === right ? 0 : (left === '2.0.6' ? 1 : -1)
    }
  },
  require,
  process
};

try {
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/update-state.js', 'utf8'), context);
  const updaterState = context.BunBunMedia.updateState;
  const pending = { version: '2.0.6', status: 'downloaded', package: 'update.zip', digest: 'a'.repeat(64) };

  updaterState.write(stateFile, pending);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(updaterState.read(stateFile))), pending);
  assert.strictEqual(updaterState.effectiveStatus('2.0.5', pending), 'downloaded');
  assert.strictEqual(updaterState.effectiveStatus('2.0.6', pending), 'installed');
  assert.strictEqual(updaterState.effectiveStatus('2.0.5', { version: '2.0.6', status: 'unknown' }), 'none');

  const waiting = Object.assign({}, pending, { status: 'waiting' });
  updaterState.write(stateFile, waiting);
  assert.strictEqual(updaterState.read(stateFile).status, 'waiting');

  fs.writeFileSync(stateFile, '{broken', 'utf8');
  assert.strictEqual(updaterState.read(stateFile), null);
  updaterState.clear(stateFile);
  assert.strictEqual(fs.existsSync(stateFile), false);

  const script = fs.readFileSync('updater/Update.ps1', 'utf8');
  assert.match(script, /\[string\]\$StateFile/);
  ['waiting', 'installing', 'installed', 'failed'].forEach(status => {
    assert.match(script, new RegExp("Write-UpdateState '" + status + "'"));
  });

  if (process.platform === 'win32') {
    const appData = path.join(root, 'appdata');
    const destination = path.join(appData, 'Adobe', 'CEP', 'extensions', 'BunBunMedia');
    const logFile = path.join(root, 'update.log');
    const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const result = childProcess.spawnSync(powershell, [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.resolve('updater/Update.ps1'),
      '-Package', path.join(root, 'missing.zip'), '-ExpectedSha256', 'a'.repeat(64), '-Destination', destination,
      '-Version', '9.9.9', '-LogFile', logFile, '-StateFile', stateFile
    ], { env: Object.assign({}, process.env, { APPDATA: appData }), encoding: 'utf8' });
    if (result.error && result.error.code === 'EPERM') {
      console.log('PowerShell updater integration test skipped: child processes are restricted.');
    } else {
      assert.ifError(result.error);
      assert.strictEqual(result.status, 1);
      assert.strictEqual(updaterState.read(stateFile).status, 'failed');
      assert.match(fs.readFileSync(logFile, 'utf8'), /ERROR: The downloaded update package does not exist\./);
    }
  }
  console.log('Updater tests passed');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
