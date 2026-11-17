import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { dashboardPath } from '../utils/roles'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [role, setRole] = useState(
    searchParams.get('role') === 'hospital' ? 'hospital' : 'donor'
  )
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    bloodGroup: '',
    hospitalName: '',
    registrationNumber: '',
    consent: false,
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!form.consent) {
      setError('Please accept the privacy consent to continue.')
      return
    }

    setSubmitting(true)
    try {
      const user = await register({
        role,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        consent: form.consent,
        bloodGroup: role === 'donor' ? form.bloodGroup : undefined,
        hospitalName: role === 'hospital' ? form.hospitalName : undefined,
        registrationNumber: role === 'hospital' ? form.registrationNumber : undefined,
      })
      navigate(dashboardPath(user.role))
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reach the server.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Create your account</h1>
        <p className="auth-subtitle">Choose how you want to use BloodLink.</p>

        <div className="role-toggle">
          <button
            type="button"
            className={role === 'donor' ? 'active' : ''}
            onClick={() => setRole('donor')}
          >
            I'm a Donor
          </button>
          <button
            type="button"
            className={role === 'hospital' ? 'active' : ''}
            onClick={() => setRole('hospital')}
          >
            I'm a Hospital
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="fullName">
            {role === 'donor' ? 'Full name' : 'Contact person name'}
          </label>
          <input
            id="fullName" name="fullName" required
            value={form.fullName} onChange={handleChange}
          />

          {role === 'hospital' && (
            <>
              <label htmlFor="hospitalName">Hospital name</label>
              <input
                id="hospitalName" name="hospitalName" required
                value={form.hospitalName} onChange={handleChange}
              />

              <label htmlFor="registrationNumber">Hospital registration number</label>
              <input
                id="registrationNumber" name="registrationNumber" required
                value={form.registrationNumber} onChange={handleChange}
              />
              <p className="field-note">
                Your hospital can create blood requests only after admin approval.
              </p>
            </>
          )}

          {role === 'donor' && (
            <>
              <label htmlFor="bloodGroup">Blood group</label>
              <select
                id="bloodGroup" name="bloodGroup" required
                value={form.bloodGroup} onChange={handleChange}
              >
                <option value="">Select blood group</option>
                {BLOOD_GROUPS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </>
          )}

          <label htmlFor="email">Email</label>
          <input
            id="email" name="email" type="email" required
            value={form.email} onChange={handleChange}
          />

          <label htmlFor="phone">Phone number</label>
          <input
            id="phone" name="phone" type="tel" required
            value={form.phone} onChange={handleChange}
          />

          <label htmlFor="password">Password</label>
          <input
            id="password" name="password" type="password" required
            value={form.password} onChange={handleChange}
            placeholder="At least 8 characters"
          />

          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword" name="confirmPassword" type="password" required
            value={form.confirmPassword} onChange={handleChange}
          />

          <label className="checkbox-row">
            <input
              type="checkbox" name="consent"
              checked={form.consent} onChange={handleChange}
            />
            <span>
              I agree to the processing of my personal data for blood donation
              coordination. I understand BloodLink does not decide medical
              eligibility.
            </span>
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </main>
  )
}

export default Register