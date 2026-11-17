import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { dashboardPath } from '../utils/roles'

// Only lets logged-in users with the right role see a page
function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth()

  if (loading) return <p className="page-loading">Loading...</p>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={dashboardPath(user.role)} replace />
  }
  return children
}

export default ProtectedRoute