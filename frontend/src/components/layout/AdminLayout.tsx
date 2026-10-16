
import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { navItems } from '../../config/navigation'

function AdminLayout() {
  const location = useLocation()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const currentItem = navItems.find(
    (item) => item.path === location.pathname,
  )

  const title = currentItem?.label ?? 'Dashboard'
  const description = currentItem?.description ?? ''

  return (
    <div
      className={`admin-layout ${
        isSidebarCollapsed ? 'admin-layout--collapsed' : ''
      }`}
    >
      <Sidebar isCollapsed={isSidebarCollapsed} />

      <div className="admin-layout__main">
        <Header
          title={title}
          description={description}
          onToggleSidebar={() =>
            setIsSidebarCollapsed((previous) => !previous)
          }
        />

        <main className="admin-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
