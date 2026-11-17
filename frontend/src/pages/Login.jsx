import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { dashboardPath } from '../utils/roles'

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = await login(form.email, form.password)
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
        <h1>Welcome back</h1>
        <p className="auth-subtitle">Log in to your BloodLink account.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email" name="email" type="email" required
            value={form.email} onChange={handleChange}
            placeholder="you@example.com"
          />

          <label htmlFor="password">Password</label>
          <input
            id="password" name="password" type="password" required
            value={form.password} onChange={handleChange}
            placeholder="Your password"
          />

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="auth-switch">
          New to BloodLink? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </main>
  )
}

export default Login