import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

const FILTERS = ['pending', 'approved', 'rejected', 'all']

function HospitalVerification() {
  const [filter, setFilter] = useState('pending')
  const [hospitals, setHospitals] = useState([])
  const [notes, setNotes] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    api.get(`/admin/hospitals?status=${filter}`)
      .then((res) => {
        if (!cancelled) {
          setHospitals(res.data.hospitals)
          setError('')
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load hospitals.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [filter, reloadKey])

  const changeFilter = (f) => {
    setLoading(true)
    setFilter(f)
  }

  const decide = async (hospital, decision) => {
    setError('')
    setBusyId(hospital.user_id)
    try {
      await api.patch(`/admin/hospitals/${hospital.user_id}/verify`, {
        decision,
        notes: notes[hospital.user_id] || '',
      })
      setReloadKey((k) => k + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the decision.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="dashboard">
      <div className="container">
        <Link to="/admin" className="back-link">← Back to dashboard</Link>
        <div className="dash-header">
          <span className="role-badge">Admin</span>
          <h1>Hospital verification</h1>
        </div>

        <div className="filter-tabs">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={filter === f ? 'active' : ''}
              onClick={() => changeFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {error && <p className="form-error">{error}</p>}
        {loading && <p className="page-loading">Loading...</p>}
        {!loading && hospitals.length === 0 && (
          <p className="dash-card">No hospitals in this list.</p>
        )}

        <div className="hospital-list">
          {hospitals.map((h) => (
            <div className="dash-card" key={h.user_id}>
              <div className="hospital-head">
                <h3>{h.hospital_name}</h3>
                <span className={`status-pill status-${h.verification_status}`}>
                  {h.verification_status}
                </span>
              </div>

              <dl className="info-list">
                <dt>Registration no.</dt><dd>{h.registration_number}</dd>
                <dt>Contact person</dt><dd>{h.contact_name}</dd>
                <dt>Email</dt><dd>{h.email}</dd>
                <dt>Phone</dt><dd>{h.phone}</dd>
                <dt>Registered on</dt>
                <dd>{new Date(h.created_at).toLocaleDateString()}</dd>
                {h.verification_notes && (
                  <>
                    <dt>Notes</dt><dd>{h.verification_notes}</dd>
                  </>
                )}
              </dl>

              <input
                className="notes-input"
                placeholder="Notes (required when rejecting)"
                value={notes[h.user_id] || ''}
                onChange={(e) => setNotes({ ...notes, [h.user_id]: e.target.value })}
              />

              <div className="decision-buttons">
                <button
                  className="btn btn-primary"
                  disabled={busyId === h.user_id || h.verification_status === 'approved'}
                  onClick={() => decide(h, 'approved')}
                >
                  Approve
                </button>
                <button
                  className="btn btn-outline"
                  disabled={busyId === h.user_id || h.verification_status === 'rejected'}
                  onClick={() => decide(h, 'rejected')}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

export default HospitalVerification