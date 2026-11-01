export interface BentoSurfaceTokens {
  canvas: string;
  surface: string;
  elevated: string;
  subtle: string;
  borderSubtle: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
}

export interface BentoTypographyTokens {
  fontSans: string;
  fontMono: string;
  trackingTight: string;
  trackingNormal: string;
  titleWeight: string;
  bodyWeight: string;
}

export interface BentoThemeTokens {
  cardRadius: string;
  cardBorder: string;
  cardBorderSubtle: string;
  cardBorderStrong: string;
  cardBorderHover: string;
  cardShadow: string;
  typography: BentoTypographyTokens;
  surfaces: {
    dark: BentoSurfaceTokens;
    light: BentoSurfaceTokens;
  };
}

export const DEFAULT_BENTO_THEME: BentoThemeTokens = {
  cardRadius: '14px',
  cardBorder: '1px solid rgba(255, 255, 255, 0.08)',
  cardBorderSubtle: 'rgba(255, 255, 255, 0.08)',
  cardBorderStrong: 'rgba(255, 255, 255, 0.16)',
  cardBorderHover: 'rgba(16, 185, 129, 0.45)',
  cardShadow: '0 12px 32px rgba(0, 0, 0, 0.42)',
  typography: {
    fontSans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontMono: "'JetBrains Mono', 'SF Mono', Menlo, Monaco, Consolas, monospace",
    trackingTight: '-0.02em',
    trackingNormal: '0',
    titleWeight: '600',
    bodyWeight: '400'
  },
  surfaces: {
    dark: {
      canvas: '#090b10',
      surface: '#11151f',
      elevated: '#171c29',
      subtle: '#1f2637',
      borderSubtle: 'rgba(255, 255, 255, 0.08)',
      borderStrong: 'rgba(255, 255, 255, 0.16)',
      textPrimary: '#f3f6fc',
      textSecondary: '#9ba8c0',
      textMuted: '#64728c'
    },
    light: {
      canvas: '#f8fafc',
      surface: '#ffffff',
      elevated: '#f1f5f9',
      subtle: '#e2e8f0',
      borderSubtle: 'rgba(15, 23, 42, 0.08)',
      borderStrong: 'rgba(15, 23, 42, 0.16)',
      textPrimary: '#0f172a',
      textSecondary: '#334155',
      textMuted: '#64748b'
    }
  }
};

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
  bentoTheme?: BentoThemeTokens;
}

export const DEFAULT_BRANDING: BrandingConfig = {
  productName: 'OmniCraft OS',
  shortName: 'OmniCraft',
  tagline: "The Desktop Suite That Doesn't Touch The Cloud",
  version: '0.1.0-alpha',
  candidateDomain: 'omnicraftos.com',
  domainCheck: {
    domain: 'omnicraftos.com',
    checkedAtUtc: '2026-11-01T00:14:07Z',
    method: 'Verisign COM RDAP (https://rdap.verisign.com/com/v1/domain/omnicraftos.com) + IANA WHOIS',
    available: true,
    statusSummary: 'AVAILABLE (Unregistered — RDAP HTTP 404 / WHOIS No match for domain)',
    registrar: 'None (Available for Registration)',
    rdapHandle: '',
    purchased: false
  },
  accentPrimary: '#0f172a',
  accentSecondary: '#10b981',
  logoPath: '/omnicraft-mark.svg',
  bentoTheme: DEFAULT_BENTO_THEME
};

const BRANDING_STORAGE_KEY = 'omnicraft-branding-v1';
const LEGACY_STORAGE_KEY = 'mosaic-forge-branding-v1';

export function loadBrandingConfig(): BrandingConfig {
  try {
    const raw = localStorage.getItem(BRANDING_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
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
    localStorage.removeItem(LEGACY_STORAGE_KEY);
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

  if (config.bentoTheme) {
    const { cardRadius, cardBorder, cardBorderSubtle, cardBorderStrong, cardBorderHover, cardShadow, typography } = config.bentoTheme;
    document.documentElement.style.setProperty('--bento-card-radius', cardRadius);
    document.documentElement.style.setProperty('--bento-card-border', cardBorder);
    document.documentElement.style.setProperty('--bento-border-subtle', cardBorderSubtle);
    document.documentElement.style.setProperty('--bento-border-strong', cardBorderStrong);
    document.documentElement.style.setProperty('--bento-border-hover', cardBorderHover);
    document.documentElement.style.setProperty('--bento-card-shadow', cardShadow);
    document.documentElement.style.setProperty('--bento-font-sans', typography.fontSans);
    document.documentElement.style.setProperty('--bento-font-mono', typography.fontMono);
    document.documentElement.style.setProperty('--bento-tracking-tight', typography.trackingTight);
  }
}
