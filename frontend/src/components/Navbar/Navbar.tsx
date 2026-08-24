import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

interface NavbarProps {
  variant?: 'transparent' | 'solid';
}

const navLinks = [
  { label: 'Platform', to: '/' },
  { label: 'Intelligence', to: '/#intelligence' },
  { label: 'National Overview', to: '/#overview' },
  { label: 'Signals', to: '/#signals' },
  { label: 'Projects', to: '/projects' },
];

export default function Navbar({ variant = 'solid' }: NavbarProps) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to.split('#')[0]) && to.split('#')[0] !== '/';
  };

  return (
    <nav className={`navbar ${variant === 'transparent' ? 'navbar--transparent' : 'navbar--solid'}`}>
      <div className="navbar__inner">
        {/* Brand + Links */}
        <div className="navbar__left">
          <Link to="/" className="navbar__brand">PAIMANA AI</Link>
          <div className="navbar__links">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`navbar__link ${isActive(link.to) ? 'navbar__link--active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="navbar__actions">
          <button className="navbar__cta">
            Deploy Intelligence
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
          <button
            className="navbar__menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined">
              {menuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="navbar__mobile-menu">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`navbar__mobile-link ${isActive(link.to) ? 'navbar__mobile-link--active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
