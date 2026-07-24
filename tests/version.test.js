const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/version.js', 'utf8'), context);
const versioning = (context.AetherCEP || context.BunBunMedia).versioning;

assert.strictEqual(versioning.compare('2.0.1', '2.0.0'), 1);
assert.strictEqual(versioning.compare('v2.0.1', '2.0.1'), 0);
assert.strictEqual(versioning.compare('1.9.9', '2.0.0'), -1);
assert.strictEqual(versioning.compare('2.10.0', '2.9.9'), 1);
assert.strictEqual(versioning.compare('invalid', '2.0.1'), null);
assert.strictEqual(versioning.valid('2.0.1'), true);
assert.strictEqual(versioning.valid('2.0'), false);

console.log('Version tests passed');
