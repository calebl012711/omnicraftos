// Read only: no checkout, package installation, manifest change, merge or deployment.
import fs from 'node:fs/promises';
const lock = JSON.parse(await fs.readFile('integration/desktop-lock.json', 'utf8'));
const report = { checkedAt: new Date().toISOString(), readOnly: true, source: 'Official crates.io API', results: [] };
for (const component of lock.components) {
  const row = { name: component.name, pinnedVersion: component.version, registryChecksum: component.registryChecksum, repository: component.repository, publisherVcs: component.publisherVcs };
  try {
    const response = await fetch(`https://crates.io/api/v1/crates/${encodeURIComponent(component.name)}`, { headers: { 'User-Agent': 'OmniCraftOS-read-only-upstream-check (https://github.com/calebl012711/omnicraftos)' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw Error(`crates.io HTTP ${response.status}`);
    const data = await response.json();
    row.latestStableVersion = data.crate.max_stable_version;
    row.status = row.latestStableVersion === row.pinnedVersion ? 'same-version' : 'different-version-review-required';
    row.releaseUrl = `https://crates.io/crates/${component.name}/${row.latestStableVersion}`;
  } catch (error) { row.status = 'unknown'; row.error = error.message; process.exitCode = 1; }
  report.results.push(row);
  // Follow crates.io's request-rate guidance without occupying a CPU worker.
  await new Promise(resolve => setTimeout(resolve, 1000));
}
console.log(JSON.stringify(report, null, 2));
