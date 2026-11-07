// Collect the actual locked Cargo dependency notices without compiling or downloading.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = process.cwd();
const target = process.env.DESKTOP_TARGET || 'x86_64-apple-darwin';
const cargo = path.join(os.homedir(), '.cargo/bin/cargo');
const hash = value => createHash('sha256').update(value).digest('hex');
const metadata = JSON.parse(execFileSync(cargo, ['metadata', '--manifest-path', 'src-tauri/Cargo.toml', '--offline', '--locked', '--filter-platform', target, '--format-version', '1'], { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, timeout: 120000 }));
const destination = path.join(root, 'public/licenses/desktop');
const inventory = { schemaVersion: 1, target, scope: 'Resolved Cargo packages for the target, including build dependencies; not a claim that every listed package is linked into the executable.', cargoLockSha256: hash(await fs.readFile('src-tauri/Cargo.lock')), registryChecksumsAreAuthoritative: true, packages: [], missingNotices: [] };
async function filesIn(directory, relative = '', depth = 0) {
  const files = [];
  for (const entry of await fs.readdir(path.join(directory, relative), { withFileTypes: true })) {
    const name = path.join(relative, entry.name);
    if (entry.isFile() && (depth > 0 || /^(licen[sc]e|notice|copying|copyright)([. _-]|$)/i.test(entry.name))) files.push(name);
    else if (entry.isDirectory() && depth < 3 && (depth > 0 || /^licen[sc]es?$/i.test(entry.name))) files.push(...await filesIn(directory, name, depth + 1));
  }
  return files;
}
for (const pkg of metadata.packages.filter(pkg => pkg.source?.startsWith('registry+')).sort((a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`))) {
  const directory = path.dirname(pkg.manifest_path);
  const checksum = JSON.parse(await fs.readFile(path.join(directory, '.cargo-checksum.json'), 'utf8'));
  let vcs = null;
  try { vcs = JSON.parse(await fs.readFile(path.join(directory, '.cargo_vcs_info.json'), 'utf8')); } catch { /* Some published crates omit VCS metadata. */ }
  const files = new Set(await filesIn(directory));
  if (pkg.license_file) files.add(path.isAbsolute(pkg.license_file) ? path.relative(directory, pkg.license_file) : pkg.license_file);
  const row = { name: pkg.name, version: pkg.version, registryChecksum: checksum.package, source: pkg.source, repository: pkg.repository, declaredLicense: pkg.license, authors: pkg.authors, publisherVcs: vcs, sourceUrl: `https://crates.io/crates/${pkg.name}/${pkg.version}`, notices: [] };
  for (const name of [...files].sort()) {
    const source = path.resolve(directory, name);
    if (!source.startsWith(`${directory}${path.sep}`)) throw Error(`License path escapes package: ${pkg.name}/${name}`);
    const bytes = await fs.readFile(source);
    const digest = hash(bytes);
    if (checksum.files[name] && checksum.files[name] !== digest) throw Error(`Modified package notice: ${pkg.name}/${name}`);
    const output = path.join(`${pkg.name}-${pkg.version}`, name);
    await fs.mkdir(path.dirname(path.join(destination, output)), { recursive: true });
    await fs.writeFile(path.join(destination, output), bytes);
    row.notices.push({ file: output.split(path.sep).join('/'), sha256: digest });
  }
  if (!row.notices.length) inventory.missingNotices.push({ name: pkg.name, version: pkg.version, license: pkg.license, repository: pkg.repository });
  inventory.packages.push(row);
}
await fs.mkdir(destination, { recursive: true });
await fs.writeFile(path.join(destination, 'inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`);
const core = ['tauri', 'tauri-runtime-wry', 'wry', 'tao'];
const lock = { schemaVersion: 1, target, cargoLockSha256: inventory.cargoLockSha256, sourceOfTruth: 'src-tauri/Cargo.lock; cached registry packages resolved by cargo metadata --locked --offline', components: inventory.packages.filter(pkg => core.includes(pkg.name)), fullInventory: 'public/licenses/desktop/inventory.json', sourceIdentityLimit: 'Publisher VCS metadata is retained verbatim. A dirty flag means the Git revision alone does not identify the packaged source; the registry checksum pins the actual package.' };
await fs.writeFile('integration/desktop-lock.json', `${JSON.stringify(lock, null, 2)}\n`);
console.log(`${inventory.packages.length} locked Cargo packages inventoried; ${inventory.missingNotices.length} missing package notices.`);
if (inventory.missingNotices.length) { console.error(JSON.stringify(inventory.missingNotices, null, 2)); process.exitCode = 1; }
