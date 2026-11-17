import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

function HospitalProfile() {
  const { user, refreshUser } = useAuth()
  const profile = user.hospitalProfile

  const [form, setForm] = useState({
    address: profile?.address || '',
    city: profile?.city || '',
    latitude: profile?.latitude ?? '',
    longitude: profile?.longitude ?? '',
  })
  const [locating, setLocating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const useMyLocation = () => {
    setError('')
    setMessage('')
    if (!navigator.geolocation) {
      setError('Your browser does not support location.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }))
        setLocating(false)
      },
      () => {
        setError('Could not get your location. Allow location access, or type the coordinates.')
        setLocating(false)
      },
      { timeout: 10000 }
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setSaving(true)
    try {
      await api.put('/hospital/profile', form)
      await refreshUser()
      setMessage('Hospital profile saved.')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reach the server.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <Link to="/hospital" className="back-link">← Back to dashboard</Link>
        <h1>Hospital profile</h1>
        <p className="auth-subtitle">
          {profile?.hospital_name}. Your location is used to find donors near your hospital.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="address">Address</label>
          <input
            id="address" name="address" required
            value={form.address} onChange={handleChange}
            placeholder="e.g. 12 Demo Road"
          />

          <label htmlFor="city">City</label>
          <input
            id="city" name="city" required
            value={form.city} onChange={handleChange}
            placeholder="e.g. Demo City"
          />

          <label htmlFor="latitude">Latitude</label>
          <input
            id="latitude" name="latitude" required type="number" step="any"
            value={form.latitude} onChange={handleChange}
          />

          <label htmlFor="longitude">Longitude</label>
          <input
            id="longitude" name="longitude" required type="number" step="any"
            value={form.longitude} onChange={handleChange}
          />

          <div className="location-box">
            <button
              type="button" className="btn btn-outline"
              onClick={useMyLocation} disabled={locating}
            >
              <MapPin size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
              {locating ? 'Finding location...' : 'Use my current location'}
            </button>
            <p className="field-note">
              For the demo you can use your current location or type any coordinates.
              Hospital coordinates are used only for distance matching and are not shown to donors.
            </p>
          </div>

          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-success">{message}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? 'Saving...' : 'Save hospital profile'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default HospitalProfile