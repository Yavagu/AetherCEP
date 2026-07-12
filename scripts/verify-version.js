const fs = require('fs');

const expected = String(process.argv[2] || process.env.RELEASE_VERSION || '').replace(/^v/, '');
if (!/^\d+\.\d+\.\d+$/.test(expected)) {
  console.error('Usage: npm run verify-version -- <major.minor.patch>');
  process.exit(1);
}

const packageVersion = require('../package.json').version;
const canonicalVersion = require('../version.json').version;
const manifest = fs.readFileSync('CSXS/manifest.xml', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const checks = [
  ['package.json', packageVersion === expected],
  ['version.json', canonicalVersion === expected],
  ['manifest bundle', manifest.includes(`ExtensionBundleVersion="${expected}"`)],
  ['manifest extension', manifest.includes(`Extension Id="com.bunbunmedia.panel" Version="${expected}"`)],
  ['panel footer', html.includes(`v${expected} · CEP`)]
];
const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
  console.error(`Version ${expected} is inconsistent in: ${failed.join(', ')}`);
  process.exit(1);
}
console.log(`Version ${expected} is consistent.`);
