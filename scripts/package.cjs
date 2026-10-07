const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const root = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const sdk = JSON.parse(fs.readFileSync('packages/sdk/package.json', 'utf8'));
if (!/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(root.version) ||
    sdk.version !== root.version || sdk.name !== '@tally-local/sdk') {
  throw new Error('Installation and SDK must have one matching stable version.');
}
const name = 'tally-local-sdk-' + sdk.version + '.tgz';
const archive = path.join('artifacts', name);
if (!fs.lstatSync(archive).isFile()) throw new Error('Tested SDK archive is missing.');
const entries = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split(/\r?\n/);
for (const entry of ['package/package.json', 'package/README.md', 'package/LICENSE',
  'package/dist/index.js', 'package/dist/index.cjs', 'package/dist/index.d.ts']) {
  if (!entries.includes(entry)) throw new Error('SDK archive is incomplete: ' + entry);
}
if (entries.some(entry => !/^package\/(package\.json|README\.md|LICENSE|dist\/[^/]+)$/.test(entry))) {
  throw new Error('SDK archive contains an unexpected file.');
}
const packed = JSON.parse(execFileSync('tar', ['-xOf', archive, 'package/package.json'], { encoding: 'utf8' }));
if (packed.name !== sdk.name || packed.version !== sdk.version || packed.license !== 'MIT' ||
    Object.keys(packed.dependencies || {}).length > 0) {
  throw new Error('Packed SDK manifest does not match the dependency-free release.');
}
const sum = crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
const line = sum + '  ' + name + '\n';
fs.writeFileSync(archive + '.sha256', line);
fs.writeFileSync(path.join('artifacts', 'SHA256SUMS'), line);
console.log('Verified SDK archive contents and SHA256: ' + name);
