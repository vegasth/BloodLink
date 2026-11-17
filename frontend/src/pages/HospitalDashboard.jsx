import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function HospitalDashboard() {
  const { user } = useAuth()
  const profile = user.hospitalProfile
  const status = profile?.verification_status
  const approved = status === 'approved'
  const hasLocation = profile?.latitude != null && profile?.longitude != null

  return (
    <main className="dashboard">
      <div className="container">
        <div className="dash-header">
          <span className="role-badge">Hospital</span>
          <h1>{profile?.hospital_name}</h1>
        </div>

        {status === 'pending' && (
          <p className="banner banner-warning">
            Verification pending: an administrator must approve your hospital
            before you can create blood requests.
          </p>
        )}
        {approved && (
          <p className="banner banner-success">
            Your hospital is verified. You can create blood requests.
          </p>
        )}
        {status === 'rejected' && (
          <p className="banner banner-warning">
            Your verification was rejected
            {profile?.verification_notes ? `: ${profile.verification_notes}` : '.'}{' '}
            Please contact the administrator.
          </p>
        )}
        {approved && !hasLocation && (
          <p className="banner banner-warning">
            Set your hospital location before creating a request.
          </p>
        )}

        <div className="dash-grid">
          <div className="dash-card">
            <h3>Hospital details</h3>
            <dl className="info-list">
              <dt>Registration no.</dt><dd>{profile?.registration_number}</dd>
              <dt>Contact person</dt><dd>{user.full_name}</dd>
              <dt>Email</dt><dd>{user.email}</dd>
              <dt>Verification</dt><dd>{status}</dd>
              <dt>Address</dt>
              <dd>{profile?.address ? `${profile.address}, ${profile.city}` : 'Not set'}</dd>
              <dt>Location</dt><dd>{hasLocation ? 'Set' : 'Not set'}</dd>
            </dl>
            <Link to="/hospital/profile" className="btn btn-outline">
              Edit hospital profile
            </Link>
          </div>

          <div className="dash-card">
            <h3>Create blood request</h3>
            <p>Post an urgent request for donors near your hospital.</p>
            {approved && hasLocation ? (
              <Link to="/hospital/requests/new" className="btn btn-primary">
                New request
              </Link>
            ) : (
              <button className="btn btn-primary" disabled>New request</button>
            )}
          </div>

          <div className="dash-card">
            <h3>My requests</h3>
            <p>View requests, update units received, or cancel a request.</p>
            <Link to="/hospital/requests" className="btn btn-outline">
              View requests
            </Link>
          </div>

            <div className="dash-card">
            <h3>Donor responses</h3>
            <p>Open a request from "My requests" to find donors and track their responses.</p>
          </div>
        </div>
      </div>
    </main>
  )
}

export default HospitalDashboard