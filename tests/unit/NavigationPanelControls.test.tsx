import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import NavigationPanelControls from '../../src/web/components/NavigationPanel/NavigationPanelControls';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('NavigationPanelControls', () => {
  it('invokes search callback when search button clicked', () => {
    const onToggle = vi.fn();
    const onSearch = vi.fn();
    render(
      <ThemeProvider>
        <NavigationPanelControls
          onToggle={onToggle}
          onOpenSearch={onSearch}
        />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByLabelText('Search views'));
    expect(onSearch).toHaveBeenCalled();
  });
});
