// Verify the distributable notices against their recorded hashes and Cargo.lock.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const base = path.resolve(process.argv[2] || 'public/licenses/desktop');
const sha = value => createHash('sha256').update(value).digest('hex');
const inventory = JSON.parse(await fs.readFile(path.join(base, 'inventory.json'), 'utf8'));
assert.equal(inventory.cargoLockSha256, sha(await fs.readFile('src-tauri/Cargo.lock')), 'Notices must match the current Cargo.lock');
assert.equal(inventory.missingNotices.length, 0, 'Unreviewed missing notices remain');
let files = 0;
for (const pkg of inventory.packages) {
  assert.match(pkg.registryChecksum, /^[a-f0-9]{64}$/);
  assert.ok(pkg.notices.length, `Missing notices: ${pkg.name}`);
  for (const notice of pkg.notices) {
    const file = path.resolve(base, notice.file);
    assert.ok(file.startsWith(`${base}${path.sep}`), 'Notice path must stay inside the distribution');
    assert.equal(sha(await fs.readFile(file)), notice.sha256, `Notice changed: ${notice.file}`);
    files++;
  }
  if (pkg.selectedLicense === 'MPL-2.0') assert.ok(pkg.sourceFormUrl?.includes(`${pkg.name}-${pkg.version}.crate`), 'Source-form information must be retained');
}
const lock = JSON.parse(await fs.readFile('integration/desktop-lock.json', 'utf8'));
assert.equal(lock.cargoLockSha256, inventory.cargoLockSha256);
for (const name of ['tauri', 'tauri-runtime-wry', 'wry', 'tao']) {
  const component = lock.components.find(pkg => pkg.name === name);
  assert.ok(component, `Desktop lock lacks ${name}`);
  assert.deepEqual(component, inventory.packages.find(pkg => pkg.name === name));
}
console.log(`Verified ${files} notice files for ${inventory.packages.length} Cargo packages; no compilation or network access.`);
