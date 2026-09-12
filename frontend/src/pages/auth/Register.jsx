import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export default function Register() {
  const { register, verifyOtp } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '', role: 'tenant' })
  const [step, setStep] = useState(1) // 1=form, 2=otp, 3=agent-pending
  const [otpEmail, setOtpEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    try {
      const result = await register(form.fullName, form.email, form.password, form.phone, form.role)
      setOtpEmail(form.email)
      if (result.pending) {
        setStep(3)
      } else {
        setStep(2)
        showToast('Account created! Check your email for the verification code.', 'success')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await verifyOtp(otpEmail, otp)
      showToast(`Welcome, ${user.fullName.split(' ')[0]}!`, 'success')
      navigate('/dashboard')
    } catch {
      setError('Invalid or expired code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="split-auth">
      {/* ── Left panel ── */}
      <div className="split-auth__form">
        <div className="split-auth__inner">
          <div className="split-auth__logo">Prop<span>Rent</span></div>

          {step === 1 && (
            <>
              <h2 className="split-auth__title">Create account</h2>
              {error && <div className="alert-error">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <input type="text" name="fullName" value={form.fullName} onChange={handleChange}
                    placeholder="Full Name *" className="split-input" required />
                </div>
                <div className="form-group">
                  <input type="email" name="email" value={form.email} onChange={handleChange}
                    placeholder="Email Address *" className="split-input" required />
                </div>
                <div className="form-group">
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange}
                    placeholder="Phone Number" className="split-input" />
                </div>
                <div className="form-group">
                  <select name="role" value={form.role} onChange={handleChange} className="split-input">
                    <option value="tenant">Tenant — looking for a property</option>
                    <option value="agent">Agent — listing properties for rent/sale</option>
                  </select>
                </div>
                {form.role === 'agent' && (
                  <div className="split-auth__agent-notice">
                    Agent accounts require admin approval before you can log in.
                  </div>
                )}
                <div className="form-group">
                  <input type="password" name="password" value={form.password} onChange={handleChange}
                    placeholder="Password *" className="split-input" minLength={6} required />
                </div>
                <div className="form-group">
                  <input type="password" name="confirm" value={form.confirm} onChange={handleChange}
                    placeholder="Confirm Password *" className="split-input" required />
                </div>
                <button type="submit" className="split-btn" disabled={loading}>
                  {loading ? 'Creating account…' : 'Create Account'}
                </button>
              </form>

              <div className="split-auth__or"><span>OR</span></div>

              <div className="split-auth__switch">
                Already have an account? <Link to="/login" className="split-link">Sign in</Link>
              </div>

              <p className="split-auth__terms">
                By registering, I accept PropRent's <a href="#" className="split-link">terms of use</a>
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="split-auth__title">Verify Your Email</h2>
              <p style={{ color: 'var(--gray)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                A 6-digit code was sent to <strong>{otpEmail}</strong>
              </p>
              {error && <div className="alert-error">{error}</div>}
              <form onSubmit={handleVerify}>
                <div className="form-group">
                  <input
                    type="text" value={otp} onChange={e => setOtp(e.target.value)}
                    placeholder="000000" maxLength={6} required autoFocus
                    className="split-input split-input--otp"
                  />
                </div>
                <button type="submit" className="split-btn" disabled={loading}>
                  {loading ? 'Verifying…' : 'Verify & Continue'}
                </button>
                <button type="button" className="split-btn split-btn--ghost"
                  style={{ marginTop: '0.6rem' }}
                  onClick={() => { setStep(1); setError('') }}>
                  ← Back
                </button>
              </form>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="split-auth__title">Application Submitted</h2>
              <div className="split-auth__pending">
                <p>Your agent account is pending admin approval.</p>
                <p style={{ marginTop: '0.5rem' }}>
                  We'll notify you at <strong>{otpEmail}</strong> once approved.
                </p>
              </div>
              <Link to="/login" className="split-btn" style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
                Back to Sign In
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="split-auth__image">
        <div className="split-auth__image-overlay">
          <div className="split-auth__image-text">
            <h3>Find Your Perfect Home in Rwanda</h3>
            <p>Join thousands of tenants and agents on Rwanda's AI-powered property platform.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
