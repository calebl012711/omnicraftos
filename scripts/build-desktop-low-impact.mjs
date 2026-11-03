// Build only: never launches the application. Reuse the existing compiler cache
// through an APFS clone so the previous app and executable stay intact.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
const root = process.cwd();
const target = path.join(root, 'staging/desktop-low-impact-target');
const cached = path.join(root, 'src-tauri/target');
const prefix = process.platform === 'darwin' ? ['/usr/bin/nice', '-n', '19', '/usr/sbin/taskpolicy', '-c', 'utility'] : process.platform === 'linux' ? ['/usr/bin/nice', '-n', '19'] : [];
function lowPriority(command, args) { return prefix.length ? { command: prefix[0], args: [...prefix.slice(1), command, ...args] } : { command, args }; }
if (process.platform === 'darwin' && !fs.existsSync(target) && fs.existsSync(cached)) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  console.log('Reusing the compiler cache with an APFS clone; preserving the existing app.');
  // Cloning is metadata-only on APFS. Keep its CPU priority low without
  // placing those tiny filesystem operations behind background I/O delays.
  const copy = { command: '/usr/bin/nice', args: ['-n', '19', '/bin/cp', '-cR', cached, target] };
  const result = spawnSync(copy.command, copy.args, { stdio: 'inherit' });
  if (result.status !== 0) throw Error('The cache clone failed. No full dependency rebuild was started.');
  fs.writeFileSync(path.join(target, '.omnicraft-cache-seeded'), 'APFS clone of the existing compiler cache\n');
}
if (process.platform === 'darwin' && fs.existsSync(target) && fs.existsSync(cached) && !fs.existsSync(path.join(target, '.omnicraft-cache-seeded'))) throw Error('The separate build cache is incomplete. Inspect it before retrying; the existing app was preserved.');
const env = { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=1536', CARGO_TARGET_DIR: target, CARGO_BUILD_JOBS: '1', RAYON_NUM_THREADS: '1', GOMAXPROCS: '1', PATH: `${process.env.HOME}/.cargo/bin:${process.env.PATH}` };
// GUI verification is intentionally disabled for this build command.
delete env.OMNICRAFT_DESKTOP_PROBE_DIR;
const cli = path.join(root, 'node_modules/@tauri-apps/cli/tauri.js');
const job = lowPriority(process.execPath, [cli, 'build', '--debug', '--bundles', 'app', ...process.argv.slice(2)]);
console.log('Building with one Cargo worker and low CPU priority. The app will not be opened.');
const child = spawn(job.command, job.args, { cwd: root, env, stdio: 'inherit' });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? 1; if (signal) console.error(`Build ended with ${signal}`); });
