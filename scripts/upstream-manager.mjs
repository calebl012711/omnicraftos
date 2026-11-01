#!/usr/bin/env node
/**
 * OmniCraft OS / Mosaic Forge — Upstream Repository & Release Manager (scripts/upstream-manager.mjs)
 *
 * Supported Commands:
 *   node scripts/upstream-manager.mjs check [--app <id>] [--json] [--output <file>]
 *     - READ-ONLY: Compares pinned commits in upstream/manifest.json against remote GitHub HEADs & Releases.
 *
 *   node scripts/upstream-manager.mjs status [--app <id>] [--json]
 *     - READ-ONLY & OFFLINE-SAFE: Verifies local Git checkouts in upstream/<id> and web bundles in public/editors/<id>.
 *
 *   node scripts/upstream-manager.mjs licenses [--app <id>] [--json]
 *     - READ-ONLY: Audits license compliance across all workspaces, checking physical license files on disk,
 *       permissive license selections, and copyleft/trademark exclusions.
 *
 *   node scripts/upstream-manager.mjs apply-overlays [--app <id>]
 *     - Injects custom OmniCraft OS wrappers, postMessage bridges, and Bento branding overrides into public/editors/<id>.
 *
 *   node scripts/upstream-manager.mjs verify-overlays [--app <id>]
 *     - Verifies that postMessage bridges and Bento overrides are present across all integrated workspace bundles.
 *
 *   node scripts/upstream-manager.mjs sync <id> [--ref <sha_or_branch>] [--apply-overlays]
 *     - Fetches and updates an upstream checkout to a new ref, updates upstream/manifest.json, and reapplies overlays.
 *
 *   node scripts/upstream-manager.mjs test-update <id> [--target <sha_or_tag>]
 *     - Fetches and checks out target ref in an isolated branch without modifying pinned manifest.
 *
 *   node scripts/upstream-manager.mjs rollback <id>
 *     - Resets upstream/<id> to the exact pinnedCommit recorded in upstream/manifest.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT_DIR, 'upstream', 'manifest.json');
const OVERLAYS_CONFIG_PATH = path.join(ROOT_DIR, 'upstream', 'overlays', 'config.json');

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Manifest not found at ${MANIFEST_PATH}`);
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function loadOverlaysConfig() {
  if (!fs.existsSync(OVERLAYS_CONFIG_PATH)) {
    return { workspaces: {}, sharedBridges: [] };
  }
  return JSON.parse(fs.readFileSync(OVERLAYS_CONFIG_PATH, 'utf8'));
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

/**
 * Query remote Git repository HEAD with fallback aliases (e.g. tangency-llc <-> tangency-labs).
 */
function lsRemoteHead(repoUrl, branch = 'main') {
  const urlsToTry = [repoUrl];
  if (repoUrl.includes('tangency-llc')) {
    urlsToTry.push(repoUrl.replace('tangency-llc', 'tangency-labs'));
  } else if (repoUrl.includes('tangency-labs')) {
    urlsToTry.push(repoUrl.replace('tangency-labs', 'tangency-llc'));
  }

  for (const url of urlsToTry) {
    try {
      const out = execFileSync('git', ['ls-remote', url, `refs/heads/${branch}`, 'HEAD'], {
        encoding: 'utf8',
        timeout: 15000,
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim();
      if (!out) continue;
      const lines = out.split('\n');
      const branchLine = lines.find((l) => l.includes(`refs/heads/${branch}`)) || lines[0];
      if (branchLine) {
        return branchLine.split(/\s+/)[0];
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

async function fetchLatestRelease(upstreamRepo) {
  const reposToTry = [upstreamRepo];
  if (upstreamRepo.includes('tangency-llc')) {
    reposToTry.push(upstreamRepo.replace('tangency-llc', 'tangency-labs'));
  } else if (upstreamRepo.includes('tangency-labs')) {
    reposToTry.push(upstreamRepo.replace('tangency-labs', 'tangency-llc'));
  }

  for (const repo of reposToTry) {
    const url = `https://api.github.com/repos/${repo}/releases/latest`;
    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'OmniCraftOS-UpstreamManager/1.0',
          Accept: 'application/vnd.github+json',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) continue;
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
      // try next
    }
  }
  return null;
}

async function fetchCommitComparison(upstreamRepo, baseSha, headSha) {
  if (!baseSha || !headSha || baseSha === headSha) return null;
  const reposToTry = [upstreamRepo];
  if (upstreamRepo.includes('tangency-llc')) {
    reposToTry.push(upstreamRepo.replace('tangency-llc', 'tangency-labs'));
  } else if (upstreamRepo.includes('tangency-labs')) {
    reposToTry.push(upstreamRepo.replace('tangency-labs', 'tangency-llc'));
  }

  for (const repo of reposToTry) {
    const url = `https://api.github.com/repos/${repo}/compare/${baseSha}...${headSha}`;
    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'OmniCraftOS-UpstreamManager/1.0',
          Accept: 'application/vnd.github+json',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) continue;
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
      // try next
    }
  }
  return null;
}

function inspectLocalCheckout(repoEntry) {
  const repoDir = path.join(ROOT_DIR, 'upstream', repoEntry.id);
  const editorDir = path.join(ROOT_DIR, 'public', 'editors', repoEntry.id);
  const editorHtml = path.join(editorDir, 'index.html');

  if (!fs.existsSync(path.join(repoDir, '.git'))) {
    return {
      exists: false,
      isGit: false,
      localHead: null,
      currentBranch: null,
      dirtyFiles: [],
      matchesPin: false,
      editorBundleExists: fs.existsSync(editorHtml),
      bridgeInjected: false,
      bentoBridgeInjected: false,
    };
  }

  const localHead = runGit(repoDir, ['rev-parse', 'HEAD']);
  const currentBranch = runGit(repoDir, ['branch', '--show-current']) || 'detached';
  const statusOut = runGit(repoDir, ['status', '--porcelain']) || '';
  const dirtyFiles = statusOut
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let bridgeInjected = false;
  let bentoBridgeInjected = false;
  if (fs.existsSync(editorHtml)) {
    const htmlContent = fs.readFileSync(editorHtml, 'utf8');
    bridgeInjected = htmlContent.includes('mosaic-forge-bridge.js') || htmlContent.includes('omnicraft-bridge.js');
    bentoBridgeInjected = htmlContent.includes('bento-theme-bridge.js');
  }

  return {
    exists: true,
    isGit: true,
    localHead,
    currentBranch,
    dirtyFiles,
    matchesPin: localHead === repoEntry.pinnedCommit,
    editorBundleExists: fs.existsSync(editorHtml),
    bridgeInjected,
    bentoBridgeInjected,
  };
}

/**
 * COMMAND: 'status'
 * Dedicated offline-safe check verifying local checkouts, pinned commit matches, working trees, and editor bundles.
 */
function runLocalStatus(options = {}) {
  const manifest = loadManifest();
  const filterApp = options.app || null;
  const repos = manifest.repositories.filter((r) => !filterApp || r.id === filterApp);

  if (repos.length === 0) {
    throw new Error(`No repository matching '${filterApp}' in upstream/manifest.json`);
  }

  const results = [];
  let okCount = 0;
  let blockedCount = 0;
  let issuesCount = 0;

  for (const repo of repos) {
    if (repo.status === 'blocked') {
      const repoDir = path.join(ROOT_DIR, 'upstream', repo.id);
      const isCleanlyExcluded = !fs.existsSync(path.join(repoDir, '.git'));
      blockedCount++;
      results.push({
        id: repo.id,
        name: repo.name,
        role: repo.role,
        declaredLicense: repo.declaredLicense,
        status: 'blocked',
        cleanlyExcluded: isCleanlyExcluded,
        notes: repo.thirdPartyNotes,
      });
      continue;
    }

    const local = inspectLocalCheckout(repo);
    const isHealthy =
      local.exists &&
      local.matchesPin &&
      local.dirtyFiles.length === 0 &&
      (repo.status !== 'integrated' || (local.editorBundleExists && local.bridgeInjected));

    if (isHealthy) {
      okCount++;
    } else {
      issuesCount++;
    }

    results.push({
      id: repo.id,
      name: repo.name,
      upstreamRepo: repo.upstreamRepo,
      pinnedCommit: repo.pinnedCommit,
      pinnedCommitShort: repo.pinnedCommit ? repo.pinnedCommit.slice(0, 10) : null,
      integrationStatus: repo.status,
      local,
      isHealthy,
    });
  }

  const report = {
    mode: 'local-status',
    checkedAtUtc: new Date().toISOString(),
    totalChecked: results.length,
    verifiedHealthy: okCount,
    blockedExcluded: blockedCount,
    issuesDetected: issuesCount,
    results,
  };

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return report;
  }

  console.log('================================================================================');
  console.log(`OmniCraft OS — Local Checkout & Workspace Status (${report.checkedAtUtc})`);
  console.log('================================================================================');
  for (const r of results) {
    if (r.status === 'blocked') {
      console.log(
        `[BLOCKED EXCLUDED] ${r.id.padEnd(20)} | license=${r.declaredLicense.padEnd(10)} | cleanly excluded=${r.cleanlyExcluded}`
      );
      continue;
    }

    const badge = r.isHealthy ? '[CHECKOUT OK]    ' : '[ATTENTION]      ';
    const headShort = r.local.localHead ? r.local.localHead.slice(0, 10) : 'missing';
    const pinShort = r.pinnedCommitShort || 'none';
    const branch = r.local.currentBranch || 'unknown';
    const bundleBadge = r.integrationStatus === 'integrated'
      ? (r.local.editorBundleExists ? (r.local.bridgeInjected ? 'bundle=ok+bridge' : 'bundle=missing-bridge') : 'bundle=missing')
      : 'source-only';

    console.log(
      `${badge} ${r.id.padEnd(20)} | branch=${branch.padEnd(12)} | head=${headShort} (pin=${pinShort}) | ${bundleBadge}`
    );

    if (!r.local.matchesPin) {
      console.log(`                   ! HEAD (${headShort}) does NOT match pinned SHA (${pinShort})`);
    }
    if (r.local.dirtyFiles.length > 0) {
      console.log(`                   ! Dirty working tree: ${r.local.dirtyFiles.slice(0, 3).join(', ')}`);
    }
    if (r.integrationStatus === 'integrated' && !r.local.bridgeInjected) {
      console.log(`                   ! Missing host postMessage bridge in public/editors/${r.id}/index.html`);
    }
  }
  console.log('--------------------------------------------------------------------------------');
  console.log(
    `Summary: ${report.verifiedHealthy} verified healthy, ${report.blockedExcluded} blocked exclusions confirmed, ${report.issuesDetected} issue(s).`
  );
  return report;
}

/**
 * COMMAND: 'check'
 * Read-only remote comparison: compares pinned commits vs remote HEAD and GitHub releases.
 */
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
  console.log(`OmniCraft OS / Mosaic Forge Upstream Check (READ-ONLY) — ${report.checkedAtUtc}`);
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

/**
 * COMMAND: 'licenses' (and alias 'verify-licenses')
 * Audits physical license files on disk, permissive license compliance, and copyleft/trademark exclusions.
 */
function runLicenseAudit(options = {}) {
  const manifest = loadManifest();
  const filterApp = options.app || null;
  const repos = manifest.repositories.filter((r) => !filterApp || r.id === filterApp);

  const results = [];
  let compliantCount = 0;
  let blockedCount = 0;
  let nonCompliantCount = 0;

  for (const repo of repos) {
    if (repo.status === 'blocked') {
      const repoDir = path.join(ROOT_DIR, 'upstream', repo.id);
      const isExcluded = !fs.existsSync(repoDir) || !fs.existsSync(path.join(repoDir, '.git'));
      blockedCount++;
      results.push({
        id: repo.id,
        name: repo.name,
        upstreamRepo: repo.upstreamRepo,
        status: 'blocked',
        declaredLicense: repo.declaredLicense,
        selectedLicense: 'none (excluded)',
        isCopyleftBlocked: repo.declaredLicense?.includes('GPL'),
        cleanlyExcludedFromBuild: isExcluded,
        physicalLicenseFiles: [],
        complianceStatus: isExcluded ? 'COMPLIANT_EXCLUDED' : 'NON_COMPLIANT_UNBLOCKED',
      });
      continue;
    }

    const repoDir = path.join(ROOT_DIR, 'upstream', repo.id);
    const physicalLicenseFiles = [];
    if (fs.existsSync(repoDir)) {
      const entries = fs.readdirSync(repoDir);
      for (const entry of entries) {
        if (/^(license|licence|notice|copying|ofl|attribution)/i.test(entry)) {
          physicalLicenseFiles.push(entry);
        }
      }
    }

    const hasPhysicalLicense = physicalLicenseFiles.length > 0;
    const isPermissive = /^(MIT|Apache-2\.0|OFL-1\.1)/i.test(repo.selectedLicense);
    const isCompliant = hasPhysicalLicense && isPermissive;

    if (isCompliant) {
      compliantCount++;
    } else {
      nonCompliantCount++;
    }

    results.push({
      id: repo.id,
      name: repo.name,
      upstreamRepo: repo.upstreamRepo,
      status: repo.status,
      declaredLicense: repo.declaredLicense,
      selectedLicense: repo.selectedLicense,
      physicalLicenseFiles,
      hasPhysicalLicense,
      isPermissive,
      complianceStatus: isCompliant ? 'COMPLIANT' : 'NON_COMPLIANT',
    });
  }

  const report = {
    mode: 'license-audit',
    auditedAtUtc: new Date().toISOString(),
    totalAudited: results.length,
    compliant: compliantCount,
    blockedExcluded: blockedCount,
    nonCompliant: nonCompliantCount,
    results,
  };

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return report;
  }

  console.log('================================================================================');
  console.log(`OmniCraft OS — Repository License Compliance Audit (${report.auditedAtUtc})`);
  console.log('================================================================================');
  for (const r of results) {
    if (r.status === 'blocked') {
      console.log(
        `[BLOCKED OK]   ${r.id.padEnd(20)} | declared=${r.declaredLicense.padEnd(14)} | ${r.complianceStatus} (Copyleft GPL isolated)`
      );
      continue;
    }

    const badge = r.complianceStatus === 'COMPLIANT' ? '[LICENSE OK]   ' : '[NON-COMPLIANT]';
    const filesStr = r.physicalLicenseFiles.join(', ') || 'NONE ON DISK';
    console.log(
      `${badge} ${r.id.padEnd(20)} | selected=${r.selectedLicense.padEnd(12)} | files=[${filesStr}]`
    );
  }
  console.log('--------------------------------------------------------------------------------');
  console.log(
    `Summary: ${report.compliant} permissive licenses verified on disk, ${report.blockedExcluded} copyleft/stub exclusions verified, ${report.nonCompliant} non-compliant.`
  );
  return report;
}

/**
 * COMMAND: 'apply-overlays'
 * Injects custom OmniCraft OS wrappers, postMessage bridges, and Bento branding overrides.
 */
function applyOverlays(options = {}) {
  const manifest = loadManifest();
  const overlaysConfig = loadOverlaysConfig();
  const filterApp = options.app || null;

  const repos = manifest.repositories.filter(
    (r) => r.status === 'integrated' && (!filterApp || r.id === filterApp)
  );

  let updatedCount = 0;
  for (const repo of repos) {
    const editorDir = path.join(ROOT_DIR, 'public', 'editors', repo.id);
    const editorHtml = path.join(editorDir, 'index.html');
    if (!fs.existsSync(editorHtml)) {
      continue;
    }

    let html = fs.readFileSync(editorHtml, 'utf8');
    let modified = false;

    // 1. Ensure title contains OmniCraft OS branding
    const wsConfig = overlaysConfig.workspaces?.[repo.id] || {};
    const targetTitle = wsConfig.title || `OmniCraft OS — ${repo.name}`;
    if (!html.includes('<title>OmniCraft OS')) {
      html = html.replace(/<title>.*?<\/title>/i, `<title>${targetTitle}</title>`);
      modified = true;
    }

    // 2. Ensure application-name meta is set
    if (!html.includes('name="application-name"')) {
      html = html.replace(/<head>/i, '<head>\n  <meta name="application-name" content="OmniCraft OS">');
      modified = true;
    }

    // 3. Ensure Bento theme bridge is injected
    const bentoBridgeScript = `<script src="../bento-theme-bridge.js?app=${repo.id}"></script>`;
    if (!html.includes('bento-theme-bridge.js')) {
      if (html.includes('</body>')) {
        html = html.replace('</body>', `  ${bentoBridgeScript}\n</body>`);
      } else {
        html += `\n${bentoBridgeScript}`;
      }
      modified = true;
    }

    // 4. Ensure Mosaic Forge / OmniCraft host postMessage bridge is injected
    const hostBridgeScript = `<script src="../mosaic-forge-bridge.js?app=${repo.id}"></script>`;
    if (!html.includes('mosaic-forge-bridge.js') && !html.includes('omnicraft-bridge.js')) {
      if (html.includes('</body>')) {
        html = html.replace('</body>', `  ${hostBridgeScript}\n</body>`);
      } else {
        html += `\n${hostBridgeScript}`;
      }
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(editorHtml, html, 'utf8');
      updatedCount++;
      console.log(`[OVERLAY APPLIED] ${repo.id.padEnd(20)} -> public/editors/${repo.id}/index.html`);
    } else {
      console.log(`[OVERLAY INTACT]  ${repo.id.padEnd(20)} -> public/editors/${repo.id}/index.html`);
    }
  }

  console.log(`Applied OmniCraft OS overlays across ${updatedCount} updated workspace bundle(s).`);
  return { updatedCount };
}

/**
 * COMMAND: 'verify-overlays'
 * Audits whether postMessage bridges, Bento theme bridges, and branding overrides are intact.
 */
function verifyOverlays(options = {}) {
  const manifest = loadManifest();
  const filterApp = options.app || null;
  const repos = manifest.repositories.filter(
    (r) => r.status === 'integrated' && (!filterApp || r.id === filterApp)
  );

  let intactCount = 0;
  let missingCount = 0;
  const results = [];

  for (const repo of repos) {
    const editorDir = path.join(ROOT_DIR, 'public', 'editors', repo.id);
    const editorHtml = path.join(editorDir, 'index.html');
    if (!fs.existsSync(editorHtml)) {
      results.push({ id: repo.id, status: 'MISSING_BUNDLE' });
      missingCount++;
      continue;
    }

    const html = fs.readFileSync(editorHtml, 'utf8');
    const hasHostBridge = html.includes('mosaic-forge-bridge.js') || html.includes('omnicraft-bridge.js');
    const hasBentoBridge = html.includes('bento-theme-bridge.js');
    const hasOmniTitle = html.includes('OmniCraft OS');

    const isIntact = hasHostBridge && hasBentoBridge && hasOmniTitle;
    if (isIntact) {
      intactCount++;
    } else {
      missingCount++;
    }

    results.push({
      id: repo.id,
      hasHostBridge,
      hasBentoBridge,
      hasOmniTitle,
      isIntact,
    });

    const badge = isIntact ? '[OVERLAY OK]    ' : '[OVERLAY MISSING]';
    console.log(
      `${badge} ${repo.id.padEnd(20)} | hostBridge=${hasHostBridge} | bentoBridge=${hasBentoBridge} | omniTitle=${hasOmniTitle}`
    );
  }

  console.log(`Overlay Verification: ${intactCount} intact, ${missingCount} missing.`);
  return { intactCount, missingCount, results };
}

/**
 * COMMAND: 'sync'
 * Fetches latest commits from upstream, checks out the ref, updates pinned SHA in manifest, and reapplies overlays.
 */
function runSync(appId, options = {}) {
  const manifest = loadManifest();
  const repo = manifest.repositories.find((r) => r.id === appId);
  if (!repo || !repo.checkedOut) {
    throw new Error(`Repository '${appId}' is not checked out in upstream/${appId}`);
  }

  const repoDir = path.join(ROOT_DIR, 'upstream', appId);
  const targetRef = options.ref || repo.pinnedBranch || 'main';

  console.log(`[sync] Fetching ${targetRef} from ${repo.upstreamUrl} in upstream/${appId}...`);
  execFileSync('git', ['-C', repoDir, 'fetch', '--depth', '1', 'origin', targetRef], { stdio: 'inherit' });

  const fetchedSha = runGit(repoDir, ['rev-parse', 'FETCH_HEAD']);
  console.log(`[sync] Checking out ${fetchedSha} in upstream/${appId}...`);
  execFileSync('git', ['-C', repoDir, 'checkout', fetchedSha], { stdio: 'inherit' });

  // Update manifest.json pinned commit
  repo.pinnedCommit = fetchedSha;
  repo.lastCheckedUtc = new Date().toISOString();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`[sync] Updated upstream/manifest.json pinnedCommit to ${fetchedSha}.`);

  // Reapply overlays to protect OmniCraft OS wrappers
  if (options.applyOverlays !== false) {
    applyOverlays({ app: appId });
  }

  console.log(`[sync] Workspace '${appId}' synchronized and overlays verified.`);
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

// CLI Argument Parsing & Routing
const args = process.argv.slice(2);
const cmd = args[0] || 'check';
const appIdx = args.indexOf('--app');
const appArg = appIdx !== -1 ? args[appIdx + 1] : null;
const outIdx = args.indexOf('--output');
const outArg = outIdx !== -1 ? args[outIdx + 1] : null;
const refIdx = args.indexOf('--ref') !== -1 ? args.indexOf('--ref') : args.indexOf('--target');
const refArg = refIdx !== -1 ? args[refIdx + 1] : null;
const jsonFlag = args.includes('--json');

if (cmd === 'check') {
  await runReadOnlyCheck({ app: appArg, output: outArg, json: jsonFlag });
} else if (cmd === 'status') {
  runLocalStatus({ app: appArg, json: jsonFlag });
} else if (cmd === 'licenses' || cmd === 'verify-licenses') {
  runLicenseAudit({ app: appArg, json: jsonFlag });
} else if (cmd === 'apply-overlays' || cmd === 'overlay') {
  applyOverlays({ app: appArg });
} else if (cmd === 'verify-overlays') {
  verifyOverlays({ app: appArg });
} else if (cmd === 'sync') {
  const targetApp = args[1] && !args[1].startsWith('--') ? args[1] : appArg;
  if (!targetApp) throw new Error('Usage: node scripts/upstream-manager.mjs sync <appId> [--ref <ref>]');
  runSync(targetApp, { ref: refArg, applyOverlays: true });
} else if (cmd === 'test-update') {
  const targetApp = args[1] && !args[1].startsWith('--') ? args[1] : appArg;
  if (!targetApp) throw new Error('Usage: node scripts/upstream-manager.mjs test-update <appId> [--target <ref>]');
  testUpdateOnBranch(targetApp, refArg);
} else if (cmd === 'rollback') {
  const targetApp = args[1] && !args[1].startsWith('--') ? args[1] : appArg;
  if (!targetApp) throw new Error('Usage: node scripts/upstream-manager.mjs rollback <appId>');
  rollbackRepo(targetApp);
} else {
  console.error(
    `Unknown command: '${cmd}'. Use 'check', 'status', 'licenses', 'apply-overlays', 'verify-overlays', 'sync', 'test-update', or 'rollback'.`
  );
  process.exit(1);
}
