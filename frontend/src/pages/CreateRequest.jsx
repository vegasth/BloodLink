import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { COMPONENT_LABELS, URGENCY_LABELS } from '../utils/labels'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const pad = (n) => String(n).padStart(2, '0')

function CreateRequest() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const profile = user.hospitalProfile

  const approved = profile?.verification_status === 'approved'
  const hasLocation = profile?.latitude != null && profile?.longitude != null

  const [form, setForm] = useState({
    component: '',
    bloodGroup: '',
    unitsRequired: 1,
    urgency: '',
    requiredBy: '',
    additionalInfo: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Earliest allowed date and time: right now (local time)
  const now = new Date()
  const minValue = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post('/hospital/requests', {
        ...form,
        unitsRequired: Number(form.unitsRequired),
        requiredBy: new Date(form.requiredBy).toISOString(),
      })
      navigate('/hospital/requests')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reach the server.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!approved || !hasLocation) {
    return (
      <main className="auth-page">
        <div className="auth-card" style={{ maxWidth: 560 }}>
          <Link to="/hospital" className="back-link">← Back to dashboard</Link>
          <h1>Create blood request</h1>
          {!approved ? (
            <p className="banner banner-warning">
              Only verified hospitals can create blood requests. Your hospital is
              waiting for administrator approval.
            </p>
          ) : (
            <>
              <p className="banner banner-warning">
                Please set your hospital location first. It is needed to find donors nearby.
              </p>
              <Link to="/hospital/profile" className="btn btn-primary">
                Set hospital location
              </Link>
            </>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="auth-page">
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <Link to="/hospital" className="back-link">← Back to dashboard</Link>
        <h1>Create blood request</h1>
        <p className="auth-subtitle">
          Request location: {profile.address}, {profile.city}
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="component">Blood component</label>
          <select
            id="component" name="component" required
            value={form.component} onChange={handleChange}
          >
            <option value="">Select component</option>
            {Object.entries(COMPONENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <label htmlFor="bloodGroup">Required blood group</label>
          <select
            id="bloodGroup" name="bloodGroup" required
            value={form.bloodGroup} onChange={handleChange}
          >
            <option value="">Select blood group</option>
            {BLOOD_GROUPS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <label htmlFor="unitsRequired">Units required</label>
          <input
            id="unitsRequired" name="unitsRequired" type="number"
            min="1" max="50" step="1" required
            value={form.unitsRequired} onChange={handleChange}
          />

          <label htmlFor="urgency">Emergency level</label>
          <select
            id="urgency" name="urgency" required
            value={form.urgency} onChange={handleChange}
          >
            <option value="">Select urgency</option>
            {Object.entries(URGENCY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <label htmlFor="requiredBy">Required by (date and time)</label>
          <input
            id="requiredBy" name="requiredBy" type="datetime-local"
            min={minValue} required
            value={form.requiredBy} onChange={handleChange}
          />

          <label htmlFor="additionalInfo">Additional information (optional)</label>
          <textarea
            id="additionalInfo" name="additionalInfo" rows="3" maxLength="500"
            value={form.additionalInfo} onChange={handleChange}
            placeholder="e.g. Report to the blood bank counter, ground floor."
          />
          <p className="field-note">
            BloodLink only helps find potential donors. Compatibility, screening,
            and final decisions are made by qualified professionals at your hospital.
            Do not enter patient names or medical details here.
          </p>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Creating request...' : 'Create request'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default CreateRequest