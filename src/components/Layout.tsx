import { NavLink, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="site-shell">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="site-header">
        <NavLink to="/" className="brand" aria-label="H-1B SRE Careers Directory home">
          <span className="brand-mark">H1</span>
          <span><strong>H-1B SRE</strong><small>Careers Directory</small></span>
        </NavLink>
        <nav aria-label="Primary navigation">
          <NavLink to="/" end>Directory</NavLink>
          <NavLink to="/about">About the data</NavLink>
        </nav>
      </header>
      <main id="main-content"><Outlet /></main>
      <footer className="site-footer">
        <p>Verified careers links for employers with FY2026 Q2 SRE, DevOps, and platform H-1B filing evidence.</p>
        <NavLink to="/about">Methodology and coverage</NavLink>
      </footer>
    </div>
  );
}
