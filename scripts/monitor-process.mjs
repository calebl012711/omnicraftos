import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const rootPid = Number(process.argv[2]);
const output = path.resolve(process.argv[3] || 'verification/process-resources.json');
const intervalMs = 30_000;
if (!Number.isSafeInteger(rootPid) || rootPid < 1) throw Error('Usage: node scripts/monitor-process.mjs PID [report.json]');
await fs.mkdir(path.dirname(output), { recursive: true });
const report = {
  startedAt: new Date().toISOString(), rootPid,
  host: { platform: os.platform(), release: os.release(), architecture: os.arch(), totalMemoryBytes: os.totalmem(), cpu: os.cpus()[0]?.model },
  method: 'ps process tree sampled every 30 seconds. Summed RSS includes shared pages and is not unique physical memory. Host load includes other applications and source builds.',
  samples: []
};
while (true) {
  const rows = execFileSync('ps', ['-axo', 'pid=,ppid=,%cpu=,rss=,comm='], { encoding: 'utf8' }).trim().split('\n').map(line => {
    const match = line.trim().match(/^(\d+)\s+(\d+)\s+([\d.]+)\s+(\d+)\s+(.+)$/);
    return match ? { pid: Number(match[1]), parent: Number(match[2]), cpuPercent: Number(match[3]), rssKiB: Number(match[4]), executable: path.basename(match[5]) } : null;
  }).filter(Boolean);
  if (!rows.some(row => row.pid === rootPid)) { report.endedAt = new Date().toISOString(); break; }
  const included = new Set([rootPid]);
  let previous;
  do { previous = included.size; for (const row of rows) if (included.has(row.parent)) included.add(row.pid); } while (included.size !== previous);
  const processes = rows.filter(row => included.has(row.pid));
  report.samples.push({ at: new Date().toISOString(), summedRssMiB: processes.reduce((sum, row) => sum + row.rssKiB, 0) / 1024, cpuPercent: processes.reduce((sum, row) => sum + row.cpuPercent, 0), hostLoad: os.loadavg(), hostFreeMemoryBytes: os.freemem(), processes });
  await fs.writeFile(output, JSON.stringify(report, null, 2));
  await new Promise(resolve => setTimeout(resolve, intervalMs));
}
await fs.writeFile(output, JSON.stringify(report, null, 2));
