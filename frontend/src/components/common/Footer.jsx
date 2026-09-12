import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="logo">Prop<span>Rent</span></div>
          <p>Rwanda's trusted AI-powered platform for renting and buying property. Find your perfect home today.</p>
        </div>
        <div className="footer-col">
          <h4>Quick Links</h4>
          <Link to="/properties?listing=rent">Rent a Property</Link>
          <Link to="/properties?listing=sale">Buy a Property</Link>
          <Link to="/dashboard">My Dashboard</Link>
        </div>
        <div className="footer-col">
          <h4>Locations</h4>
          <Link to="/properties?q=Kigali">Kigali</Link>
          <Link to="/properties?q=Musanze">Musanze</Link>
          <Link to="/properties?q=Rubavu">Rubavu</Link>
          <Link to="/properties?q=Huye">Huye</Link>
        </div>
        <div className="footer-col">
          <h4>Contact</h4>
          <a href="tel:+250788000123">+250 788 000 123</a>
          <a href="mailto:info@proprent.rw">info@proprent.rw</a>
          <span>KG 7 Ave, Kigali</span>
        </div>
      </div>
      <div className="footer-bottom">© 2025 PropRent Rwanda. All rights reserved.</div>
    </footer>
  )
}
