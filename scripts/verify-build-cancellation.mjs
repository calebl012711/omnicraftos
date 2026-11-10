// Exercise real process-group cancellation with sleeping fixtures, never Cargo.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { spawnBuild } from './lib/build-process.mjs';
if (process.platform === 'win32') throw Error('This check exercises the macOS/Unix process-group path.');
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'omnicraft-cancel-'));
const fixture = path.join(directory, 'fixture.mjs');
await fs.writeFile(fixture, `import fs from 'node:fs'; import {spawn} from 'node:child_process';
if(process.argv[2]==='child'){process.on('SIGTERM',()=>{});fs.writeFileSync(process.argv[3],String(process.pid));setInterval(()=>{},10000);}
else{spawn(process.execPath,[process.argv[1],'child',process.argv[2]],{stdio:'ignore'});setInterval(()=>{},10000);}`);
const child = spawnBuild(process.execPath, [fixture, path.join(directory, 'pid')], { stdio: 'ignore' });
const exited = new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal })));
let descendant;
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { descendant = Number(await fs.readFile(path.join(directory, 'pid'), 'utf8')); break; } catch { await new Promise(resolve => setTimeout(resolve, 50)); }
  }
  assert.ok(descendant, 'The sleeping descendant must exist before cancellation');
  process.kill(process.pid, 'SIGTERM');
  const result = await Promise.race([exited, new Promise((_, reject) => { const timer = setTimeout(() => reject(Error('Cancellation did not finish')), 5000); timer.unref(); })]);
  assert.equal(result.signal, 'SIGTERM');
  for (let attempt = 0; attempt < 20; attempt++) {
    let state = '';
    try { state = execFileSync('/bin/ps', ['-p', String(descendant), '-o', 'stat='], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { break; }
    if (!state || state.startsWith('Z')) break;
    if (attempt === 19) throw Error('A build descendant survived cancellation');
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  console.log('Cancellation stopped the fixture and its SIGTERM-resistant descendant; no compiler or app was launched.');
} finally {
  try { process.kill(-child.pid, 'SIGKILL'); } catch {}
  await fs.rm(directory, { recursive: true, force: true });
}
