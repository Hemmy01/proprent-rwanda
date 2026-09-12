import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '70vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem'
    }}>
      <div style={{ fontSize: '6rem', fontWeight: 800, color: 'var(--border)', lineHeight: 1 }}>404</div>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '1rem 0 0.5rem' }}>Page Not Found</h1>
      <p style={{ color: 'var(--gray)', marginBottom: '2rem', maxWidth: 400 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link to="/" className="btn btn-primary">Go Home</Link>
        <Link to="/properties" className="btn btn-outline">Browse Properties</Link>
      </div>
    </div>
  )
}
