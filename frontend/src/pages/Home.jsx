import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { propertyApi, userApi } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import PropertyCard from '../components/common/PropertyCard'
import Footer from '../components/common/Footer'
import EstimatorModal from '../components/common/EstimatorModal'

const PROPERTY_TYPES = ['Apartment', 'House', 'Studio', 'Townhouse', 'Commercial']

function heroSearch(query, listing, type, navigate) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (listing) params.set('listing', listing)
  if (type) params.set('type', type)
  navigate(`/properties?${params.toString()}`)
}

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()

  const [search, setSearch] = useState({ query: '', listing: '', type: '' })
  const [featuredRentals, setFeaturedRentals] = useState([])
  const [featuredSales, setFeaturedSales] = useState([])
  const [totalListings, setTotalListings] = useState(0)
  const [loading, setLoading] = useState(true)

  // AI Matching modal state
  const [showAiModal, setShowAiModal] = useState(false)
  const [showEstimator, setShowEstimator] = useState(false)
  const [prefsForm, setPrefsForm] = useState({ listingType: '', propertyType: '', maxPrice: '', minBedrooms: '', preferredLocation: '' })
  const [prefsLoading, setPrefsLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      propertyApi.getAll({ listingType: 'rent', availableOnly: true, pageSize: 3 }),
      propertyApi.getAll({ listingType: 'sale', availableOnly: true, pageSize: 3 }),
      propertyApi.getAll({ availableOnly: true, pageSize: 1 }),
    ]).then(([rentRes, saleRes, totalRes]) => {
      setFeaturedRentals(rentRes.data.items)
      setFeaturedSales(saleRes.data.items)
      setTotalListings(totalRes.data.totalCount)
    }).catch(() => {}).finally(() => setLoading(false))

    // Pre-fill prefs if user is logged in
    if (user) {
      userApi.getPreferences().then(res => {
        if (res.data) setPrefsForm({
          listingType: res.data.listingType || '',
          propertyType: res.data.propertyType || '',
          maxPrice: res.data.maxPrice || '',
          minBedrooms: res.data.minBedrooms || '',
          preferredLocation: res.data.preferredLocation || '',
        })
      }).catch(() => {})
    }
  }, [user])

  const handleOpenAiMatch = () => {
    if (!user) { navigate('/login', { state: { from: { pathname: '/' } } }); return }
    setShowAiModal(true)
  }

  const handleSavePrefs = async () => {
    if (!user) return
    setPrefsLoading(true)
    try {
      await userApi.upsertPreferences({
        listingType: prefsForm.listingType || null,
        propertyType: prefsForm.propertyType || null,
        maxPrice: prefsForm.maxPrice ? Number(prefsForm.maxPrice) : null,
        minBedrooms: prefsForm.minBedrooms ? Number(prefsForm.minBedrooms) : null,
        preferredLocation: prefsForm.preferredLocation || null,
      })
      setShowAiModal(false)
      showToast('AI Matching activated!', 'success')
      navigate('/properties?ai=match')
    } catch {
      showToast('Failed to save preferences', 'error')
    } finally {
      setPrefsLoading(false)
    }
  }

  return (
    <div>
      {/* Hero */}
      <section className="hero">
        <div className="hero-ai-badge">AI-Powered Property Platform</div>
        <h1>Find Your Perfect<br /><span>Home in Rwanda</span></h1>
        <p>Rwanda's smartest platform for renting and buying property — powered by AI matching, price estimation, and a 24/7 assistant</p>

        <div className="search-bar">
          <input type="text" placeholder="Search by location or property name…"
            value={search.query} onChange={e => setSearch(p => ({ ...p, query: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && heroSearch(search.query, search.listing, search.type, navigate)}
          />
          <div className="divider" />
          <select value={search.listing} onChange={e => setSearch(p => ({ ...p, listing: e.target.value }))}>
            <option value="">All Types</option>
            <option value="rent">For Rent</option>
            <option value="sale">For Sale</option>
          </select>
          <div className="divider" />
          <select value={search.type} onChange={e => setSearch(p => ({ ...p, type: e.target.value }))}>
            <option value="">Property Type</option>
            {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <button onClick={() => heroSearch(search.query, search.listing, search.type, navigate)}>Search</button>
        </div>

        <div className="hero-tags">
          {['Kigali', 'Musanze', 'Rubavu', 'Huye'].map(city => (
            <span key={city} onClick={() => navigate(`/properties?q=${city}`)}>{city}</span>
          ))}
        </div>
      </section>

      {/* Stats */}
      <div className="stats-bar">
        {[
          [totalListings > 0 ? `${totalListings}+` : '10+', 'Active Listings'],
          ['200+', 'Happy Tenants'],
          ['20+', 'Verified Agents'],
          ['5', 'Provinces Covered'],
        ].map(([num, lbl]) => (
          <div key={lbl} className="stat">
            <div className="num">{num}</div>
            <div className="lbl">{lbl}</div>
          </div>
        ))}
      </div>

      {/* AI Features */}
      <div className="ai-features-section">
        <div className="inner">
          <div className="ai-section-header">
            <span className="ai-label">AI-Powered</span>
            <h2>Smart Features That Set Us Apart</h2>
            <p>We use artificial intelligence to make your property search faster, smarter, and more personalised</p>
          </div>
          <div className="ai-features-grid">

            {/* Card 1 — Smart Matching */}
            <div className="ai-feature-card">
              <h3>Smart Property Matching</h3>
              <p>Our AI analyses your preferences — budget, location, type, bedrooms — and scores every listing to show you the best matches first.</p>
              <button className="ai-feature-link btn-link" onClick={handleOpenAiMatch}>
                Activate AI Matching →
              </button>
            </div>

            {/* Card 2 — Price Estimator */}
            <div className="ai-feature-card highlight">
              <div className="ai-badge-pill">Most Popular</div>
              <h3>AI Price Estimator</h3>
              <p>Wondering if a price is fair? Our AI compares similar properties in the same area and tells you the estimated market value instantly.</p>
              <button className="ai-feature-link btn-link" onClick={() => setShowEstimator(true)}>
                Try Price Estimator →
              </button>
            </div>

            {/* Card 3 — PropBot */}
            <div className="ai-feature-card">
              <h3>PropBot Assistant</h3>
              <p>Ask our AI chatbot anything — find properties, get neighbourhood info, check prices, or understand the rental process in Rwanda.</p>
              <button className="ai-feature-link btn-link" onClick={() => {
                // Trigger the PropBot to open — dispatch a custom event the widget listens to
                window.dispatchEvent(new CustomEvent('propbot:open'))
              }}>
                Chat with PropBot →
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Featured Rentals */}
      <div className="section">
        <div className="section-header">
          <h2>Featured Rentals</h2>
          <Link to="/properties?listing=rent">View all rentals →</Link>
        </div>
        {loading ? <div className="spinner" /> : (
          <div className="properties-grid">
            {featuredRentals.map(p => <PropertyCard key={p.id} property={p} />)}
          </div>
        )}
      </div>

      {/* Featured Sales */}
      <div className="section" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <h2>Properties For Sale</h2>
          <Link to="/properties?listing=sale">View all sales →</Link>
        </div>
        {loading ? <div className="spinner" /> : (
          <div className="properties-grid">
            {featuredSales.map(p => <PropertyCard key={p.id} property={p} />)}
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="how-it-works">
        <div className="inner">
          <h2>How It Works</h2>
          <div className="steps">
            {[
              ['01', 'AI Matches You', 'Set your preferences and our AI instantly scores and ranks properties that fit your needs.'],
              ['02', 'Browse & Compare', 'Browse listings with AI price estimates so you always know if you\'re getting a fair deal.'],
              ['03', 'Apply Online', 'Submit your rental application or purchase enquiry directly online in minutes.'],
              ['04', 'Move In / Close Deal', 'Get approved within 24 hours, sign your agreement, and get your keys!'],
            ].map(([num, title, desc]) => (
              <div key={title} className="step">
                <div className="step-icon">{num}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />

      {showEstimator && <EstimatorModal onClose={() => setShowEstimator(false)} />}

      {/* AI Matching Modal */}
      {showAiModal && (
        <div className="modal-overlay" onClick={() => setShowAiModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAiModal(false)}>✕</button>
            <h2>Set Your AI Preferences</h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--gray)', marginBottom: '1.2rem' }}>
              Tell us what you're looking for and our AI will score every listing for you.
            </p>
            <div className="form-group">
              <label>I'm looking to</label>
              <select value={prefsForm.listingType} onChange={e => setPrefsForm(p => ({ ...p, listingType: e.target.value }))}>
                <option value="">Rent or Buy</option>
                <option value="rent">Rent</option>
                <option value="sale">Buy</option>
              </select>
            </div>
            <div className="form-group">
              <label>Property Type</label>
              <select value={prefsForm.propertyType} onChange={e => setPrefsForm(p => ({ ...p, propertyType: e.target.value }))}>
                <option value="">Any Type</option>
                {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Max Budget (RWF)</label>
              <input type="number" placeholder="e.g. 500000" value={prefsForm.maxPrice}
                onChange={e => setPrefsForm(p => ({ ...p, maxPrice: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Min Bedrooms</label>
              <select value={prefsForm.minBedrooms} onChange={e => setPrefsForm(p => ({ ...p, minBedrooms: e.target.value }))}>
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
              </select>
            </div>
            <div className="form-group">
              <label>Preferred Location</label>
              <input type="text" placeholder="e.g. Kigali, Musanze" value={prefsForm.preferredLocation}
                onChange={e => setPrefsForm(p => ({ ...p, preferredLocation: e.target.value }))} />
            </div>
            <button className="btn btn-primary btn-block" onClick={handleSavePrefs} disabled={prefsLoading}>
              {prefsLoading ? 'Activating…' : 'Activate AI Matching'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
