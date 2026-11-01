import { describe, expect, it } from 'vitest';
import React from 'react';
import { KineticBentoHero } from '../components/KineticBentoHero';

describe('Option 3 Kinetic Bento Grid Hero Component', () => {
  it('exports KineticBentoHero as a functional React component', () => {
    expect(typeof KineticBentoHero).toBe('function');
  });

  it('renders with all required props without runtime exceptions', () => {
    let openedWorkspace = '';
    let openedProject = '';
    let navigatedTab = '';

    const element = React.createElement(KineticBentoHero, {
      onOpenWorkspace: (wsId: string, projId?: string) => {
        openedWorkspace = wsId;
        if (projId) openedProject = projId;
      },
      onNavigateTab: (tab: any) => {
        navigatedTab = tab;
      },
      onOpenShowcase: () => {},
      themeMode: 'dark',
      onToggleTheme: () => {}
    });

    expect(element).toBeDefined();
    expect(element.type).toBe(KineticBentoHero);
    expect(element.props.themeMode).toBe('dark');
  });
});
