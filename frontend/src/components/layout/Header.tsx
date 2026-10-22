import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

interface HeaderProps {
  title: string
  description: string
  onToggleSidebar: () => void
}

function Header({
  title,
  description,
  onToggleSidebar,
}: HeaderProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="admin-header">
      <button
        type="button"
        className="admin-header__menu"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        title="Toggle sidebar"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 7h16" />
          <path d="M4 12h11" />
          <path d="M4 17h7" />
        </svg>
      </button>

      <div className="admin-header__text">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <div className="admin-header__user">
        {user && (
          <div className="admin-header__user-profile">
            <div className="admin-header__avatar">
              {user.username.charAt(0).toUpperCase()}
            </div>

            <div className="admin-header__user-info">
              <span className="admin-header__user-label">
                Signed in as
              </span>
              <span className="admin-header__user-name">
                {user.username}
              </span>
            </div>

            <button
              type="button"
              className="admin-header__logout"
              onClick={handleLogout}
              aria-label="Đăng xuất"
            >
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
