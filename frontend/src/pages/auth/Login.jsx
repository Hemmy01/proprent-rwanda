import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { authApi } from '../../api/services'

export default function Login() {
  const { login, verifyOtp } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  const [form, setForm] = useState({ email: '', password: '' })
  const [step, setStep] = useState('credentials')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const countdownRef = useRef(null)
  const emailRef = useRef(form.email)

  useEffect(() => {
    if (step !== 'otp') return
    clearInterval(countdownRef.current)
    setCountdown(60)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(countdownRef.current); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(countdownRef.current)
  }, [step])

  const handleResend = async () => {
    try {
      await authApi.resendOtp(emailRef.current)
      setCountdown(60)
      clearInterval(countdownRef.current)
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(countdownRef.current); return 0 }
          return prev - 1
        })
      }, 1000)
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code.')
    }
  }

  const handleChange = e => {
    if (error) setError('')
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleCredentials = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await login(form.email, form.password)
      if (data.otpRequired) {
        emailRef.current = form.email
        setCountdown(60)
        setStep('otp')
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message
      setError(typeof msg === 'string' && msg ? msg : 'Incorrect email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOtp = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await verifyOtp(emailRef.current, otp.trim())
      showToast(`Welcome back, ${user.fullName.split(' ')[0]}!`, 'success')
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired code.')
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

          {step === 'credentials' ? (
            <>
              <h2 className="split-auth__title">Sign in</h2>
              <div className="alert-error" style={{ marginBottom: '1rem', minHeight: '2.8rem', opacity: error ? 1 : 0, pointerEvents: error ? 'auto' : 'none' }}>❌ {error}</div>
              <form onSubmit={handleCredentials}>
                <div className="form-group">
                  <input
                    type="email" name="email" value={form.email}
                    onChange={handleChange} placeholder="Email Address *"
                    className="split-input" required
                  />
                </div>
                <div className="form-group">
                  <input
                    type="password" name="password" value={form.password}
                    onChange={handleChange} placeholder="Password *"
                    className="split-input" required
                  />
                </div>
                <button type="submit" className="split-btn" disabled={loading}>
                  {loading ? 'Checking…' : 'Continue'}
                </button>
                <div style={{ textAlign: 'right', marginTop: '8px' }}>
                  <Link to="/forgot-password" className="split-link">Forgot password?</Link>
                </div>
              </form>

              <div className="split-auth__or"><span>OR</span></div>

              <div className="split-auth__switch">
                New to PropRent? <Link to="/register" className="split-link">Create account</Link>
              </div>

              <p className="split-auth__terms">
                By signing in, I accept PropRent's <a href="#" className="split-link">terms of use</a>
              </p>
            </>
          ) : (
            <>
              <h2 className="split-auth__title">Check Your Email</h2>
              <p style={{ color: 'var(--gray)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                A 6-digit code was sent to <strong>{emailRef.current}</strong>.
                {countdown > 0
                  ? <> Expires in <strong>{countdown}s</strong>.</>
                  : <> Code expired.</>}
              </p>
              <div className="alert-error" style={{ marginBottom: '1rem', minHeight: '2.8rem', opacity: error ? 1 : 0, pointerEvents: error ? 'auto' : 'none' }}>❌ {error}</div>
              <form onSubmit={handleOtp}>
                <div className="form-group">
                  <input
                    type="text" value={otp} onChange={e => { if (error) setError(''); setOtp(e.target.value) }}
                    placeholder="000000" maxLength={6} required autoFocus
                    className="split-input split-input--otp"
                  />
                </div>
                <button type="submit" className="split-btn" disabled={loading}>
                  {loading ? 'Verifying…' : 'Verify & Sign In'}
                </button>
                <button
                  type="button" className="split-btn split-btn--ghost"
                  style={{ marginTop: '0.6rem' }}
                  onClick={handleResend}
                  disabled={countdown > 0}
                >
                  {countdown > 0 ? `Resend Code (${countdown}s)` : 'Resend Code'}
                </button>
                <button
                  type="button" className="split-btn split-btn--ghost"
                  style={{ marginTop: '0.6rem' }}
                  onClick={() => { setStep('credentials'); setOtp(''); setError(''); clearInterval(countdownRef.current) }}
                >
                  ← Back
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="split-auth__image">
        <div className="split-auth__image-overlay">
          <div className="split-auth__image-text">
            <h3>Rwanda's Smartest Property Platform</h3>
            <p>AI-powered matching, instant price estimates, and thousands of verified listings.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
