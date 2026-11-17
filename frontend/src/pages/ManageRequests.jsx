import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { COMPONENT_LABELS, URGENCY_LABELS, statusLabel } from '../utils/labels'

const CLOSED = ['fulfilled', 'cancelled', 'expired']

function ManageRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState({})
  const [busyId, setBusyId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    api.get('/hospital/requests')
      .then((res) => {
        if (!cancelled) setRequests(res.data.requests)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your requests.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [reloadKey])

  const run = async (id, action) => {
    setError('')
    setBusyId(id)
    try {
      await action()
      setReloadKey((k) => k + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.')
    } finally {
      setBusyId(null)
    }
  }

  const updateProgress = (r) =>
    run(r.id, () =>
      api.patch(`/hospital/requests/${r.id}/progress`, {
        unitsFulfilled: Number(progress[r.id] ?? r.units_fulfilled),
      })
    )

  const cancelRequest = (r) => {
    if (!window.confirm('Cancel this request?')) return
    run(r.id, () => api.post(`/hospital/requests/${r.id}/cancel`))
  }

  return (
    <main className="dashboard">
      <div className="container">
        <Link to="/hospital" className="back-link">← Back to dashboard</Link>
        <div className="dash-header">
          <span className="role-badge">Hospital</span>
          <h1>My blood requests</h1>
        </div>

        <Link to="/hospital/requests/new" className="btn btn-primary" style={{ marginBottom: 20 }}>
          New request
        </Link>

        {error && <p className="form-error">{error}</p>}
        {loading && <p className="page-loading">Loading...</p>}
        {!loading && requests.length === 0 && (
          <p className="dash-card">You have not created any requests yet.</p>
        )}

        <div className="hospital-list">
          {requests.map((r) => {
            const closed = CLOSED.includes(r.status)
            return (
              <div className="dash-card" key={r.id}>
                <div className="hospital-head">
                  <h3>
                    {COMPONENT_LABELS[r.component]} · {r.blood_group}
                  </h3>
                  <div className="pill-row">
                    <span className={`status-pill urgency-${r.urgency}`}>
                      {URGENCY_LABELS[r.urgency]}
                    </span>
                    <span className={`status-pill status-${r.status}`}>
                      {statusLabel(r.status)}
                    </span>
                  </div>
                </div>

                <dl className="info-list">
                  <dt>Units</dt>
                  <dd>{r.units_fulfilled} of {r.units_required} received</dd>
                  <dt>Required by</dt>
                  <dd>{new Date(r.required_by).toLocaleString()}</dd>
                  <dt>Search radius</dt>
                  <dd>{r.search_radius_km} km</dd>
                  {r.additional_info && (
                    <>
                      <dt>Notes</dt><dd>{r.additional_info}</dd>
                    </>
                  )}
                </dl>

                {!closed && (
                  <>
                                    <Link
                  to={`/hospital/requests/${r.id}/responses`}
                  className="btn btn-primary"
                  style={{ marginTop: 14 }}
                >
                  Donor responses
                </Link>
                    <div className="progress-row">
                      <input
                        type="number" min="0" max={r.units_required}
                        value={progress[r.id] ?? r.units_fulfilled}
                        onChange={(e) => setProgress({ ...progress, [r.id]: e.target.value })}
                        aria-label="Units received"
                      />
                      <button
                        className="btn btn-outline"
                        disabled={busyId === r.id}
                        onClick={() => updateProgress(r)}
                      >
                        Update units received
                      </button>
                    </div>
                    <div className="decision-buttons">
                      <button
                        className="btn btn-outline"
                        disabled={busyId === r.id}
                        onClick={() => cancelRequest(r)}
                      >
                        Cancel request
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}

export default ManageRequests