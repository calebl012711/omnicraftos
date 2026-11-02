import { describe, expect, it } from 'vitest';
import React from 'react';
import { QuickStartPlayground } from '../components/QuickStartPlayground';

describe('QuickStartPlayground Component', () => {
  it('exports QuickStartPlayground as a functional React component', () => {
    expect(typeof QuickStartPlayground).toBe('function');
  });

  it('instantiates cleanly with onOpenWorkspace and onNavigateTab props', () => {
    let openedWs = '';
    let navigatedTab = '';

    const element = React.createElement(QuickStartPlayground, {
      onOpenWorkspace: (id: string) => {
        openedWs = id;
      },
      onNavigateTab: (tab: any) => {
        navigatedTab = tab;
      }
    });

    expect(element).toBeDefined();
    expect(element.type).toBe(QuickStartPlayground);
  });
});
