import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function DonorDashboard() {
  const { user } = useAuth()
  const profile = user.donorProfile

  return (
    <main className="dashboard">
      <div className="container">
        <div className="dash-header">
          <span className="role-badge">Donor</span>
          <h1>Welcome, {user.full_name}</h1>
        </div>

        <div className="dash-grid">
          <div className="dash-card">
            <h3>My profile</h3>
            <dl className="info-list">
              <dt>Blood group</dt><dd>{profile?.blood_group}</dd>
              <dt>City</dt><dd>{profile?.city || 'Not set'}</dd>
              <dt>Email</dt><dd>{user.email}</dd>
              <dt>Phone</dt><dd>{user.phone}</dd>
              <dt>Availability</dt>
              <dd>{profile?.is_available ? 'Available to donate' : 'Not available'}</dd>
              <dt>Location</dt>
              <dd>{profile?.location_consent ? 'Approximate location shared' : 'Not shared'}</dd>
              <dt>Last donation</dt>
              <dd>{profile?.last_donation_date || 'Not set'}</dd>
            </dl>
            <Link to="/donor/profile" className="btn btn-primary">
              Edit profile and availability
            </Link>
          </div>

                    <div className="dash-card">
            <h3>Blood requests</h3>
            <p>See requests from verified hospitals near you and accept or decline them.</p>
            <Link to="/donor/requests" className="btn btn-primary">
              View requests
            </Link>
          </div>

          <div className="dash-card">
            <h3>Donation history <span className="placeholder-tag">Placeholder</span></h3>
            <p>Your accepted requests and completed donations will appear here.</p>
          </div>
        </div>
      </div>
    </main>
  )
}

export default DonorDashboard