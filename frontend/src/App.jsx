import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import DonorDashboard from './pages/DonorDashboard'
import DonorProfile from './pages/DonorProfile'
import DonorRequests from './pages/DonorRequests'
import HospitalDashboard from './pages/HospitalDashboard'
import HospitalProfile from './pages/HospitalProfile'
import CreateRequest from './pages/CreateRequest'
import ManageRequests from './pages/ManageRequests'
import HospitalResponses from './pages/HospitalResponses'
import AdminDashboard from './pages/AdminDashboard'
import HospitalVerification from './pages/HospitalVerification'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/donor"
            element={
              <ProtectedRoute roles={['donor']}>
                <DonorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/donor/profile"
            element={
              <ProtectedRoute roles={['donor']}>
                <DonorProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/donor/requests"
            element={
              <ProtectedRoute roles={['donor']}>
                <DonorRequests />
              </ProtectedRoute>
            }
          />

          <Route
            path="/hospital"
            element={
              <ProtectedRoute roles={['hospital']}>
                <HospitalDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hospital/profile"
            element={
              <ProtectedRoute roles={['hospital']}>
                <HospitalProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hospital/requests"
            element={
              <ProtectedRoute roles={['hospital']}>
                <ManageRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hospital/requests/new"
            element={
              <ProtectedRoute roles={['hospital']}>
                <CreateRequest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hospital/requests/:id/responses"
            element={
              <ProtectedRoute roles={['hospital']}>
                <HospitalResponses />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/hospitals"
            element={
              <ProtectedRoute roles={['admin']}>
                <HospitalVerification />
              </ProtectedRoute>
            }
          />
        </Routes>
        <Footer />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App