// Package-only checks. Never executes the app or requests camera/screen access.
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = process.cwd();
if (process.platform !== 'darwin') throw Error('Intel macOS packaging requires macOS.');
const bundle = await fs.realpath(path.resolve(process.argv[2] || 'staging/desktop-low-impact-target/debug/bundle/macos/OmniCraft OS.app'));
assert.ok(bundle.startsWith(`${path.join(root, 'staging')}${path.sep}`) && bundle.endsWith('/OmniCraft OS.app'), 'Only a separate staging bundle can be finalized; the previous app is preserved.');
const plist = field => execFileSync('/usr/bin/plutil', ['-extract', field, 'raw', '-o', '-', path.join(bundle, 'Contents/Info.plist')], { encoding: 'utf8' }).trim();
assert.match(plist('CFBundleIdentifier'), /^studio\.omnicraft\.os(?:\.verification)?$/);
const binaryName = plist('CFBundleExecutable'); assert.equal(binaryName, path.basename(binaryName));
const binary = path.join(bundle, 'Contents/MacOS', binaryName);
const architecture = execFileSync('/usr/bin/lipo', ['-archs', binary], { encoding: 'utf8' }).trim();
assert.equal(architecture, 'x86_64', 'This package is for the Intel MacBook Air.');
execFileSync(process.execPath, ['scripts/verify-desktop-notices.mjs'], { stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/frontend-notices.mjs', '--check'], { stdio: 'inherit' });
const notices = path.join(bundle, 'Contents/Resources/ThirdPartyNotices');
await fs.rm(notices, { recursive: true, force: true });
await fs.cp('public/licenses', notices, { recursive: true });
execFileSync(process.execPath, ['scripts/verify-desktop-notices.mjs', path.join(notices, 'desktop')], { stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/frontend-notices.mjs', '--check', path.join(notices, 'frontend')], { stdio: 'inherit' });
execFileSync('/usr/bin/codesign', ['--force', '--deep', '--sign', '-', bundle], { stdio: 'inherit' });
execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', bundle], { stdio: 'inherit' });
async function hashFile(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
const frontend = [];
for (const name of (await fs.readdir('dist/assets')).filter(name => /\.(js|css)$/.test(name)).sort()) frontend.push({ file: `dist/assets/${name}`, sha256: await hashFile(`dist/assets/${name}`) });
const report = {
  at: new Date().toISOString(), sourceCommitAtInspection: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sourceChangesAtInspection: execFileSync('git', ['status', '--short', '--', 'src', 'src-tauri/src', 'src-tauri/Cargo.lock', 'package-lock.json'], { encoding: 'utf8' }).trim(),
  bundle: path.relative(root, bundle), identifier: plist('CFBundleIdentifier'), version: plist('CFBundleShortVersionString'), architecture,
  binary: { bytes: (await fs.stat(binary)).size, sha256: await hashFile(binary) },
  frontendWorkspaceAssets: frontend, cargoLockSha256: await hashFile('src-tauri/Cargo.lock'), noticeInventorySha256: await hashFile(path.join(notices, 'desktop/inventory.json')),
  frontendNoticeInventorySha256: await hashFile(path.join(notices, 'frontend/inventory.json')),
  sourceIdentityVerifiedByStaticInspection: false,
  provenanceLimit: 'Workspace revision and frontend hashes are inspection context. The build job and compiler logs must establish which revision was compiled; static inspection alone does not prove embedded-source identity.',
  noticeFilesVerified: true, adHocSignatureVerified: true, nativeAppLaunched: false, nativeWorkflowsVerified: false,
  limits: 'Static package verification only. Native recording, CAD rendering/export, offline behavior, installation and persistence remain unverified. This is an unnotarized debug package.'
};
await fs.mkdir('verification/desktop-package', { recursive: true });
await fs.writeFile('verification/desktop-package/report.json', `${JSON.stringify(report, null, 2)}\n`);
console.log('Intel desktop package and notices verified without opening the app.');
