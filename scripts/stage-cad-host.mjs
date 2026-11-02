// Explicitly stage a completed release+wasm-bindgen module before optional Binaryen
// minification. This does not change pins, tracked bundles, or deployment state.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = process.cwd();
const checkout = path.join(root, 'upstream/solidcraft');
const lock = JSON.parse(fs.readFileSync('integration/upstream-lock.json', 'utf8'));
const pin = lock.repositories.find(repo => repo.id === 'solidcraft').pinnedCommit;
const head = execFileSync('git', ['-C', checkout, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (head !== pin) throw Error('Source checkout does not match the reviewed pin.');
const overlay = fs.readFileSync('integration/patches/solidcraft-host-chrome.patch', 'utf8');
const diff = execFileSync('git', ['-C', checkout, 'diff', '--no-ext-diff'], { encoding: 'utf8' });
const hunks = text => text.slice(text.indexOf('@@')).replace(/^(@@.*?@@).*$/gm, '$1').trim();
if (hunks(diff) !== hunks(overlay)) throw Error('Source differs from the reviewed host overlay.');
const source = path.join(checkout, 'dist/verified-web/.stage');
const files = fs.readdirSync(source);
const wasmName = files.find(name => name.endsWith('_bg.wasm'));
const jsName = files.find(name => name.endsWith('.js'));
if (!wasmName || !jsName) throw Error('The wasm-bindgen stage is not complete.');
const bytes = fs.readFileSync(path.join(source, wasmName));
if (!WebAssembly.validate(bytes)) throw Error('Invalid or incomplete WebAssembly module.');
const sha = data => createHash('sha256').update(data).digest('hex');
const wasmHash = sha(bytes), js = fs.readFileSync(path.join(source, jsName));
const output = path.join(root, 'staging/solidcraft', `${pin}-host-release-${wasmHash.slice(0, 12)}`);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.mkdirSync(output, { recursive: false });
const names = { wasm: `model-engine-${wasmHash.slice(0, 16)}.wasm`, js: `model-engine-${sha(js).slice(0, 16)}.js` };
fs.writeFileSync(path.join(output, names.wasm), bytes);
fs.writeFileSync(path.join(output, names.js), js);
for (const name of ['fonts', 'icons']) fs.cpSync(path.join(checkout, 'dist/verified-web', name), path.join(output, name), { recursive: true });
for (const name of fs.readdirSync(checkout)) if (/^(LICENSE|NOTICE|ATTRIBUTION|THIRD-PARTY-LICENSES|ASSETS)/.test(name) && fs.statSync(path.join(checkout, name)).isFile()) fs.copyFileSync(path.join(checkout, name), path.join(output, name));
const report = {
  id: 'solidcraft', sourceCommit: pin, upstream: 'https://github.com/tangency-labs/solidcraft',
  overlay: 'integration/patches/solidcraft-host-chrome.patch', overlaySha256: sha(overlay),
  stagedAt: new Date().toISOString(), stagedPath: path.relative(root, output),
  buildCommand: 'npm run upstream:build -- solidcraft --overlay',
  phase: 'Completed release compilation (O3 + thin LTO) and wasm-bindgen 0.2.129; optional wasm-opt -Oz minification omitted from this staged copy.',
  fullTrunkPipelineComplete: false, validWebAssembly: true,
  artifacts: [{ file: names.wasm, bytes: bytes.length, sha256: wasmHash }, { file: names.js, bytes: js.length, sha256: sha(js) }]
};
fs.writeFileSync(path.join(output, 'host-build.json'), JSON.stringify(report, null, 2));
fs.writeFileSync('verification/builds/solidcraft-host-release.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ stagedPath: report.stagedPath, names, bytes: bytes.length }));
