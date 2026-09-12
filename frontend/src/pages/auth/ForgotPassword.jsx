import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../api/services'
import { useToast } from '../../context/ToastContext'

export default function ForgotPassword() {
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [form, setForm] = useState({ code: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const emailRef = useRef('')

  const handleSendCode = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      emailRef.current = email
      setStep('reset')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async e => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      await authApi.resetPassword(emailRef.current, form.code.trim(), form.password)
      showToast('Password reset! You can now log in.', 'success')
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired code.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  return (
    <div className="split-auth">
      <div className="split-auth__form">
        <div className="split-auth__inner">
          <div className="split-auth__logo">Prop<span>Rent</span></div>

          {step === 'email' ? (
            <>
              <h2 className="split-auth__title">Reset Password</h2>
              <p style={{ color: 'var(--gray)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Enter your account email and we'll send you a reset code.
              </p>
              {error && <div className="alert-error">❌ {error}</div>}
              <form onSubmit={handleSendCode}>
                <div className="form-group">
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="Email Address *" className="split-input" required autoFocus
                  />
                </div>
                <button type="submit" className="split-btn" disabled={loading}>
                  {loading ? 'Sending…' : 'Send Reset Code'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="split-auth__title">Set New Password</h2>
              <p style={{ color: 'var(--gray)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                A 6-digit code was sent to <strong>{emailRef.current}</strong>
              </p>
              {error && <div className="alert-error">❌ {error}</div>}
              <form onSubmit={handleReset}>
                <div className="form-group">
                  <input
                    type="text" name="code" value={form.code} onChange={handleChange}
                    placeholder="000000" maxLength={6} required autoFocus
                    className="split-input split-input--otp"
                  />
                </div>
                <div className="form-group">
                  <input
                    type="password" name="password" value={form.password} onChange={handleChange}
                    placeholder="New Password *" className="split-input" minLength={6} required
                  />
                </div>
                <div className="form-group">
                  <input
                    type="password" name="confirm" value={form.confirm} onChange={handleChange}
                    placeholder="Confirm Password *" className="split-input" minLength={6} required
                  />
                </div>
                <button type="submit" className="split-btn" disabled={loading}>
                  {loading ? 'Resetting…' : 'Reset Password'}
                </button>
                <button
                  type="button" className="split-btn split-btn--ghost"
                  style={{ marginTop: '0.6rem' }}
                  onClick={() => { setStep('email'); setForm({ code: '', password: '', confirm: '' }); setError('') }}
                >
                  ← Back
                </button>
              </form>
            </>
          )}

          <div className="split-auth__switch" style={{ marginTop: '1.5rem' }}>
            <Link to="/login" className="split-link">← Back to Sign In</Link>
          </div>
        </div>
      </div>

      <div className="split-auth__image">
        <div className="split-auth__image-overlay">
          <div className="split-auth__image-text">
            <h3>Secure & Simple</h3>
            <p>Your account security is our priority. Reset your password in seconds.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
