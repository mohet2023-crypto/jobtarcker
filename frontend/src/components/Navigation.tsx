import { NavLink } from 'react-router-dom'

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/applications', label: 'Applications' },
  { to: '/login', label: 'Login' },
  { to: '/register', label: 'Register' },
] as const

export function Navigation() {
  return (
    <nav className="site-nav" aria-label="Main">
      <ul>
        {links.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
