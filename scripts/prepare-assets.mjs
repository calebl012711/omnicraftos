// Resolve Git LFS pointers in a build checkout without needing the Git LFS CLI.
// Only downloads bytes from this public repository at the exact build revision.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
const args = process.argv.slice(2);
let directory = process.cwd(), revision, reportPath, fetchMissing = false;
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--fetch') fetchMissing = true;
  else if (arg === '--directory' && args[i + 1]) directory = path.resolve(args[++i]);
  else if (arg === '--revision' && args[i + 1]) revision = args[++i];
  else if (arg === '--report' && args[i + 1]) reportPath = path.resolve(args[++i]);
  else throw Error(`Unknown or incomplete asset option: ${arg}`);
}
const report = { at: new Date().toISOString(), repository: 'https://github.com/calebl012711/omnicraftos', binaryFiles: 0, resolved: [], passed: false };
async function files(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const children = await Promise.all(entries.map(entry => entry.isDirectory() ? files(path.join(root, entry.name)) : entry.isFile() && /\.(wasm|mp4|webm)$/i.test(entry.name) ? [path.join(root, entry.name)] : []));
  return children.flat();
}
async function header(file) {
  const handle = await fs.open(file, 'r');
  try { const data = Buffer.alloc(512); const { bytesRead } = await handle.read(data, 0, 512, 0); return data.subarray(0, bytesRead); }
  finally { await handle.close(); }
}
try {
  const binaries = await files(path.join(directory, 'public')); report.binaryFiles = binaries.length;
  for (const file of binaries) {
    const first = await header(file), text = first.toString('utf8');
    const relative = path.relative(directory, file).split(path.sep).join('/');
    if (!text.startsWith('version https://git-lfs.github.com/spec/v1')) {
      if (file.endsWith('.wasm') && !first.subarray(0, 8).equals(Buffer.from([0,97,115,109,1,0,0,0]))) throw Error(`${relative} is not a WebAssembly binary. Restore the actual artifact before building.`);
      continue;
    }
    const oid = text.match(/^oid sha256:([a-f0-9]{64})$/m)?.[1];
    const size = Number(text.match(/^size (\d+)$/m)?.[1]);
    if (!oid || !Number.isSafeInteger(size) || size < 1) throw Error(`Invalid LFS pointer: ${relative}`);
    if (!fetchMissing) throw Error(`Unresolved LFS pointer: ${relative}. Run npm run assets:prepare or git lfs pull.`);
    if (!revision) {
      revision = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA;
      if (!revision) { try { revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: directory, encoding: 'utf8' }).trim(); } catch {} }
    }
    if (!/^[a-f0-9]{40}$/i.test(revision || '')) throw Error('An exact Git commit is required to retrieve LFS bytes. Supply --revision or enable Git LFS checkout.');
    const url = `https://media.githubusercontent.com/media/calebl012711/omnicraftos/${revision}/${relative.split('/').map(encodeURIComponent).join('/')}`;
    const cache = path.join(directory, '.omnicraft-build-cache');
    await fs.mkdir(cache, { recursive: true });
    const temporary = path.join(cache, `${oid}.${process.pid}.tmp`);
    console.log(`Retrieving ${relative} (${(size / 1e6).toFixed(1)} MB)`);
    let bytes = 0;
    const hash = createHash('sha256');
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(300000) });
      if (!response.ok || !response.body) throw Error(`Artifact request returned HTTP ${response.status}`);
      const length = response.headers.get('content-length');
      if (length && !response.headers.get('content-encoding') && Number(length) !== size) { await response.body.cancel(); throw Error(`Artifact length ${length} differs from pointer size ${size}`); }
      await pipeline(Readable.fromWeb(response.body), new Transform({ transform(chunk, encoding, callback) { bytes += chunk.length; if (bytes > size) callback(new Error('Artifact exceeds its declared size')); else { hash.update(chunk); callback(null, chunk); } } }), createWriteStream(temporary, { flags: 'wx' }));
      if (bytes !== size || hash.digest('hex') !== oid) throw Error('Artifact size or SHA-256 does not match the pinned LFS pointer');
      const downloaded = await header(temporary);
      if (file.endsWith('.wasm') && !downloaded.subarray(0, 8).equals(Buffer.from([0,97,115,109,1,0,0,0]))) throw Error('Downloaded artifact is not WebAssembly');
      if (!(await header(file)).equals(first)) throw Error('The source pointer changed during retrieval; refusing to replace it');
      await fs.rename(temporary, file);
      report.resolved.push({ file: relative, revision, bytes, sha256: oid });
    } catch (error) { await fs.rm(temporary, { force: true }); throw new Error(`${relative}: ${error.message}. The original pointer was retained; no build was published.`); }
  }
  report.passed = true;
  console.log(`Binary assets ready: ${report.binaryFiles} checked, ${report.resolved.length} LFS pointers resolved.`);
} catch (error) { report.error = error.message; console.error(error.message); process.exitCode = 1; }
finally { if (reportPath) { await fs.mkdir(path.dirname(reportPath), { recursive: true }); await fs.writeFile(reportPath, JSON.stringify(report, null, 2)); } }
