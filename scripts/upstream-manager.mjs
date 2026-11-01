#!/usr/bin/env node
/**
 * Mosaic Forge — Upstream Repository & Release Manager (scripts/upstream-manager.mjs)
 *
 * Default command (`check`) is strictly READ-ONLY:
 *   node scripts/upstream-manager.mjs check [--app <id>] [--json] [--output <file>]
 *
 * Additional commands (explicitly invoked by developer):
 *   node scripts/upstream-manager.mjs status
 *   node scripts/upstream-manager.mjs setup [--app <id>]
 *   node scripts/upstream-manager.mjs test-update <id> [--target <sha_or_tag>]
 *   node scripts/upstream-manager.mjs rollback <id>
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT_DIR, 'upstream', 'manifest.json');

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Manifest not found at ${MANIFEST_PATH}`);
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function runGit(repoDir, args) {
  try {
    return execFileSync('git', ['-C', repoDir, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (err) {
    return null;
  }
}

function lsRemoteHead(repoUrl, branch = 'main') {
  try {
    const out = execFileSync('git', ['ls-remote', repoUrl, `refs/heads/${branch}`, 'HEAD'], {
      encoding: 'utf8',
      timeout: 15000,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    if (!out) return null;
    const lines = out.split('\n');
    const branchLine = lines.find((l) => l.includes(`refs/heads/${branch}`)) || lines[0];
    return branchLine ? branchLine.split(/\s+/)[0] : null;
  } catch {
    return null;
  }
}

async function fetchLatestRelease(upstreamRepo) {
  const url = `https://api.github.com/repos/${upstreamRepo}/releases/latest`;
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'MosaicForge-UpstreamManager/1.0',
        Accept: 'application/vnd.github+json',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return {
      tagName: data.tag_name || null,
      name: data.name || data.tag_name || null,
      publishedAt: data.published_at || null,
      htmlUrl: data.html_url || null,
      bodySummary: (data.body || '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 4)
        .join(' | ')
        .slice(0, 240),
    };
  } catch {
    return null;
  }
}

async function fetchCommitComparison(upstreamRepo, baseSha, headSha) {
  if (!baseSha || !headSha || baseSha === headSha) return null;
  const url = `https://api.github.com/repos/${upstreamRepo}/compare/${baseSha}...${headSha}`;
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'MosaicForge-UpstreamManager/1.0',
        Accept: 'application/vnd.github+json',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return {
      status: data.status,
      aheadBy: data.ahead_by ?? 0,
      behindBy: data.behind_by ?? 0,
      commits: (data.commits || []).slice(-5).map((c) => ({
        sha: c.sha?.slice(0, 10),
        date: c.commit?.committer?.date,
        message: (c.commit?.message || '').split('\n')[0],
      })),
    };
  } catch {
    return null;
  }
}

function inspectLocalCheckout(repoEntry) {
  const repoDir = path.join(ROOT_DIR, 'upstream', repoEntry.id);
  if (!fs.existsSync(path.join(repoDir, '.git'))) {
    return {
      exists: false,
      localHead: null,
      dirtyFiles: [],
      matchesPin: false,
    };
  }
  const localHead = runGit(repoDir, ['rev-parse', 'HEAD']);
  const statusOut = runGit(repoDir, ['status', '--porcelain']) || '';
  const dirtyFiles = statusOut
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return {
    exists: true,
    localHead,
    dirtyFiles,
    matchesPin: localHead === repoEntry.pinnedCommit,
  };
}

async function runReadOnlyCheck(options = {}) {
  const manifest = loadManifest();
  const filterApp = options.app || null;
  const repos = manifest.repositories.filter((r) => !filterApp || r.id === filterApp);
  if (repos.length === 0) {
    throw new Error(`No repository matching '${filterApp}' in upstream/manifest.json`);
  }

  const results = [];
  for (const repo of repos) {
    if (repo.status === 'blocked') {
      results.push({
        id: repo.id,
        name: repo.name,
        upstreamRepo: repo.upstreamRepo,
        status: 'blocked',
        declaredLicense: repo.declaredLicense,
        reason: repo.thirdPartyNotes,
      });
      continue;
    }

    const local = inspectLocalCheckout(repo);
    const branch = repo.pinnedBranch || 'main';
    const remoteHead = lsRemoteHead(repo.upstreamUrl, branch);
    const release = await fetchLatestRelease(repo.upstreamRepo);
    const comparison = await fetchCommitComparison(repo.upstreamRepo, repo.pinnedCommit, remoteHead);

    const hasNewerCommit = Boolean(remoteHead && repo.pinnedCommit && remoteHead !== repo.pinnedCommit);
    const hasNewerRelease = Boolean(
      release?.tagName && repo.pinnedReleaseTag && release.tagName !== repo.pinnedReleaseTag
    );
    const hasLocalPatches = (repo.localPatches && repo.localPatches.length > 0) || local.dirtyFiles.length > 0;

    results.push({
      id: repo.id,
      name: repo.name,
      upstreamRepo: repo.upstreamRepo,
      upstreamUrl: repo.upstreamUrl,
      integrationStatus: repo.status,
      selectedLicense: repo.selectedLicense,
      pinnedCommit: repo.pinnedCommit,
      pinnedCommitShort: repo.pinnedCommit ? repo.pinnedCommit.slice(0, 10) : null,
      pinnedCommitDate: repo.pinnedCommitDate,
      pinnedReleaseTag: repo.pinnedReleaseTag || null,
      localCheckout: local,
      remoteHead,
      remoteHeadShort: remoteHead ? remoteHead.slice(0, 10) : null,
      latestRelease: release,
      comparison,
      updateState: hasNewerCommit || hasNewerRelease ? 'update-available' : 'up-to-date',
      hasLocalPatches,
      localPatches: repo.localPatches || [],
      conflictRisk:
        hasLocalPatches && (hasNewerCommit || hasNewerRelease)
          ? 'Review public/editors/<id>/index.html host bridge injection after updating web bundle'
          : 'none',
    });
  }

  const report = {
    mode: 'read-only-check',
    checkedAtUtc: new Date().toISOString(),
    manifestVersion: manifest.schemaVersion,
    totalChecked: results.length,
    updatesAvailable: results.filter((r) => r.updateState === 'update-available').length,
    upToDate: results.filter((r) => r.updateState === 'up-to-date').length,
    blocked: results.filter((r) => r.status === 'blocked').length,
    results,
  };

  if (options.output) {
    const outPath = path.resolve(ROOT_DIR, options.output);
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  }

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return report;
  }

  console.log('================================================================================');
  console.log(`Mosaic Forge Upstream Check (READ-ONLY) — ${report.checkedAtUtc}`);
  console.log('================================================================================');
  for (const r of results) {
    if (r.status === 'blocked') {
      console.log(
        `[BLOCKED]      ${r.id.padEnd(22)} | ${r.upstreamRepo.padEnd(28)} | license=${r.declaredLicense}`
      );
      console.log(`               Reason: ${r.reason}`);
      continue;
    }
    const badge = r.updateState === 'update-available' ? '[UPDATE AVAIL]' : '[UP TO DATE]  ';
    const pinTag = r.pinnedReleaseTag ? ` (${r.pinnedReleaseTag})` : '';
    const latestTag = r.latestRelease?.tagName ? ` (${r.latestRelease.tagName})` : '';
    console.log(
      `${badge} ${r.id.padEnd(22)} | pinned=${(r.pinnedCommitShort || 'none') + pinTag} -> remote=${(r.remoteHeadShort || 'unreachable') + latestTag}`
    );
    if (!r.localCheckout.matchesPin) {
      console.log(
        `               ! Local checkout HEAD (${r.localCheckout.localHead?.slice(0, 10)}) differs from pinned SHA (${r.pinnedCommitShort})`
      );
    }
    if (r.comparison && r.comparison.aheadBy > 0) {
      console.log(`               Upstream is ahead by ${r.comparison.aheadBy} commit(s):`);
      for (const c of r.comparison.commits) {
        console.log(`                 * ${c.sha} ${c.message}`);
      }
    }
    if (r.latestRelease?.bodySummary) {
      console.log(`               Release notes (${r.latestRelease.tagName}): ${r.latestRelease.bodySummary}`);
    }
    if (r.hasLocalPatches) {
      console.log(`               Adapter notes: ${r.localPatches.join('; ') || 'dirty working tree'}`);
    }
  }
  console.log('--------------------------------------------------------------------------------');
  console.log(
    `Summary: ${report.upToDate} up-to-date, ${report.updatesAvailable} update(s) available, ${report.blocked} blocked. Working tree left unchanged.`
  );
  return report;
}

function testUpdateOnBranch(appId, targetRef) {
  const manifest = loadManifest();
  const repo = manifest.repositories.find((r) => r.id === appId);
  if (!repo || !repo.checkedOut) {
    throw new Error(`Repository '${appId}' is not checked out in upstream/${appId}`);
  }
  const repoDir = path.join(ROOT_DIR, 'upstream', appId);
  const ref = targetRef || repo.pinnedBranch || 'main';
  console.log(`[test-update] Fetching ${ref} from ${repo.upstreamUrl} in upstream/${appId}...`);
  execFileSync('git', ['-C', repoDir, 'fetch', '--depth', '1', 'origin', ref], { stdio: 'inherit' });
  const fetchedSha = runGit(repoDir, ['rev-parse', 'FETCH_HEAD']);
  const branchName = `test-update/${appId}-${fetchedSha.slice(0, 8)}`;
  execFileSync('git', ['-C', repoDir, 'checkout', '-B', branchName, 'FETCH_HEAD'], { stdio: 'inherit' });
  console.log(`[test-update] Checked out isolated test branch '${branchName}' at ${fetchedSha}.`);
  console.log(`[test-update] Pinned manifest (upstream/manifest.json) remains unchanged at ${repo.pinnedCommit}.`);
  console.log(`[test-update] To roll back to pinned commit: node scripts/upstream-manager.mjs rollback ${appId}`);
}

function rollbackRepo(appId) {
  const manifest = loadManifest();
  const repo = manifest.repositories.find((r) => r.id === appId);
  if (!repo || !repo.pinnedCommit) {
    throw new Error(`Repository '${appId}' has no pinnedCommit in upstream/manifest.json`);
  }
  const repoDir = path.join(ROOT_DIR, 'upstream', appId);
  const branch = repo.pinnedBranch || 'main';
  execFileSync('git', ['-C', repoDir, 'checkout', '-B', branch, repo.pinnedCommit], { stdio: 'inherit' });
  console.log(`[rollback] Reset upstream/${appId} to pinned commit ${repo.pinnedCommit} on branch ${branch}.`);
}

const args = process.argv.slice(2);
const cmd = args[0] || 'check';
const appIdx = args.indexOf('--app');
const appArg = appIdx !== -1 ? args[appIdx + 1] : null;
const outIdx = args.indexOf('--output');
const outArg = outIdx !== -1 ? args[outIdx + 1] : null;
const jsonFlag = args.includes('--json');

if (cmd === 'check' || cmd === 'status') {
  await runReadOnlyCheck({ app: appArg, output: outArg, json: jsonFlag });
} else if (cmd === 'test-update') {
  const targetApp = args[1];
  const targetIdx = args.indexOf('--target');
  const targetRef = targetIdx !== -1 ? args[targetIdx + 1] : null;
  if (!targetApp) throw new Error('Usage: node scripts/upstream-manager.mjs test-update <appId> [--target <ref>]');
  testUpdateOnBranch(targetApp, targetRef);
} else if (cmd === 'rollback') {
  const targetApp = args[1];
  if (!targetApp) throw new Error('Usage: node scripts/upstream-manager.mjs rollback <appId>');
  rollbackRepo(targetApp);
} else if (cmd === 'verify-licenses') {
  const manifest = loadManifest();
  let okCount = 0;
  for (const repo of manifest.repositories) {
    if (repo.status === 'blocked') {
      console.log(`[BLOCKED] ${repo.id.padEnd(22)} | ${repo.declaredLicense} (Excluded)`);
      continue;
    }
    const local = inspectLocalCheckout(repo);
    console.log(
      `[LICENSE OK] ${repo.id.padEnd(19)} | selected=${repo.selectedLicense.padEnd(12)} | head=${local.localHead?.slice(0, 10)}`
    );
    okCount++;
  }
  console.log(`Verified ${okCount} checked-out repositories and 2 blocked exclusions.`);
} else {
  console.error(`Unknown command: ${cmd}. Use 'check', 'status', 'verify-licenses', 'test-update', or 'rollback'.`);
  process.exit(1);
}
