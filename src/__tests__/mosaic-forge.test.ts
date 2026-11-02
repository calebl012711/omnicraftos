import { describe, expect, it } from 'vitest';
import { DEFAULT_BRANDING } from '../config/branding';
import { BLOCKED_REPOSITORIES, WORKSPACES } from '../config/workspaces';
import { inferCompatibleWorkspaces } from '../storage/db';
import { isSameOriginEvent } from '../utils/origin';

describe('OmniCraft OS Suite Configuration & Architecture', () => {
  it('maintains a centralized, easily rebrandable configuration with explicit domain verification state and theme tokens', () => {
    expect(DEFAULT_BRANDING.productName).toBe('OmniCraft OS');
    expect(DEFAULT_BRANDING.shortName).toBe('OmniCraft');
    expect(DEFAULT_BRANDING.tagline).toBe('Your creative workbench');
    expect(DEFAULT_BRANDING.candidateDomain).toBe('omnicraftos.com');
    expect(DEFAULT_BRANDING.accentPrimary).toBe('#0f172a');
    expect(DEFAULT_BRANDING.accentSecondary).toBe('#10b981');
    expect(DEFAULT_BRANDING.logoPath).toBe('/omnicraft-mark.svg');

    // Live domain check metadata
    expect(DEFAULT_BRANDING.domainCheck.domain).toBe('omnicraftos.com');
    expect(DEFAULT_BRANDING.domainCheck.available).toBe(null);
    expect(DEFAULT_BRANDING.domainCheck.purchased).toBe(false);
    expect(DEFAULT_BRANDING.domainCheck.statusSummary).toContain('UNKNOWN');
    expect(DEFAULT_BRANDING.domainCheck.registrar).toBe('Unknown');

    // Bento Theme tokens verification
    expect(DEFAULT_BRANDING.bentoTheme).toBeDefined();
    const bento = DEFAULT_BRANDING.bentoTheme!;
    expect(bento.cardRadius).toBe('14px');
    expect(bento.cardBorder).toContain('1px solid');
    expect(bento.cardBorderSubtle).toBeDefined();
    expect(bento.cardBorderStrong).toBeDefined();
    expect(bento.cardBorderHover).toContain('16, 185, 129');

    // Crisp typography tokens
    expect(bento.typography.fontSans).toContain('Inter');
    expect(bento.typography.fontMono).toContain('JetBrains Mono');
    expect(bento.typography.trackingTight).toBe('-0.02em');

    // Clean dark/light mode surface tokens
    expect(bento.surfaces.dark.canvas).toBe('#090b10');
    expect(bento.surfaces.dark.surface).toBe('#11151f');
    expect(bento.surfaces.dark.textPrimary).toBe('#f3f6fc');
    expect(bento.surfaces.light.canvas).toBe('#f8fafc');
    expect(bento.surfaces.light.surface).toBe('#ffffff');
    expect(bento.surfaces.light.textPrimary).toBe('#0f172a');
  });

  it('registers retained workspaces and the actual browser music integration with explicit verification states', () => {
    const integrated = WORKSPACES.filter((w) => w.integrationLevel === 'integrated');
    const sourceOnly = WORKSPACES.filter((w) => w.integrationLevel === 'source-only');
    expect(integrated.length).toBe(19);
    expect(sourceOnly.length).toBe(1);
    expect(sourceOnly[0].id).toBe('fieldcraft');

    const river = WORKSPACES.find((w) => w.id === 'riverstudio');
    const studiocut = WORKSPACES.find((w) => w.id === 'studiocut');
    const bandforge = WORKSPACES.find((w) => w.id === 'bandforge');
    const flstudio = WORKSPACES.find((w) => w.id === 'flstudio');
    expect(river?.exportFormats).toContain('.mp4 (when supported)');
    expect(river?.exportFormats).toContain('.webm');
    expect(river?.verificationStatus).toBe('partially tested');
    expect(WORKSPACES.find(w => w.id === 'music')?.upstreamRepo).toBe('https://github.com/naomiaro/waveform-playlist');
    expect(studiocut?.windowApiGlobal).toBe('studiocut');
    expect(bandforge?.windowApiGlobal).toBe('bandforge');
    expect(flstudio?.windowApiGlobal).toBe('flstudio');

    expect(BLOCKED_REPOSITORIES.length).toBe(2);
    const pcb = BLOCKED_REPOSITORIES.find((b) => b.id === 'pcbcraft');
    expect(pcb?.licenseDeclared).toBe('GPL-3.0');
    expect(pcb?.status).toBe('blocked');
  });

  it('keeps SolidCraft (3D B-rep CAD) and CADCraft (2D DXF/DWG drafting) distinct', () => {
    const solidcraft = WORKSPACES.find((w) => w.id === 'solidcraft');
    const cadcraft = WORKSPACES.find((w) => w.id === 'cadcraft');
    expect(solidcraft).toBeDefined();
    expect(cadcraft).toBeDefined();
    expect(solidcraft?.exportFormats).toContain('.step');
    expect(solidcraft?.exportFormats).toContain('.stl');
    expect(cadcraft?.exportFormats).toContain('.dxf');
    expect(solidcraft?.editorUrl).not.toBe(cadcraft?.editorUrl);
  });

  it('maps cross-workspace handoff formats accurately across video, ISO recording, DAW, and CAD workspaces', () => {
    expect(inferCompatibleWorkspaces('motor_adapter_plate.step')).toEqual(['solidcraft']);
    expect(inferCompatibleWorkspaces('motor_plate.dxf')).toEqual(['cadcraft']);
    expect(inferCompatibleWorkspaces('clip.mp4')).toEqual([
      'studiocut',
      'filmcraft',
      'riverstudio',
      'effectcraft'
    ]);
    expect(inferCompatibleWorkspaces('tone.wav')).toContain('soundcraft');
    expect(inferCompatibleWorkspaces('tone.wav')).toContain('bandforge');
    expect(inferCompatibleWorkspaces('tone.wav')).toContain('flstudio');
    expect(inferCompatibleWorkspaces('badge.svg')).toContain('vectorcraft');
    expect(inferCompatibleWorkspaces('plate.png')).toContain('photocraft');
  });

  it('rejects null and untrusted origins in postMessage validation', () => {
    const fakeNullEvent = { origin: 'null' } as MessageEvent;
    expect(isSameOriginEvent(fakeNullEvent)).toBe(false);
    const fakeEmptyEvent = { origin: '' } as MessageEvent;
    expect(isSameOriginEvent(fakeEmptyEvent)).toBe(false);
  });

  it('validates SolidCraft 3D CAD and CADCraft 2D Drafting Bento engineering shells and OmniCraft OS protocols', async () => {
    const fs = await import('fs');
    const path = await import('path');

    // 1. SolidCraft 3D CAD Audit
    const solidcraftHtml = fs.readFileSync(path.resolve('public/editors/solidcraft/index.html'), 'utf-8');
    const solidcraftCss = fs.readFileSync(path.resolve('public/editors/solidcraft/bento-cad-shell.css'), 'utf-8');
    const solidcraftJs = fs.readFileSync(path.resolve('public/editors/solidcraft/bento-cad-shell.js'), 'utf-8');
    const solidcraftWasmExists = fs.existsSync(path.resolve('public/editors/solidcraft/solidcraft-web-4b1d77a936edaef2_bg.wasm'));

    expect(solidcraftHtml).toContain('bento-header');
    expect(solidcraftHtml).toContain('bento-telemetry-strip');
    expect(solidcraftHtml).toContain('bento_mesh_hud');
    expect(solidcraftHtml).toContain('solidcraft_loading');
    expect(solidcraftHtml).toContain('TILE 02 // 3D MESH HUD');
    expect(solidcraftCss).toContain('--bento-font-sans');
    expect(solidcraftCss).toContain('--bento-font-mono');
    expect(solidcraftCss).toContain('--bento-border-subtle');
    expect(solidcraftJs).toContain('omnicraft:theme-change');
    expect(solidcraftJs).toContain('omnicraft:import-cad');
    expect(solidcraftJs).toContain('omnicraft:export-ready');
    expect(solidcraftWasmExists).toBe(true);

    // 2. CADCraft 2D Drafting Audit
    const cadcraftHtml = fs.readFileSync(path.resolve('public/editors/cadcraft/index.html'), 'utf-8');
    const cadcraftCss = fs.readFileSync(path.resolve('public/editors/cadcraft/bento-cad-shell.css'), 'utf-8');
    const cadcraftJs = fs.readFileSync(path.resolve('public/editors/cadcraft/bento-cad-shell.js'), 'utf-8');
    const cadcraftWasmExists = fs.existsSync(path.resolve('public/editors/cadcraft/cadcraft-web-d9510b450a4355c9_bg.wasm'));

    expect(cadcraftHtml).toContain('bento-header');
    expect(cadcraftHtml).toContain('bento-telemetry-strip');
    expect(cadcraftHtml).toContain('bento_drafting_hud');
    expect(cadcraftHtml).toContain('cadcraft_loading');
    expect(cadcraftHtml).toContain('TILE 02 // 2D DRAFTING HUD');
    expect(cadcraftCss).toContain('--bento-font-sans');
    expect(cadcraftCss).toContain('--bento-font-mono');
    expect(cadcraftCss).toContain('--bento-border-subtle');
    expect(cadcraftJs).toContain('omnicraft:theme-change');
    expect(cadcraftJs).toContain('omnicraft:import-cad');
    expect(cadcraftJs).toContain('omnicraft:export-ready');
    expect(cadcraftWasmExists).toBe(true);

    // 3. Bridge Audit
    const bridgeJs = fs.readFileSync(path.resolve('public/editors/mosaic-forge-bridge.js'), 'utf-8');
    expect(bridgeJs).toContain('omnicraft:export-ready');
    expect(bridgeJs).toContain('omnicraft:import-cad');
    expect(bridgeJs).toContain('omnicraft:theme-change');
  });
});
