import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { COMPONENT_LABELS, URGENCY_LABELS, statusLabel } from '../utils/labels'

function DonorRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    api.get('/donor/requests')
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

  const respond = async (requestId, decision) => {
    setError('')
    setInfo('')
    setBusyId(requestId)
    try {
      const res = await api.post(`/donor/requests/${requestId}/respond`, { decision })
      setInfo(res.data.message)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save your response.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="dashboard">
      <div className="container">
        <Link to="/donor" className="back-link">← Back to dashboard</Link>
        <div className="dash-header">
          <span className="role-badge">Donor</span>
          <h1>Blood requests for you</h1>
        </div>

        <p className="banner banner-info">
          These requests match your blood group, availability and area. Accepting shares your
          name and phone number with that hospital. Accepting does not mean you are medically
          eligible: hospital staff will screen you first. SMS and email alerts are simulated in
          this prototype, and this page is your real in-app notification list.
        </p>

        {error && <p className="form-error">{error}</p>}
        {info && <p className="form-success" style={{ marginBottom: 16 }}>{info}</p>}
        {loading && <p className="page-loading">Loading...</p>}
        {!loading && requests.length === 0 && (
          <p className="dash-card">
            No requests yet. Make sure your profile shows you as available and has location
            consent turned on.
          </p>
        )}

        <div className="hospital-list">
          {requests.map((r) => (
            <div className="dash-card" key={r.request_id}>
              <div className="hospital-head">
                <h3>{COMPONENT_LABELS[r.component]} · {r.blood_group}</h3>
                <div className="pill-row">
                  <span className={`status-pill urgency-${r.urgency}`}>
                    {URGENCY_LABELS[r.urgency]}
                  </span>
                  <span className={`status-pill status-${r.response_status}`}>
                    {statusLabel(r.response_status)}
                  </span>
                </div>
              </div>

              <dl className="info-list">
                <dt>Hospital</dt><dd>{r.hospital_name}</dd>
                <dt>Address</dt><dd>{r.hospital_address}</dd>
                <dt>Distance</dt>
                <dd>{r.distance_km !== null ? `about ${r.distance_km} km` : 'Unknown'}</dd>
                <dt>Units needed</dt><dd>{r.units_required}</dd>
                <dt>Needed by</dt><dd>{new Date(r.required_by).toLocaleString()}</dd>
                {r.additional_info && (
                  <>
                    <dt>Notes</dt><dd>{r.additional_info}</dd>
                  </>
                )}
              </dl>

              {r.open_for_response ? (
                <div className="decision-buttons">
                  <button
                    className="btn btn-primary"
                    disabled={busyId === r.request_id || r.response_status === 'accepted'}
                    onClick={() => respond(r.request_id, 'accepted')}
                  >
                    Accept
                  </button>
                  <button
                    className="btn btn-outline"
                    disabled={busyId === r.request_id || r.response_status === 'declined'}
                    onClick={() => respond(r.request_id, 'declined')}
                  >
                    Decline
                  </button>
                </div>
              ) : (
                <p className="field-note">This request can no longer be changed.</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

export default DonorRequests