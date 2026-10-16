
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
    </header>
  )
}

export default Header
