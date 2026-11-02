import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
const root = process.cwd(), directory = await fs.mkdtemp(path.join(os.tmpdir(), 'omnicraft-lfs-'));
const output = path.resolve('verification/asset-build'); await fs.mkdir(output, { recursive: true });
const revision = '3874ebe184f9584757888ff5cb27a29f5c5761ca';
const relative = 'public/editors/soundcraft/soundcraft-web-c5e10fa986cf471d_bg.wasm';
const pointer = execFileSync('git', ['show', `${revision}:${relative}`], { encoding: 'utf8' });
assert.match(pointer, /^version https:\/\/git-lfs.github.com\/spec\/v1/);
const file = path.join(directory, relative); await fs.mkdir(path.dirname(file), { recursive: true });
const report = { at: new Date().toISOString(), sourceRevision: revision, tests: {} };
const run = () => spawnSync(process.execPath, [path.join(root, 'scripts/prepare-assets.mjs'), '--fetch', '--directory', directory, '--revision', revision, '--report', path.join(directory, 'result.json')], { encoding: 'utf8', timeout: 330000 });
try {
  await fs.writeFile(file, pointer);
  const first = run(); assert.equal(first.status, 0, first.stderr);
  const success = JSON.parse(await fs.readFile(path.join(directory, 'result.json')));
  assert.equal(success.resolved.length, 1);
  assert.equal((await fs.readFile(file)).subarray(0, 8).toString('hex'), '0061736d01000000');
  report.tests.retrieval = { passed: true, actualPublicLfsArtifact: true, pointerReplacedOnlyAfterHashAndSizeVerified: true, artifact: success.resolved[0] };
  const corrupt = pointer.replace(/oid sha256:[a-f0-9]{64}/, `oid sha256:${'0'.repeat(64)}`);
  await fs.writeFile(file, corrupt);
  const second = run(); assert.equal(second.status, 1, second.stderr);
  const rejected = JSON.parse(await fs.readFile(path.join(directory, 'result.json')));
  assert.match(rejected.error, /SHA-256/);
  assert.equal(await fs.readFile(file, 'utf8'), corrupt);
  assert.ok(!(await fs.readdir(path.join(directory, '.omnicraft-build-cache'))).some(name => name.endsWith('.tmp')));
  report.tests.integrityFailure = { passed: true, wrongHashRejected: true, originalPointerPreserved: true, partialDownloadRemoved: true, error: rejected.error };
  report.passed = true;
} catch (error) { report.passed = false; report.error = String(error.stack || error); process.exitCode = 1; console.error(error); }
finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await fs.rm(directory, { recursive: true, force: true }); }
