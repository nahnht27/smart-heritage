import { useLocation } from 'react-router-dom'
import { navItems } from '../config/navigation'

function PlaceholderPage() {
  const location = useLocation()
  const currentItem = navItems.find(
    (item) => item.path === location.pathname,
  )

  return (
    <section className="page-placeholder">
      <h2>{currentItem?.label ?? 'Management'}</h2>
      <p>{currentItem?.description ?? 'This section will be implemented in a later stage.'}</p>
      <p>This section will be implemented in a later stage.</p>
    </section>
  )
}

export default PlaceholderPage