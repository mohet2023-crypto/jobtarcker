import { NavLink, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

export function Navigation() {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav className="site-nav" aria-label="Main">
      <ul>
        <li>
          <NavLink
            to="/"
            className={({ isActive }) => (isActive ? 'active' : undefined)}
            end
          >
            Home
          </NavLink>
        </li>

        {isAuthenticated ? (
          <>
            <li>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/applications"
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                Applications
              </NavLink>
            </li>
            <li>
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
              <NavLink
                to="/login"
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                Login
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/register"
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                Register
              </NavLink>
            </li>
          </>
        )}
      </ul>
    </nav>
  )
}
