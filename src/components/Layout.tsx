import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const navGroups = [
  {
    label: 'Explore',
    links: [
      { to: '/', label: 'Overview', end: true },
      { to: '/companies', label: 'Company Directory' },
    ],
  },
  {
    label: 'H-1B Filings',
    links: [
      { to: '/filings/states', label: 'Filings by Worksite State' },
      { to: '/filings/companies', label: 'Filings by Employer' },
    ],
  },
  {
    label: 'Data',
    links: [{ to: '/data-quality', label: 'Data Quality' }],
  },
];

export function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <aside
        id="primary-sidebar"
        className={open ? 'sidebar open' : 'sidebar'}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
        }}
      >
        <div className="brand">
          <span className="brand-mark">H1</span>
          <div><strong>H-1B SRE</strong><span>Browser</span></div>
        </div>
        <nav aria-label="Primary navigation">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span>{group.label}</span>
              {group.links.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} onClick={() => setOpen(false)}>
                  {link.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="pulse" />FY2026 Q2 snapshot
          <p>Filing evidence and careers-page research gaps stay visible.</p>
        </div>
      </aside>
      <div className="content-shell">
        <header className="mobile-header">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="primary-sidebar"
            aria-label="Toggle navigation"
          >
            ☰
          </button>
          <strong>H-1B SRE Browser</strong>
        </header>
        <div id="main-content"><Outlet /></div>
      </div>
    </div>
  );
}
