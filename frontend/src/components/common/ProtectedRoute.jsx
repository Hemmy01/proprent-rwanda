import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children, adminOnly = false, agentOnly = false }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="spinner" />

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  if (adminOnly && user.role !== 'admin')
    return <Navigate to="/dashboard" replace />

  if (agentOnly && user.role !== 'agent')
    return <Navigate to="/dashboard" replace />

  if (user.role === 'agent' && !user.isActive)
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <h2>Account Pending Approval</h2>
        <p style={{ color: 'var(--gray)' }}>Your agent account is awaiting admin approval. You'll receive an email once approved.</p>
      </div>
    )

  return children
}
