import { NavLink, useNavigate } from 'react-router-dom'
import { navItems } from '../../config/navigation'

interface SidebarProps {
  isCollapsed: boolean
}

function Icon({ name }: { name: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }

  switch (name) {
    case 'Dashboard':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      )

    case 'Heritage Sites':
      return (
        <svg {...common}>
          <path d="M3 9h18L12 4 3 9Z" />
          <path d="M5 20h14M7 10v8m5-8v8m5-8v8M4 22h16" />
        </svg>
      )

    case 'Artifacts':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M4 8h16M9 12h6" />
        </svg>
      )

    case 'Multimedia':
      return (
        <svg {...common}>
          <rect x="3" y="6" width="14" height="14" rx="2" />
          <path d="m17 10 4-3v12l-4-3M7 3h12v12" />
          <circle cx="8" cy="11" r="1.5" />
        </svg>
      )

    case 'Beacons':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2" />
          <path d="M7.8 7.8a6 6 0 0 0 0 8.4m8.4-8.4a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2m14.2-14.2a10 10 0 0 1 0 14.2" />
        </svg>
      )

    case 'Translations':
      return (
        <svg {...common}>
          <path d="M4 5h10M9 3v2m4 0c0 5-3 8-7 10m1-7c1 3 3 5 6 6M14 20l3-8 3 8m-5-3h4" />
        </svg>
      )

    case 'Feedback':
      return (
        <svg {...common}>
          <path d="M4 5h16v12H9l-5 4V5Z" />
          <path d="M8 9h8M8 13h5" />
        </svg>
      )

    default:
      return (
        <svg {...common}>
          <path d="M4 5h16v12H9l-5 4V5Z" />
        </svg>
      )
  }
}

function getNavLabel(label: string) {
  switch (label) {
    case 'Heritage Sites':
      return 'Site Management'
    case 'Artifacts':
      return 'Artifact Management'
    case 'Beacons':
      return 'Beacon Management'
    case 'Feedback':
      return 'Feedback Management'
    default:
      return label
  }
}

function Sidebar({ isCollapsed }: SidebarProps) {
  const navigate = useNavigate()

  function handleLogout() {
    navigate('/login', { replace: true })
  }

  return (
    <aside
      className={`sidebar ${
        isCollapsed ? 'sidebar--collapsed' : ''
      }`}
    >
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark">
          <Icon name="Heritage Sites" />
        </span>

        {!isCollapsed && (
          <span className="sidebar__brand-name">
            Smart
            <br />
            Heritage
          </span>
        )}
      </div>

      <nav aria-label="Admin navigation">
        <ul className="sidebar__nav">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                title={isCollapsed ? getNavLabel(item.label) : undefined}
                className={({ isActive }) =>
                  `sidebar__link ${
                    isActive ? 'sidebar__link--active' : ''
                  }`
                }
              >
                <Icon name={item.label} />

                {!isCollapsed && (
                  <span>{getNavLabel(item.label)}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar__logout">
        <button
          type="button"
          className="sidebar__logout-link"
          title={isCollapsed ? 'Logout' : undefined}
          onClick={handleLogout}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            width="18"
            height="18"
            aria-hidden="true"
          >
            <path d="M10 17l5-5-5-5M15 12H3" />
            <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" />
          </svg>

          {!isCollapsed && 'Logout'}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar