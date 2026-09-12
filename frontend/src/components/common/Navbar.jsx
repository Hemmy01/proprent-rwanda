import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { pathname, search } = useLocation()
  const params = new URLSearchParams(search)
  const listing = params.get('listing')
  const isProperties = pathname === '/properties'
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 20)
      setHidden(y > 80 && y > lastY.current)
      lastY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close menu on route change
  useEffect(() => { setMenuOpen(false) }, [pathname, search])

  return (
    <nav className={`navbar${scrolled ? ' navbar--scrolled' : ''}${hidden ? ' navbar--hidden' : ''}`}>
      <Link to="/" className="logo">Prop<span>Rent</span></Link>

      {/* Desktop links */}
      <div className="nav-links nav-links--desktop">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>Home</NavLink>
        <Link to="/properties?listing=rent" className={isProperties && listing === 'rent' ? 'active' : ''}>Rent</Link>
        <Link to="/properties?listing=sale" className={isProperties && listing === 'sale' ? 'active' : ''}>Buy</Link>
        <Link to="/properties" className={isProperties && !listing ? 'active' : ''}>All Listings</Link>
        {user ? (
          <>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>{user.fullName.split(' ')[0]}</NavLink>
            <button className="btn-nav-outline" onClick={logout} style={{ background: 'none', cursor: 'pointer' }}>Logout</button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={({ isActive }) => isActive ? 'btn-nav-outline active' : 'btn-nav-outline'}>Login</NavLink>
            <NavLink to="/register" className={({ isActive }) => isActive ? 'btn-nav active' : 'btn-nav'}>Register</NavLink>
          </>
        )}
      </div>

      {/* Mobile hamburger */}
      <button className="nav-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
        <span className={menuOpen ? 'bar bar--open' : 'bar'} />
        <span className={menuOpen ? 'bar bar--open bar--mid' : 'bar'} />
        <span className={menuOpen ? 'bar bar--open' : 'bar'} />
      </button>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="nav-mobile-menu">
          <NavLink to="/" end onClick={() => setMenuOpen(false)}>Home</NavLink>
          <Link to="/properties?listing=rent" onClick={() => setMenuOpen(false)}>For Rent</Link>
          <Link to="/properties?listing=sale" onClick={() => setMenuOpen(false)}>For Sale</Link>
          <Link to="/properties" onClick={() => setMenuOpen(false)}>All Listings</Link>
          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <button onClick={() => { logout(); setMenuOpen(false) }}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)}>Register</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
