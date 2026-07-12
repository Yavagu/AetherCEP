const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/timecode.js', 'utf8'), context);
const timecode = context.BunBunMedia.timecode;

assert.strictEqual(timecode.parse('90'), 90);
assert.strictEqual(timecode.parse('2:15'), 135);
assert.strictEqual(timecode.parse('1:20:00'), 4800);
assert.ok(Number.isNaN(timecode.parse('1:60')));
assert.ok(Number.isNaN(timecode.parse('1:60:00')));

const openStart = timecode.range('', '2:15', true);
assert.strictEqual(openStart.argument, '*0-135');
assert.strictEqual(openStart.precise, true);

const multiHour = timecode.range('1:20:00', '1:25:30', false);
assert.strictEqual(multiHour.argument, '*4800-5130');
assert.strictEqual(multiHour.fileTag, '01h20m00s-01h25m30s');

assert.ok(timecode.range('2:00', '1:00', false).error);
assert.strictEqual(timecode.range('10:00', '', false).argument, '*600-inf');

console.log('Timecode tests passed');
