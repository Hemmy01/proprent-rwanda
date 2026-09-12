import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Navbar from './components/common/Navbar'
import PropBot from './components/common/PropBot'
import ProtectedRoute from './components/common/ProtectedRoute'
import Home from './pages/Home'
import Properties from './pages/Properties'
import PropertyDetail from './pages/PropertyDetail'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import Dashboard from './pages/dashboard/Dashboard'
import NotFound from './pages/NotFound'
import './styles/global.css'

function AppRoutes() {
  const { loading } = useAuth()
  if (loading) return <div className="spinner" style={{ marginTop: '6rem' }} />
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/properties" element={<Properties />} />
      <Route path="/properties/:id" element={<PropertyDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Navbar />
          <AppRoutes />
          <PropBot />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
