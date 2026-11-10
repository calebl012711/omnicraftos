// Generate notices from locked, cached crate archives. No compilation or downloads.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
const root = process.cwd();
const target = process.env.DESKTOP_TARGET || 'x86_64-apple-darwin';
const cargo = path.join(process.env.CARGO_HOME || path.join(os.homedir(), '.cargo'), 'bin/cargo');
const hash = value => createHash('sha256').update(value).digest('hex');
const lockBytes = await fs.readFile('src-tauri/Cargo.lock');
const checksums = new Map();
for (const block of lockBytes.toString().split(/\r?\n\[\[package\]\]\r?\n/).slice(1)) {
  const field = name => block.match(new RegExp(`^${name} = "([^"\\r\\n]+)"`, 'm'))?.[1];
  if (field('checksum')) checksums.set(`${field('source')}/${field('name')}@${field('version')}`, field('checksum'));
}
const metadata = JSON.parse(execFileSync(cargo, ['metadata', '--manifest-path', 'src-tauri/Cargo.toml', '--offline', '--locked', '--filter-platform', target, '--format-version', '1'], { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, timeout: 120000 }));
const destination = path.join(root, 'public/licenses/desktop');
const supplementalDirectory = path.join(root, 'integration/desktop-notice-sources');
const supplementalSources = JSON.parse(await fs.readFile(path.join(supplementalDirectory, 'sources.json'), 'utf8'));
const supplementalReviews = JSON.parse(await fs.readFile('integration/desktop-notice-overrides.json', 'utf8')).packages;
const inventory = { schemaVersion: 1, target, scope: 'Resolved Cargo graph for this target, including build dependencies; not every listed package is linked into the executable.', cargoLockSha256: hash(lockBytes), registryChecksumsAreAuthoritative: true, packages: [], missingNotices: [] };
function archiveFiles(compressed, prefix) {
  const tar = gunzipSync(compressed, { maxOutputLength: 64 * 1024 * 1024 });
  const files = new Map(); let longName = '', paxPath = '';
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every(byte => byte === 0)) break;
    const text = (start, length) => header.subarray(start, start + length).toString().replace(/\0.*$/s, '');
    const size = Number.parseInt(text(124, 12).trim(), 8);
    if (!Number.isSafeInteger(size) || size < 0 || offset + 512 + size > tar.length) throw Error('Invalid crate archive header');
    const bytes = tar.subarray(offset + 512, offset + 512 + size);
    const type = text(156, 1);
    const shortName = text(0, 100); const leading = text(345, 155);
    if (type === 'L') longName = bytes.toString().replace(/\0.*$/s, '');
    else if (type === 'x') paxPath = bytes.toString().match(/(?:^|\n)\d+ path=([^\n]+)\n/)?.[1] || '';
    else {
      const name = paxPath || longName || (leading ? `${leading}/${shortName}` : shortName);
      paxPath = ''; longName = '';
      if ((type === '0' || !type) && name.startsWith(prefix)) files.set(name.slice(prefix.length), bytes);
    }
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}
for (const pkg of metadata.packages.filter(pkg => pkg.source?.startsWith('registry+')).sort((a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`))) {
  const directory = path.dirname(pkg.manifest_path);
  const registryId = path.basename(path.dirname(directory));
  const archive = path.resolve(directory, '../../../cache', registryId, `${pkg.name}-${pkg.version}.crate`);
  const compressed = await fs.readFile(archive);
  const checksum = checksums.get(`${pkg.source}/${pkg.name}@${pkg.version}`);
  if (!checksum || hash(compressed) !== checksum) throw Error(`Crate archive does not match Cargo.lock: ${pkg.name}@${pkg.version}`);
  const files = archiveFiles(compressed, `${pkg.name}-${pkg.version}/`);
  if (!files.has('Cargo.toml') || hash(files.get('Cargo.toml')) !== hash(await fs.readFile(pkg.manifest_path))) throw Error(`Cached manifest differs from locked archive: ${pkg.name}`);
  const vcs = files.has('.cargo_vcs_info.json') ? JSON.parse(files.get('.cargo_vcs_info.json').toString()) : null;
  const licenseFile = pkg.license_file ? path.relative(directory, path.resolve(directory, pkg.license_file)).split(path.sep).join('/') : null;
  const row = { name: pkg.name, version: pkg.version, registryChecksum: checksum, source: pkg.source, repository: pkg.repository, declaredLicense: pkg.license, authors: pkg.authors, publisherVcs: vcs, sourceUrl: `https://crates.io/crates/${pkg.name}/${pkg.version}`, notices: [] };
  const selected = { tauri: 'MIT', 'tauri-runtime-wry': 'MIT', wry: 'MIT', tao: 'Apache-2.0' }[pkg.name];
  if (selected) {
    if (!pkg.license?.split(/ OR /).includes(selected)) throw Error(`Review the changed license of ${pkg.name}`);
    row.selectedLicense = selected;
  }
  for (const [name, bytes] of files) {
    const segments = name.split('/');
    const isNotice = segments.length === 1 && /^(licen[sc]e|notice|copying|copyright)([. _-]|$)/i.test(name);
    const inLicenseDirectory = /^licen[sc]es?$/i.test(segments[0]);
    if (!isNotice && !inLicenseDirectory && name !== licenseFile) continue;
    if (segments.some(segment => segment === '..' || !segment)) throw Error(`Unsafe notice path: ${pkg.name}/${name}`);
    const output = path.join(`${pkg.name}-${pkg.version}`, name);
    await fs.mkdir(path.dirname(path.join(destination, output)), { recursive: true });
    await fs.writeFile(path.join(destination, output), bytes);
    row.notices.push({ file: output.split(path.sep).join('/'), sha256: hash(bytes) });
  }
  if (!row.notices.length) {
    const review = supplementalReviews.find(item => item.name === pkg.name && item.version === pkg.version);
    if (review) {
      if (review.publisherRevision !== vcs?.git?.sha1 || review.declaredLicense !== pkg.license) throw Error(`Notice review no longer matches ${pkg.name}@${pkg.version}`);
      row.selectedLicense = review.selectedLicense;
      for (const name of review.files) {
        const source = supplementalSources.find(item => item.file === name);
        if (!source) throw Error(`Unrecorded supplemental notice: ${name}`);
        const bytes = await fs.readFile(path.join(supplementalDirectory, name));
        if (hash(bytes) !== source.contentSha256) throw Error(`Modified supplemental notice: ${name}`);
        const output = `${pkg.name}-${pkg.version}/${name}`;
        await fs.mkdir(path.dirname(path.join(destination, output)), { recursive: true });
        await fs.writeFile(path.join(destination, output), bytes);
        row.notices.push({ file: output, sha256: hash(bytes), supplement: true, sourceUrl: source.sourceUrl, sourceBlobSha: source.sourceBlobSha, sourceFormat: source.sourceFormat });
      }
      if (review.selectedLicense === 'MPL-2.0') {
        const original = files.get('lib.rs')?.toString().match(/^\/\*[\s\S]*?\*\//)?.[0];
        if (!original?.includes('Mozilla Public')) throw Error(`Missing original MPL notice: ${pkg.name}`);
        row.sourceFormUrl = `https://static.crates.io/crates/${pkg.name}/${pkg.name}-${pkg.version}.crate`;
        const bytes = Buffer.from(`${original}\n\nSource form of this dependency is available at:\n${row.sourceFormUrl}\nCargo.lock SHA-256 of that source archive: ${checksum}\n`);
        const output = `${pkg.name}-${pkg.version}/SOURCE-NOTICE.txt`;
        await fs.writeFile(path.join(destination, output), bytes);
        row.notices.push({ file: output, sha256: hash(bytes), originalSourceNotice: true });
      }
    } else inventory.missingNotices.push({ name: pkg.name, version: pkg.version, license: pkg.license, repository: pkg.repository });
  }
  inventory.packages.push(row);
}
await fs.mkdir(destination, { recursive: true });
await fs.writeFile(path.join(destination, 'inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`);
const core = ['tauri', 'tauri-runtime-wry', 'wry', 'tao'];
const lock = { schemaVersion: 1, target, cargoLockSha256: inventory.cargoLockSha256, sourceOfTruth: 'Cargo.lock checksums verified against the original cached crate archives; no builds or downloads.', components: inventory.packages.filter(pkg => core.includes(pkg.name)), fullInventory: 'public/licenses/desktop/inventory.json', sourceIdentityLimit: 'Publisher VCS metadata is retained verbatim. A dirty flag means the Git revision alone does not identify the packaged source; the registry checksum pins the actual package.' };
await fs.writeFile('integration/desktop-lock.json', `${JSON.stringify(lock, null, 2)}\n`);
console.log(`${inventory.packages.length} locked Cargo packages inventoried; ${inventory.missingNotices.length} missing package notices.`);
if (inventory.missingNotices.length) { console.error(JSON.stringify(inventory.missingNotices, null, 2)); process.exitCode = 1; }
