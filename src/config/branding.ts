export interface BrandingConfig {
  productName: string;
  shortName: string;
  tagline: string;
  version: string;
  candidateDomain: string;
  domainCheck: {
    domain: string;
    checkedAtUtc: string;
    method: string;
    available: boolean;
    statusSummary: string;
    registrar: string;
    rdapHandle: string;
    purchased: boolean;
  };
  accentPrimary: string;
  accentSecondary: string;
  logoPath: string;
}

export const DEFAULT_BRANDING: BrandingConfig = {
  productName: 'Mosaic Forge',
  shortName: 'MF',
  tagline: 'Unified Local-First Creative Suite & Parametric CAD Workspace',
  version: '0.1.0-alpha',
  candidateDomain: 'mosaicforge.com',
  domainCheck: {
    domain: 'mosaicforge.com',
    checkedAtUtc: '2026-11-01T00:14:07Z',
    method: 'Verisign COM RDAP (https://rdap.verisign.com/com/v1/domain/mosaicforge.com) + IANA WHOIS',
    available: false,
    statusSummary: 'UNAVAILABLE (Registered — RDAP HTTP 200, clientTransferProhibited)',
    registrar: 'GoDaddy.com, LLC (IANA ID 146)',
    rdapHandle: '1988171746_DOMAIN_COM-VRSN',
    purchased: false
  },
  accentPrimary: '#c87d55',
  accentSecondary: '#3b7a6b',
  logoPath: '/mosaic-forge-mark.svg'
};

const BRANDING_STORAGE_KEY = 'mosaic-forge-branding-v1';

export function loadBrandingConfig(): BrandingConfig {
  try {
    const raw = localStorage.getItem(BRANDING_STORAGE_KEY);
    if (!raw) return DEFAULT_BRANDING;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_BRANDING,
      ...parsed,
      domainCheck: DEFAULT_BRANDING.domainCheck
    };
  } catch {
    return DEFAULT_BRANDING;
  }
}

export function saveBrandingConfig(partial: Partial<BrandingConfig>): BrandingConfig {
  const next: BrandingConfig = {
    ...loadBrandingConfig(),
    ...partial,
    domainCheck: DEFAULT_BRANDING.domainCheck
  };
  try {
    localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }
  applyBrandingCssVariables(next);
  return next;
}

export function resetBrandingConfig(): BrandingConfig {
  try {
    localStorage.removeItem(BRANDING_STORAGE_KEY);
  } catch {
    // ignore
  }
  applyBrandingCssVariables(DEFAULT_BRANDING);
  return DEFAULT_BRANDING;
}

export function applyBrandingCssVariables(config: BrandingConfig): void {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--mf-accent', config.accentPrimary);
  document.documentElement.style.setProperty('--mf-accent-secondary', config.accentSecondary);
  document.title = `${config.productName} — ${config.tagline}`;
}
