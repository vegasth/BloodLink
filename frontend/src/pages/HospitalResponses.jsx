import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'
import { COMPONENT_LABELS, URGENCY_LABELS, statusLabel } from '../utils/labels'

const SET_STATUSES = [
  'contacted', 'arrived', 'screened', 'donation_completed', 'did_not_arrive', 'not_eligible',
]
const CLOSED = ['fulfilled', 'cancelled', 'expired']

function HospitalResponses() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [matching, setMatching] = useState(false)
  const [selected, setSelected] = useState({})
  const [busyId, setBusyId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    api.get(`/hospital/requests/${id}/responses`)
      .then((res) => {
        if (!cancelled) {
          setData(res.data)
          setError('')
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Could not load responses.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id, reloadKey])

  const findDonors = async () => {
    setError('')
    setInfo('')
    setMatching(true)
    try {
      const res = await api.post(`/hospital/requests/${id}/match`)
      setInfo(res.data.message)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not search for donors.')
    } finally {
      setMatching(false)
    }
  }

  const updateStatus = async (donorId) => {
    const status = selected[donorId]
    if (!status) return
    setError('')
    setInfo('')
    setBusyId(donorId)
    try {
      await api.patch(`/hospital/requests/${id}/responses/${donorId}`, { status })
      setSelected({ ...selected, [donorId]: '' })
      setReloadKey((k) => k + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the status.')
    } finally {
      setBusyId(null)
    }
  }

  const request = data?.request
  const closed = request ? CLOSED.includes(request.status) : false

  return (
    <main className="dashboard">
      <div className="container">
        <Link to="/hospital/requests" className="back-link">← Back to my requests</Link>
        <div className="dash-header">
          <span className="role-badge">Hospital</span>
          <h1>Donor responses</h1>
        </div>

        {error && <p className="form-error">{error}</p>}
        {info && <p className="form-success" style={{ marginBottom: 16 }}>{info}</p>}
        {loading && <p className="page-loading">Loading...</p>}

        {request && (
          <>
            <div className="dash-card" style={{ marginBottom: 20 }}>
              <div className="hospital-head">
                <h3>
                  {COMPONENT_LABELS[request.component]} · {request.blood_group} ·{' '}
                  {request.units_required} unit(s)
                </h3>
                <div className="pill-row">
                  <span className={`status-pill urgency-${request.urgency}`}>
                    {URGENCY_LABELS[request.urgency]}
                  </span>
                  <span className={`status-pill status-${request.status}`}>
                    {statusLabel(request.status)}
                  </span>
                </div>
              </div>
              <p>
                Required by {new Date(request.required_by).toLocaleString()} · Search radius
                used: {request.search_radius_km} km · Units received: {request.units_fulfilled} of{' '}
                {request.units_required}
              </p>
              <button
                className="btn btn-primary"
                style={{ marginTop: 14 }}
                disabled={matching || closed}
                onClick={findDonors}
              >
                {matching ? 'Searching...' : 'Find and notify donors'}
              </button>
              <p className="field-note">
                Matching uses an academic simplification of blood group compatibility, not
                medical advice. Your clinical staff make the final decision. You can search
                again to find newly available donors.
              </p>
            </div>

            <div className="dash-grid four" style={{ marginBottom: 20 }}>
              <div className="dash-card">
                <div className="stat-number">{data.counts.notified}</div>
                <p>Donors notified</p>
              </div>
              <div className="dash-card">
                <div className="stat-number">{data.counts.pending}</div>
                <p>Waiting for reply</p>
              </div>
              <div className="dash-card">
                <div className="stat-number">{data.counts.accepted}</div>
                <p>Accepted</p>
              </div>
              <div className="dash-card">
                <div className="stat-number">{data.counts.declined}</div>
                <p>Declined</p>
              </div>
            </div>

            <h2 className="section-heading">Donors who accepted</h2>
            <p className="field-note" style={{ marginBottom: 14 }}>
              Names and phone numbers appear only after a donor accepts. An accepted donor is
              not yet screened: medical eligibility is decided by your staff.
            </p>

            {data.donors.length === 0 && (
              <p className="dash-card">No donor has accepted yet.</p>
            )}

            <div className="hospital-list">
              {data.donors.map((d) => (
                <div className="dash-card" key={d.donor_id}>
                  <div className="hospital-head">
                    <h3>{d.full_name}</h3>
                    <span className={`status-pill status-${d.status}`}>
                      {statusLabel(d.status)}
                    </span>
                  </div>
                  <dl className="info-list">
                    <dt>Blood group</dt><dd>{d.blood_group}</dd>
                    <dt>Phone</dt><dd>{d.phone}</dd>
                    <dt>Distance</dt>
                    <dd>{d.distance_km !== null ? `about ${d.distance_km} km` : 'Unknown'}</dd>
                  </dl>

                  {['accepted', 'contacted', 'arrived', 'screened'].includes(d.status) && (
                    <div className="progress-row">
                      <select
                        className="status-select"
                        value={selected[d.donor_id] || ''}
                        onChange={(e) =>
                          setSelected({ ...selected, [d.donor_id]: e.target.value })
                        }
                      >
                        <option value="">Change status...</option>
                        {SET_STATUSES.map((s) => (
                          <option key={s} value={s}>{statusLabel(s)}</option>
                        ))}
                      </select>
                      <button
                        className="btn btn-outline"
                        disabled={busyId === d.donor_id || !selected[d.donor_id]}
                        onClick={() => updateStatus(d.donor_id)}
                      >
                        Update
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}

export default HospitalResponses