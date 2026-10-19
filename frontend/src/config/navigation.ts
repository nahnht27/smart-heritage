
export interface NavItem {
  path: string
  label: string
  description: string
}

export const navItems: NavItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    description: 'Overview of the heritage management system.',
  },
  {
    path: '/heritage-sites',
    label: 'Heritage Sites',
    description: 'Browse and manage heritage site information.',
  },
  {
    path: '/artifacts',
    label: 'Artifacts',
    description: 'Browse and manage heritage artifacts.',
  },
  {
    path: '/multimedia',
    label: 'Multimedia',
    description: 'Manage multimedia content associated with heritage sites and artifacts.',
  },
  {
    path: '/beacons',
    label: 'Beacons',
    description: 'View and manage beacon devices and their deployment locations.',
  },
  {
    path: '/translations',
    label: 'Translations',
    description: 'Manage translated content across supported languages.',
  },
  {
    path: '/feedback',
    label: 'Feedback',
    description: 'Review and moderate visitor feedback.',
  },
]
