import { useEffect, useId, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

export function Navigation() {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  function handleLogout() {
    setMenuOpen(false)
    logout()
    navigate('/login')
  }

  function navClassName({ isActive }: { isActive: boolean }) {
    return isActive ? 'site-nav-link active' : 'site-nav-link'
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="brand" aria-label="Deadline Dash home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="5"
                fill="currentColor"
                opacity="0.14"
              />
              <path
                d="M7.5 12.2 10.4 15l6.1-6.8"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="brand-text">Deadline Dash</span>
        </Link>

        <button
          type="button"
          className="nav-menu-toggle"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="visually-hidden">
            {menuOpen ? 'Close menu' : 'Open menu'}
          </span>
          <span className="nav-menu-icon" aria-hidden="true">
            {menuOpen ? '×' : '☰'}
          </span>
        </button>

        <nav
          id={menuId}
          className={`site-nav${menuOpen ? ' is-open' : ''}`}
          aria-label="Main"
        >
          <ul className="site-nav-list">
            <li>
              <NavLink to="/" className={navClassName} end>
                Home
              </NavLink>
            </li>

            {isAuthenticated ? (
              <>
                <li>
                  <NavLink to="/dashboard" className={navClassName}>
                    Dashboard
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/applications" className={navClassName}>
                    Applications
                  </NavLink>
                </li>
                <li className="site-nav-actions">
                  <Link to="/applications" className="nav-cta">
                    + Add Application
                  </Link>
                  <button
                    type="button"
                    className="nav-logout"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <NavLink to="/login" className={navClassName}>
                    Login
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/register" className="nav-cta">
                    Register
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </header>
  )
}
