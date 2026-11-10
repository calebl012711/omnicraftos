// Retain notices for the locked installed runtime graph, without building or downloading.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const hash = value => createHash('sha256').update(value).digest('hex');
const lockBytes = await fs.readFile('package-lock.json');
const lock = JSON.parse(lockBytes);
const base = path.resolve(process.argv[3] || 'public/licenses/frontend');
const dependencies = Object.entries(lock.packages).filter(([name, value]) => name.startsWith('node_modules/') && !value.dev);
if (process.argv[2] === '--check') {
  const inventory = JSON.parse(await fs.readFile(path.join(base, 'inventory.json'), 'utf8'));
  assert.equal(inventory.packageLockSha256, hash(lockBytes), 'Runtime notices must match package-lock.json');
  assert.equal(inventory.packages.length, dependencies.length);
  let count = 0;
  for (const pkg of inventory.packages) {
    const dependency = lock.packages[pkg.installedPath];
    assert.equal(pkg.version, dependency?.version);
    assert.equal(pkg.integrity, dependency?.integrity);
    assert.ok(pkg.notices.length, `No notices for ${pkg.name}`);
    for (const notice of pkg.notices) {
      const file = path.resolve(base, notice.file);
      assert.ok(file.startsWith(`${base}${path.sep}`));
      assert.equal(hash(await fs.readFile(file)), notice.sha256, `Notice changed: ${notice.file}`); count++;
    }
  }
  console.log(`Verified ${count} frontend notice files for ${inventory.packages.length} runtime packages.`);
} else {
  const installed = JSON.parse(await fs.readFile('node_modules/.package-lock.json', 'utf8')).packages;
  const inventory = { schemaVersion: 1, packageLockSha256: hash(lockBytes), scope: 'Installed non-development npm dependency graph. Some packages may be removed by bundling. Integrity values identify locked tarballs; copied-file hashes do not independently prove the entire installed source matches those tarballs.', packages: [] };
  for (const [location, dependency] of dependencies.sort(([a], [b]) => a.localeCompare(b))) {
    assert.equal(installed[location]?.version, dependency.version, `Run npm ci: ${location} version differs`);
    assert.equal(installed[location]?.integrity, dependency.integrity, `Run npm ci: ${location} integrity differs`);
    const pkg = JSON.parse(await fs.readFile(path.join(location, 'package.json'), 'utf8'));
    assert.equal(pkg.version, dependency.version);
    const expectedName = location.replace(/^.*node_modules\//, ''); assert.equal(pkg.name, expectedName);
    const row = { name: pkg.name, version: pkg.version, installedPath: location, integrity: dependency.integrity, sourceTarball: dependency.resolved, declaredLicense: pkg.license, authors: pkg.author || pkg.contributors || [], repository: pkg.repository, notices: [] };
    async function copy(name, bytes, extra = {}) {
      const relative = path.join(pkg.name, pkg.version, name); const destination = path.resolve(base, relative);
      assert.ok(destination.startsWith(`${base}${path.sep}`));
      await fs.mkdir(path.dirname(destination), { recursive: true }); await fs.writeFile(destination, bytes);
      row.notices.push({ file: relative.split(path.sep).join('/'), sha256: hash(bytes), ...extra });
    }
    for (const entry of await fs.readdir(location, { withFileTypes: true })) {
      if (entry.isFile() && /^(licen[sc]e|copying|copyright|notice)([. _-]|$)/i.test(entry.name)) await copy(entry.name, await fs.readFile(path.join(location, entry.name)));
    }
    if (!row.notices.length) {
      // This exact tarball declares MIT in its README/package metadata, but omits a license file.
      assert.equal(pkg.name, 'react-async-hook', `Review the missing notice for ${pkg.name}`);
      assert.equal(pkg.version, '4.0.0'); assert.equal(pkg.license, 'MIT');
      assert.equal(dependency.integrity, 'sha512-97lgjFkOcHCTYSrsKBpsXg3iVWM0LnzedB749iP76sb3/8Ouu4nHIkCLEOrQWHVYqrYxjF05NN6GHoXWFkB3Kw==');
      const readme = await fs.readFile(path.join(location, 'README.md'), 'utf8');
      const declaration = readme.match(/^# License\r?\n+MIT\s*$/m)?.[0]; assert.ok(declaration);
      const source = JSON.parse(await fs.readFile('integration/desktop-notice-sources/sources.json', 'utf8')).find(row => row.file === 'MIT.txt');
      const bytes = await fs.readFile('integration/desktop-notice-sources/MIT.txt'); assert.equal(hash(bytes), source.contentSha256);
      await copy('MIT.txt', bytes, { supplement: true, sourceUrl: source.sourceUrl, sourceBlobSha: source.sourceBlobSha });
      await copy('UPSTREAM-LICENSE-DECLARATION.txt', Buffer.from(`${declaration.trim()}\n\nAuthor from package metadata: ${pkg.author}\nOriginal package: ${dependency.resolved}\nLocked integrity: ${dependency.integrity}\n`));
    }
    inventory.packages.push(row);
  }
  await fs.mkdir(base, { recursive: true }); await fs.writeFile(path.join(base, 'inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`);
  console.log(`Retained notices for ${inventory.packages.length} frontend runtime packages.`);
}
