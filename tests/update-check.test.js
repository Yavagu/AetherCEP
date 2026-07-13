const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const EventEmitter = require('events');

function element() {
  const node = {
    children: [], listeners: {}, className: '', textContent: '', disabled: false,
    appendChild(child) { this.children.push(child); },
    addEventListener(name, handler) { this.listeners[name] = handler; }
  };
  let html = '';
  Object.defineProperty(node, 'innerHTML', { get: () => html, set(value) { html = value; if (value === '') node.children = []; } });
  return node;
}

const notice = element();
const footer = element();
const responses = [];
const opened = [];
const fakeHttps = {
  get(url, options, callback) {
    const response = new EventEmitter(); response.statusCode = 200; response.resume = () => {};
    responses.push({ url, response }); callback(response);
    const request = new EventEmitter(); request.on = request.addListener.bind(request); return request;
  }
};
const api = {
  root: () => '.',
  byId: id => id === 'update-notice' ? notice : footer,
  cs: { openURLInDefaultBrowser: url => opened.push(url) },
  versioning: {
    valid: value => /^\d+\.\d+\.\d+$/.test(value),
    compare: (left, right) => left.localeCompare(right, undefined, { numeric: true })
  }
};
const localRequire = name => {
  if (name === 'https') return fakeHttps;
  if (name === 'fs') return { readFileSync: () => JSON.stringify({ version: '2.0.8', repository: 'xosmos01-cyber/BunBunMedia' }) };
  return require(name);
};
const context = { BunBunMedia: api, require: localRequire, document: { createElement: element }, setTimeout: handler => handler() };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/update-check.js', 'utf8'), context);

assert.strictEqual(responses.length, 1, 'startup must check GitHub once');
assert.match(responses[0].url, /releases\/latest$/);
responses[0].response.emit('data', Buffer.from(JSON.stringify({ tag_name: 'v2.1.0' })));
responses[0].response.emit('end');
assert.strictEqual(footer.textContent, 'Update 2.1.0 available');
assert.match(notice.children[0].textContent, /2\.1\.0 is available/);
assert.strictEqual(notice.children[1].textContent, 'Download update ZIP');
notice.children[1].listeners.click();
assert.deepStrictEqual(opened, ['https://github.com/xosmos01-cyber/BunBunMedia/releases']);

api.extensionUpdateCheck.check(true);
responses[1].response.emit('data', Buffer.from(JSON.stringify({ tag_name: 'v2.0.8' })));
responses[1].response.emit('end');
assert.strictEqual(footer.textContent, 'You are on Latest Version');
assert.strictEqual(notice.children[0].textContent, 'BunBun Media is up to date.');

console.log('Update check tests passed');
