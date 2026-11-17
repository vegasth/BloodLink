import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

// 2 decimals is roughly 1 km: we never send exact GPS
const round2 = (n) => Math.round(n * 100) / 100

function DonorProfile() {
  const { user, refreshUser } = useAuth()
  const profile = user.donorProfile

  const [form, setForm] = useState({
    city: profile?.city || '',
    isAvailable: profile?.is_available ?? true,
    lastDonationDate: profile?.last_donation_date || '',
    locationConsent: profile?.location_consent ?? false,
  })
  const [captured, setCaptured] = useState(null) // newly captured location
  const [locating, setLocating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const savedLocation =
    profile?.approx_latitude != null && profile?.approx_longitude != null
      ? {
          latitude: Number(profile.approx_latitude),
          longitude: Number(profile.approx_longitude),
        }
      : null
  const shownLocation = form.locationConsent ? captured || savedLocation : null

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
    if (name === 'locationConsent' && !checked) setCaptured(null)
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
        setCaptured({
          latitude: round2(pos.coords.latitude),
          longitude: round2(pos.coords.longitude),
        })
        setLocating(false)
      },
      () => {
        setError('Could not get your location. Allow location access in the browser and try again.')
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
      await api.put('/donor/profile', {
        city: form.city,
        isAvailable: form.isAvailable,
        lastDonationDate: form.lastDonationDate || null,
        locationConsent: form.locationConsent,
        latitude: captured?.latitude,
        longitude: captured?.longitude,
      })
      await refreshUser()
      setCaptured(null)
      setMessage('Profile saved.')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reach the server.')
    } finally {
      setSaving(false)
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <main className="auth-page">
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <Link to="/donor" className="back-link">← Back to dashboard</Link>
        <h1>Profile and availability</h1>
        <p className="auth-subtitle">
          Blood group: <strong>{profile?.blood_group}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <label className="checkbox-row">
            <input
              type="checkbox" name="isAvailable"
              checked={form.isAvailable} onChange={handleChange}
            />
            <span>I am available to donate and happy to receive requests.</span>
          </label>

          <label htmlFor="city">City</label>
          <input
            id="city" name="city" value={form.city} onChange={handleChange}
            placeholder="e.g. Demo City"
          />

          <label htmlFor="lastDonationDate">Last donation date (optional)</label>
          <input
            id="lastDonationDate" name="lastDonationDate" type="date" max={today}
            value={form.lastDonationDate} onChange={handleChange}
          />
          <p className="field-note">
            This is self-reported and only for your records. BloodLink does not decide
            medical eligibility. Qualified professionals at the hospital do.
          </p>

          <label className="checkbox-row">
            <input
              type="checkbox" name="locationConsent"
              checked={form.locationConsent} onChange={handleChange}
            />
            <span>
              I consent to BloodLink using my <strong>approximate</strong> location
              to find requests near me. My exact position is never stored or shown.
            </span>
          </label>

          {form.locationConsent && (
            <div className="location-box">
              <button
                type="button" className="btn btn-outline"
                onClick={useMyLocation} disabled={locating}
              >
                <MapPin size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
                {locating ? 'Finding location...' : 'Use my current location'}
              </button>
              <p className="field-note">
                {shownLocation
                  ? `Approximate location ready: ${shownLocation.latitude}, ${shownLocation.longitude} (rounded to about 1 km)${captured ? '. Click Save to store it.' : '. Saved.'}`
                  : 'No location saved yet.'}
              </p>
            </div>
          )}

          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-success">{message}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default DonorProfile