import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/admin/stats')
      .then((res) => setStats(res.data))
      .catch(() => setError('Could not load statistics.'))
  }, [])

  const cards = stats && [
    { label: 'Registered donors', value: stats.donors },
    { label: 'Registered hospitals', value: stats.hospitals },
    { label: 'Hospitals awaiting verification', value: stats.pending_hospitals },
    { label: 'Blood requests', value: stats.requests },
  ]

  return (
    <main className="dashboard">
      <div className="container">
        <div className="dash-header">
          <span className="role-badge">Admin</span>
          <h1>Welcome, {user.full_name}</h1>
        </div>

        {error && <p className="form-error">{error}</p>}

        {cards && (
          <div className="dash-grid four">
            {cards.map((c) => (
              <div className="dash-card" key={c.label}>
                <div className="stat-number">{c.value}</div>
                <p>{c.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="dash-grid" style={{ marginTop: 20 }}>
          <div className="dash-card">
            <h3>Hospital verification</h3>
            <p>
              {stats
                ? `${stats.pending_hospitals} hospital(s) waiting for review.`
                : 'Approve or reject hospital registrations.'}
            </p>
            <Link to="/admin/hospitals" className="btn btn-primary">
              Review hospitals
            </Link>
          </div>
          <div className="dash-card">
            <h3>User management <span className="placeholder-tag">Placeholder</span></h3>
            <p>View and suspend accounts.</p>
          </div>
          <div className="dash-card">
            <h3>Audit logs <span className="placeholder-tag">Placeholder</span></h3>
            <p>Decisions are already being recorded. The viewer page comes later.</p>
          </div>
        </div>
      </div>
    </main>
  )
}

export default AdminDashboard