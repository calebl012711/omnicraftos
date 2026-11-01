import { describe, expect, it } from 'vitest';
import { DEFAULT_BRANDING } from '../config/branding';
import { BLOCKED_REPOSITORIES, WORKSPACES } from '../config/workspaces';
import { inferCompatibleWorkspaces } from '../storage/db';
import { isSameOriginEvent } from '../utils/origin';

describe('Mosaic Forge Suite Configuration & Architecture', () => {
  it('maintains a centralized, easily rebrandable configuration with live domain check evidence', () => {
    expect(DEFAULT_BRANDING.productName).toBe('Mosaic Forge');
    expect(DEFAULT_BRANDING.candidateDomain).toBe('mosaicforge.com');
    expect(DEFAULT_BRANDING.domainCheck.available).toBe(false);
    expect(DEFAULT_BRANDING.domainCheck.purchased).toBe(false);
    expect(DEFAULT_BRANDING.domainCheck.rdapHandle).toBe('1988171746_DOMAIN_COM-VRSN');
  });

  it('registers all 18 live integrated workspaces (14 WASM + RiverCast ISO + Studio Cut + BandForge + FruityForge) plus 1 source-only workspace and 2 blocked repos', () => {
    const integrated = WORKSPACES.filter((w) => w.integrationLevel === 'integrated');
    const sourceOnly = WORKSPACES.filter((w) => w.integrationLevel === 'source-only');
    expect(integrated.length).toBe(18);
    expect(sourceOnly.length).toBe(1);
    expect(sourceOnly[0].id).toBe('fieldcraft');

    const river = WORKSPACES.find((w) => w.id === 'riverstudio');
    const studiocut = WORKSPACES.find((w) => w.id === 'studiocut');
    const bandforge = WORKSPACES.find((w) => w.id === 'bandforge');
    const flstudio = WORKSPACES.find((w) => w.id === 'flstudio');
    expect(river?.exportFormats).toContain('.webm (Screen ISO)');
    expect(river?.exportFormats).toContain('.webm (Camera ISO)');
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
});
