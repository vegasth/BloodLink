import { Link, useNavigate } from 'react-router-dom'
import { Droplet } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { dashboardPath } from '../utils/roles'

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="logo">
          <Droplet size={26} fill="#E63946" color="#E63946" />
          <span>Blood<span className="logo-accent">Link</span></span>
        </Link>

        <nav className="nav-links">
          <a href="/#about">About</a>
          <a href="/#how-it-works">How It Works</a>
          <a href="/#contact">Contact</a>
        </nav>

        <div className="nav-actions">
          {user ? (
            <>
              <Link to={dashboardPath(user.role)} className="btn btn-outline">
                Dashboard
              </Link>
              <button className="btn btn-primary" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline">Login</Link>
              <Link to="/register" className="btn btn-primary">Register</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar