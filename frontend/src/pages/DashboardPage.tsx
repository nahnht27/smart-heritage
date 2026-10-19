type Activity = [string, string, string, string]

const activities: Activity[] = []

function StatIcon({ type }: { type: string }) {
  if (type === 'sites')
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M3 9h18L12 4 3 9ZM5 20h14M7 10v8m5-8v8m5-8v8M4 22h16" />
      </svg>
    )

  if (type === 'artifacts')
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M4 9h16m-10 4h4" />
      </svg>
    )

  if (type === 'beacons')
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="12" cy="12" r="2" />
        <path d="M7.8 7.8a6 6 0 0 0 0 8.4m8.4-8.4a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2m14.2-14.2a10 10 0 0 1 0 14.2" />
      </svg>
    )

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 5h16v12H9l-5 4V5Z" />
    </svg>
  )
}

function DashboardPage() {
  const stats = [
    {
      number: '—',
      label: 'Total Heritage Sites',
      note: 'No data available',
      icon: 'sites',
    },
    {
      number: '—',
      label: 'Total Artifacts',
      note: 'No data available',
      icon: 'artifacts',
    },
    {
      number: '—',
      label: 'Active Beacons',
      note: 'No data available',
      icon: 'beacons',
    },
    {
      number: '—',
      label: 'Pending Feedback',
      note: 'No data available',
      icon: 'feedback',
    },
  ]

  return (
    <div className="dashboard">
      <section className="dashboard-stats" aria-label="System statistics">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <div>
              <p className="stat-card__number">{stat.number}</p>
              <p className="stat-card__label">{stat.label}</p>
              <p className="stat-card__note">{stat.note}</p>
            </div>

            <span className="stat-card__icon">
              <StatIcon type={stat.icon} />
            </span>
          </article>
        ))}
      </section>

      <section className="dashboard-charts">
        <article className="panel">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Site Overview</h2>
              <p className="panel__subtitle">Heritage sites by status</p>
            </div>

            <span className="panel__badge">No data</span>
          </div>

          <div className="bar-chart">
            <div className="empty-state">No data available</div>
          </div>
        </article>

        <article className="panel">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Artifact Categories</h2>
              <p className="panel__subtitle">
                Distribution of the collection
              </p>
            </div>

            <span className="panel__badge">No data</span>
          </div>

          <div className="category-content">
            <div className="empty-state">No data available</div>
          </div>
        </article>
      </section>

      <section className="panel activity-panel">
        <div className="activity-panel__heading">
          <h2>Recent Activities</h2>
          <span>Recent activity log</span>
        </div>

        <table className="activity-table">
          <thead>
            <tr>
              <th>Activity</th>
              <th>User</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {activities.length > 0 ? (
              activities.map(([activity, user, date, status]) => (
                <tr key={activity}>
                  <td>{activity}</td>
                  <td>{user}</td>
                  <td>{date}</td>
                  <td>
                    <span className="status-pill">{status}</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="empty-state">
                  No recent activities available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}

export default DashboardPage
