import React, { useEffect, useRef } from 'react';
import { BookOpen, Sun, Moon, Laptop } from 'lucide-react';
import { useTheme, ThemeMode } from '../../design';
import './AppShell.css';

export interface AppShellProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  selectedFileName?: string | null;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeTab = 'tutor',
  onTabChange,
  selectedFileName,
}) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const headerRef = useRef<HTMLElement>(null);

  // Sync --nw-header-h to document element
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return undefined;

    const updateHeaderHeight = () => {
      const height = header.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--nw-header-h', `${height}px`);
    };

    updateHeaderHeight();

    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(updateHeaderHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  const cycleTheme = () => {
    const modes: ThemeMode[] = ['light', 'dark', 'system'];
    const currentIndex = modes.indexOf(theme);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setTheme(nextMode);
  };

  const getThemeIcon = () => {
    if (theme === 'system') return <Laptop size={16} aria-hidden="true" />;
    return resolvedTheme === 'dark' ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />;
  };

  const getThemeTitle = () => {
    const modeLabel = theme.charAt(0).toUpperCase() + theme.slice(1);
    return `Theme: ${modeLabel} (click to toggle)`;
  };

  return (
    <div className="nw-shell">
      {/* Slim Navigation Rail (Deep Forest) */}
      <aside className="nw-rail" aria-label="Main Navigation">
        <div className="nw-rail__top">
          <div
            className="nw-rail__logo"
            title="NoteWise"
            aria-label="NoteWise Home"
            onClick={() => onTabChange && onTabChange('tutor')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onTabChange && onTabChange('tutor');
              }
            }}
          >
            <span style={{ fontFamily: 'var(--nw-font-heading)', fontWeight: 700, fontSize: '1.125rem' }}>
              NW
            </span>
          </div>

          <nav className="nw-rail__nav" aria-label="Workspaces">
            {/* Phase 1 rail lists only "Study", per Decision 5 */}
            <button
              type="button"
              className="nw-rail__item nw-rail__item--active"
              aria-current="page"
              title="Study Workspace"
              aria-label="Study Workspace"
            >
              <BookOpen size={20} aria-hidden="true" />
              <span className="nw-rail__item-label">Study</span>
            </button>
          </nav>
        </div>

        <div className="nw-rail__bottom">
          {/* Temporary Light / Dark / System theme toggle (moves to Settings in Phase 7) */}
          <button
            type="button"
            className="nw-rail__theme-btn"
            onClick={cycleTheme}
            title={getThemeTitle()}
            aria-label={getThemeTitle()}
          >
            {getThemeIcon()}
          </button>

          <span className="nw-rail__version" title="Version 1.0 test">
            1.0
          </span>

          <div className="nw-rail__status" title="Local instance">
            <span className="nw-rail__dot" />
            <span>local</span>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="nw-shell__main">
        {/* Pinned Topbar */}
        <header ref={headerRef} className="nw-topbar">
          <div className="nw-topbar__left">
            <span className="nw-topbar__brand">NoteWise</span>
            <span className="nw-topbar__divider">/</span>
            <div className="nw-topbar__breadcrumb">
              <span>Study Workspace</span>
              {selectedFileName ? (
                <>
                  <span className="nw-topbar__divider">/</span>
                  <span className="nw-topbar__breadcrumb-active">{selectedFileName}</span>
                </>
              ) : null}
            </div>
          </div>

          {/* Sub-tabs for the Study workspace */}
          <nav className="nw-topbar__nav" aria-label="Study modes">
            <button
              type="button"
              className={`nw-topbar__tab ${activeTab === 'tutor' ? 'nw-topbar__tab--active' : ''}`}
              onClick={() => onTabChange && onTabChange('tutor')}
              aria-label="AI Tutor Studio tab"
            >
              AI Tutor
            </button>
            <button
              type="button"
              className={`nw-topbar__tab ${activeTab === 'recall' ? 'nw-topbar__tab--active' : ''}`}
              onClick={() => onTabChange && onTabChange('recall')}
              aria-label="Active Recall tab"
            >
              Active Recall (3D)
            </button>
          </nav>
        </header>

        {/* Content area mounting the workspace panes */}
        <div className="nw-shell__content">
          {children}
        </div>
      </div>
    </div>
  );
};
