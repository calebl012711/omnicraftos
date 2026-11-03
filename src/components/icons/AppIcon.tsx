import React from 'react';
import { WORKSPACES } from '../../config/workspaces';
const ICON_LABELS = new Map(WORKSPACES.map(workspace => [workspace.id, workspace.name]));

export interface AppIconProps {
  id: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

interface IconDefinition {
  title: string;
  gradient: [string, string];
  accent: string;
  renderGlyph: () => React.ReactNode;
}

export const APP_ICON_DEFINITIONS: Record<string, IconDefinition> = {
  // 1. RiverCast & OneStudio ISO (Broadcast recording, camera + mic stream)
  riverstudio: {
    title: 'RiverCast & OneStudio ISO',
    gradient: ['#FB7185', '#E11D48'],
    accent: '#E11D48',
    renderGlyph: () => (
      <g>
        <circle cx="16" cy="16" r="3.2" fill="#FFFFFF" />
        <path d="M10.5 10.5C7.5 13.5 7.5 18.5 10.5 21.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.9" />
        <path d="M21.5 10.5C24.5 13.5 24.5 18.5 21.5 21.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.9" />
        <path d="M7 7C2.5 11.5 2.5 20.5 7 25" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.65" />
        <path d="M25 7C29.5 11.5 29.5 20.5 25 25" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.65" />
      </g>
    )
  },

  // 2. Studio Cut ISO Video Editor (Multi-track video NLE & screen cuts)
  studiocut: {
    title: 'Studio Cut NLE',
    gradient: ['#F43F5E', '#BE123C'],
    accent: '#BE123C',
    renderGlyph: () => (
      <g>
        <rect x="7" y="8" width="18" height="16" rx="3.5" fill="#FFFFFF" fillOpacity="0.2" stroke="#FFFFFF" strokeWidth="1.6" />
        <path d="M13 13L19 16L13 19V13Z" fill="#FFFFFF" />
        <circle cx="9.5" cy="10.5" r="1" fill="#FFFFFF" />
        <circle cx="9.5" cy="21.5" r="1" fill="#FFFFFF" />
        <circle cx="22.5" cy="10.5" r="1" fill="#FFFFFF" />
        <circle cx="22.5" cy="21.5" r="1" fill="#FFFFFF" />
      </g>
    )
  },

  // 3. BandForge (GarageBand-style DAW & Amp Rig)
  bandforge: {
    title: 'BandForge DAW',
    gradient: ['#FBBF24', '#D97706'],
    accent: '#D97706',
    renderGlyph: () => (
      <g>
        <circle cx="16" cy="16" r="9" stroke="#FFFFFF" strokeWidth="1.6" fill="#FFFFFF" fillOpacity="0.15" />
        <circle cx="16" cy="16" r="5" stroke="#FFFFFF" strokeWidth="1.4" fill="none" opacity="0.85" />
        <circle cx="16" cy="16" r="2" fill="#FFFFFF" />
        <path d="M16 7V11M16 21V25M7 16H11M21 16H25" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
      </g>
    )
  },

  // 4. FruityForge 21 (FL Studio 16-step rack, piano roll & mixer)
  flstudio: {
    title: 'FruityForge 21',
    gradient: ['#FB923C', '#EA580C'],
    accent: '#EA580C',
    renderGlyph: () => (
      <g>
        <rect x="7" y="7" width="4.5" height="4.5" rx="1.2" fill="#FFFFFF" />
        <rect x="13.7" y="7" width="4.5" height="4.5" rx="1.2" fill="#FFFFFF" fillOpacity="0.5" />
        <rect x="20.5" y="7" width="4.5" height="4.5" rx="1.2" fill="#FFFFFF" />
        <rect x="7" y="13.7" width="4.5" height="4.5" rx="1.2" fill="#FFFFFF" fillOpacity="0.5" />
        <rect x="13.7" y="13.7" width="4.5" height="4.5" rx="1.2" fill="#FFFFFF" />
        <rect x="20.5" y="13.7" width="4.5" height="4.5" rx="1.2" fill="#FFFFFF" fillOpacity="0.5" />
        <rect x="7" y="20.5" width="18" height="4.5" rx="1.5" fill="#FFFFFF" fillOpacity="0.25" stroke="#FFFFFF" strokeWidth="1" />
        <rect x="12" y="20.5" width="4" height="4.5" rx="1" fill="#FFFFFF" />
      </g>
    )
  },

  // 5. SolidCraft 3D CAD (Parametric B-Rep 3D Engineering)
  solidcraft: {
    title: 'SolidCraft 3D CAD',
    gradient: ['#38BDF8', '#0284C7'],
    accent: '#0284C7',
    renderGlyph: () => (
      <g>
        <path d="M16 6.5L25 11.5V21.5L16 26.5L7 21.5V11.5L16 6.5Z" stroke="#FFFFFF" strokeWidth="1.8" strokeLinejoin="round" fill="#FFFFFF" fillOpacity="0.18" />
        <path d="M16 16.5L25 11.5M16 16.5V26.5M16 16.5L7 11.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="16" cy="16.5" r="1.4" fill="#FFFFFF" />
      </g>
    )
  },

  // 6. FilmCraft Video Studio (Nonlinear video editing & timeline)
  filmcraft: {
    title: 'FilmCraft Video',
    gradient: ['#F87171', '#DC2626'],
    accent: '#DC2626',
    renderGlyph: () => (
      <g>
        <rect x="6.5" y="9.5" width="19" height="13" rx="2.5" fill="#FFFFFF" fillOpacity="0.18" stroke="#FFFFFF" strokeWidth="1.6" />
        <path d="M13.5 13L18.5 16L13.5 19V13Z" fill="#FFFFFF" />
        <line x1="6.5" y1="12.5" x2="25.5" y2="12.5" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="1.5 1.5" opacity="0.6" />
        <line x1="6.5" y1="19.5" x2="25.5" y2="19.5" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="1.5 1.5" opacity="0.6" />
      </g>
    )
  },

  // 7. PhotoCraft Layer Lab (Raster photo editing, layers, curves)
  photocraft: {
    title: 'PhotoCraft Layers',
    gradient: ['#60A5FA', '#2563EB'],
    accent: '#2563EB',
    renderGlyph: () => (
      <g>
        <rect x="7" y="10" width="13" height="13" rx="3" fill="#FFFFFF" fillOpacity="0.25" stroke="#FFFFFF" strokeWidth="1.5" />
        <rect x="12" y="7" width="13" height="13" rx="3" fill="#FFFFFF" fillOpacity="0.15" stroke="#FFFFFF" strokeWidth="1.5" />
        <circle cx="11.5" cy="14.5" r="1.8" fill="#FFFFFF" />
        <path d="M8 20L11 17L14 19L18 15L19.5 16.5" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    )
  },

  // 8. CADCraft 2D Drafting (Architectural DWG/DXF blueprints)
  cadcraft: {
    title: 'CADCraft 2D',
    gradient: ['#2DD4BF', '#0D9488'],
    accent: '#0D9488',
    renderGlyph: () => (
      <g>
        <circle cx="16" cy="16" r="9" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 2" fill="none" opacity="0.7" />
        <path d="M16 6L23 23L16 19L9 23L16 6Z" fill="#FFFFFF" fillOpacity="0.85" />
        <circle cx="16" cy="16" r="2" fill="#0D9488" />
      </g>
    )
  },

  // 9. VectorCraft Illustration (Scalable vector Bezier curves)
  vectorcraft: {
    title: 'VectorCraft',
    gradient: ['#F59E0B', '#B45309'],
    accent: '#B45309',
    renderGlyph: () => (
      <g>
        <path d="M8 22C11 12 21 20 24 10" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <rect x="6.5" y="20.5" width="3" height="3" fill="#FFFFFF" rx="0.6" />
        <rect x="22.5" y="8.5" width="3" height="3" fill="#FFFFFF" rx="0.6" />
        <circle cx="16" cy="16" r="2.2" fill="#FFFFFF" />
      </g>
    )
  },

  // 10. EffectCraft Motion & VFX (Node graph compositing & motion graphics)
  effectcraft: {
    title: 'EffectCraft VFX',
    gradient: ['#C084FC', '#7E22CE'],
    accent: '#7E22CE',
    renderGlyph: () => (
      <g>
        <path d="M16 6L18.5 12.5L25 13.5L20 18L21.5 24.5L16 21L10.5 24.5L12 18L7 13.5L13.5 12.5L16 6Z" fill="#FFFFFF" />
        <circle cx="8" cy="8" r="1.5" fill="#FFFFFF" opacity="0.75" />
        <circle cx="24" cy="22" r="1.2" fill="#FFFFFF" opacity="0.75" />
      </g>
    )
  },

  // 11. LightCraft RAW & Catalog (Digital darkroom & photo grading)
  lightcraft: {
    title: 'LightCraft Catalog',
    gradient: ['#38BDF8', '#0369A1'],
    accent: '#0369A1',
    renderGlyph: () => (
      <g>
        <circle cx="16" cy="16" r="5" stroke="#FFFFFF" strokeWidth="1.8" fill="#FFFFFF" fillOpacity="0.25" />
        <path d="M16 6V9M16 23V26M6 16H9M23 16H26M9 9L11 11M21 21L23 23M9 23L11 21M21 9L23 11" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    )
  },

  // 12. DesignCraft Publishing (Editorial page layout & magazines)
  designcraft: {
    title: 'DesignCraft Layout',
    gradient: ['#EC4899', '#BE185D'],
    accent: '#BE185D',
    renderGlyph: () => (
      <g>
        <rect x="7" y="7" width="18" height="18" rx="2.5" fill="#FFFFFF" fillOpacity="0.15" stroke="#FFFFFF" strokeWidth="1.5" />
        <rect x="9.5" y="9.5" width="6" height="6" rx="1.2" fill="#FFFFFF" />
        <line x1="17.5" y1="10.5" x2="22.5" y2="10.5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="17.5" y1="14" x2="22.5" y2="14" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="9.5" y1="18.5" x2="22.5" y2="18.5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="9.5" y1="21.5" x2="19.5" y2="21.5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    )
  },

  // 13. PdfCraft Reader & Vector Annotator (PDF markup, forms & signatures)
  pdfcraft: {
    title: 'PdfCraft Reader',
    gradient: ['#EF4444', '#B91C1C'],
    accent: '#B91C1C',
    renderGlyph: () => (
      <g>
        <path d="M9 7C9 5.9 9.9 5 11 5H18L23 10V24C23 25.1 22.1 26 21 26H11C9.9 26 9 25.1 9 24V7Z" fill="#FFFFFF" fillOpacity="0.2" stroke="#FFFFFF" strokeWidth="1.5" />
        <path d="M18 5V10H23" stroke="#FFFFFF" strokeWidth="1.5" fill="#FFFFFF" fillOpacity="0.5" />
        <text x="11.5" y="21" fill="#FFFFFF" fontSize="6.5" fontWeight="800" fontFamily="sans-serif">PDF</text>
      </g>
    )
  },

  // 14. FigCraft UI Design (Vector interface, component library, prototyping)
  figcraft: {
    title: 'FigCraft UI',
    gradient: ['#A855F7', '#6B21A8'],
    accent: '#6B21A8',
    renderGlyph: () => (
      <g>
        <circle cx="12" cy="10" r="3.5" fill="#FFFFFF" fillOpacity="0.9" />
        <circle cx="20" cy="10" r="3.5" fill="#FFFFFF" fillOpacity="0.9" />
        <circle cx="12" cy="16" r="3.5" fill="#FFFFFF" fillOpacity="0.9" />
        <circle cx="20" cy="16" r="3.5" fill="#FFFFFF" fillOpacity="0.9" />
        <circle cx="12" cy="22" r="3.5" fill="#FFFFFF" fillOpacity="0.9" />
      </g>
    )
  },

  // 15. WordCraft Documents (Word processor, typography & rich text)
  wordcraft: {
    title: 'WordCraft Docs',
    gradient: ['#3B82F6', '#1D4ED8'],
    accent: '#1D4ED8',
    renderGlyph: () => (
      <g>
        <rect x="7" y="6" width="18" height="20" rx="3" fill="#FFFFFF" fillOpacity="0.18" stroke="#FFFFFF" strokeWidth="1.5" />
        <text x="11" y="20" fill="#FFFFFF" fontSize="13" fontWeight="900" fontFamily="sans-serif">W</text>
      </g>
    )
  },

  // 16. SoundCraft Audio Studio (Multi-track waveform editing & mastering)
  soundcraft: {
    title: 'SoundCraft Audio',
    gradient: ['#10B981', '#047857'],
    accent: '#047857',
    renderGlyph: () => (
      <g>
        <rect x="7" y="14" width="2" height="4" rx="1" fill="#FFFFFF" />
        <rect x="11" y="10" width="2" height="12" rx="1" fill="#FFFFFF" />
        <rect x="15" y="7" width="2" height="18" rx="1" fill="#FFFFFF" />
        <rect x="19" y="11" width="2" height="10" rx="1" fill="#FFFFFF" />
        <rect x="23" y="13" width="2" height="6" rx="1" fill="#FFFFFF" />
      </g>
    )
  },

  // 17. DeckCraft Presentations (Slide decks, animated transitions)
  deckcraft: {
    title: 'DeckCraft Slides',
    gradient: ['#F97316', '#C2410C'],
    accent: '#C2410C',
    renderGlyph: () => (
      <g>
        <rect x="6.5" y="8" width="19" height="13.5" rx="2.5" fill="#FFFFFF" fillOpacity="0.2" stroke="#FFFFFF" strokeWidth="1.5" />
        <rect x="9" y="10.5" width="14" height="8.5" rx="1" fill="#FFFFFF" fillOpacity="0.3" />
        <line x1="12" y1="24.5" x2="20" y2="24.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="16" y1="21.5" x2="16" y2="24.5" stroke="#FFFFFF" strokeWidth="1.8" />
      </g>
    )
  },

  // 18. GridCraft Spreadsheets (Reactive math, charts, data models)
  gridcraft: {
    title: 'GridCraft Sheets',
    gradient: ['#22C55E', '#15803D'],
    accent: '#15803D',
    renderGlyph: () => (
      <g>
        <rect x="7" y="6" width="18" height="20" rx="3" fill="#FFFFFF" fillOpacity="0.18" stroke="#FFFFFF" strokeWidth="1.5" />
        <text x="11.5" y="20.5" fill="#FFFFFF" fontSize="13" fontWeight="900" fontFamily="sans-serif">X</text>
      </g>
    )
  },

  // 19. FieldCraft (Implicit CAD / Volumetric modeling)
  fieldcraft: {
    title: 'FieldCraft Implicit CAD',
    gradient: ['#64748B', '#334155'],
    accent: '#334155',
    renderGlyph: () => (
      <g>
        <circle cx="16" cy="16" r="9" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="2 2" fill="none" opacity="0.6" />
        <circle cx="16" cy="16" r="6" stroke="#FFFFFF" strokeWidth="1.5" fill="#FFFFFF" fillOpacity="0.25" />
        <circle cx="16" cy="16" r="2.5" fill="#FFFFFF" />
      </g>
    )
  }
};

export const AppIcon: React.FC<AppIconProps> = ({ id, size = 40, className = '', style = {} }) => {
  const iconDef = APP_ICON_DEFINITIONS[id] || {
    title: id,
    gradient: ['#6366F1', '#4338CA'],
    accent: '#4338CA',
    renderGlyph: () => <rect x="9" y="9" width="14" height="14" rx="3" fill="#FFFFFF" />
  };

  const gradId = `app_icon_grad_${id.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`omnicraft-app-icon ${className}`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        filter: 'drop-shadow(0 2px 5px rgba(0, 0, 0, 0.22))',
        ...style
      }}
      role="img"
      aria-label={ICON_LABELS.get(id) || iconDef.title}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={iconDef.gradient[0]} />
          <stop offset="100%" stopColor={iconDef.gradient[1]} />
        </linearGradient>
      </defs>

      {/* Modern Fluent / Apple HIG Squircle Base */}
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="7.5"
        fill={`url(#${gradId})`}
        stroke="rgba(255, 255, 255, 0.2)"
        strokeWidth="0.8"
      />

      {/* Top Gloss Highlight Arc */}
      <path
        d="M2.5 9C2.5 5.4 5.4 2.5 9 2.5H23C26.6 2.5 29.5 5.4 29.5 9V12C29.5 12 21 8.5 16 8.5C11 8.5 2.5 12 2.5 12V9Z"
        fill="#FFFFFF"
        fillOpacity="0.12"
      />

      {/* Custom Vector Icon Glyph */}
      {iconDef.renderGlyph()}
    </svg>
  );
};
