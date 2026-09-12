import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { propertyApi, wishlistApi, userApi } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import PropertyCard from '../components/common/PropertyCard'
import Footer from '../components/common/Footer'

const PROPERTY_TYPES = ['Apartment', 'House', 'Studio', 'Townhouse', 'Commercial']

function getMatchScore(property, prefs) {
  if (!prefs) return null
  let score = 0
  if (!prefs.listingType || property.listingType === prefs.listingType) score += 30
  if (!prefs.propertyType || property.propertyType === prefs.propertyType) score += 20
  if (prefs.maxPrice) {
    if (property.price <= prefs.maxPrice) score += 25
    else if (property.price <= prefs.maxPrice * 1.2) score += 12
  } else score += 25
  if (!prefs.minBedrooms || property.bedrooms >= prefs.minBedrooms) score += 15
  if (!prefs.preferredLocation || property.location.toLowerCase().includes(prefs.preferredLocation.toLowerCase())) score += 10
  return score
}

const MODE_CONFIG = {
  rent: {
    label: 'Properties For Rent',
    desc: 'Find your next home — browse monthly rental listings across Rwanda',
    heroClass: 'properties-hero properties-hero--rent',
    accentClass: 'accent-rent',
    emptyMsg: 'No rental properties found. Try adjusting your filters.',
  },
  sale: {
    label: 'Properties For Sale',
    desc: 'Invest in Rwanda — browse properties available for purchase',
    heroClass: 'properties-hero properties-hero--sale',
    accentClass: 'accent-sale',
    emptyMsg: 'No properties for sale found. Try adjusting your filters.',
  },
  '': {
    label: 'All Listings',
    desc: 'Browse all available rentals and properties for sale across Rwanda',
    heroClass: 'properties-hero properties-hero--all',
    accentClass: 'accent-all',
    emptyMsg: 'No properties found. Try adjusting your filters.',
  },
}

export default function Properties() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const urlListing = searchParams.get('listing') || ''
  const mode = MODE_CONFIG[urlListing] ?? MODE_CONFIG['']

  const [filters, setFilters] = useState({
    query: searchParams.get('q') || '',
    listingType: urlListing,
    propertyType: searchParams.get('type') || '',
    minPrice: '',
    maxPrice: '',
    minBedrooms: '',
    availableOnly: true,
  })

  const [properties, setProperties] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [wishlistIds, setWishlistIds] = useState([])
  const [aiPrefs, setAiPrefs] = useState(null)
  const [aiActive, setAiActive] = useState(false)
  const [showPrefsModal, setShowPrefsModal] = useState(false)
  const [prefsForm, setPrefsForm] = useState({ listingType: '', propertyType: '', maxPrice: '', minBedrooms: '', preferredLocation: '' })

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      listingType: urlListing,
      query: searchParams.get('q') || '',
      propertyType: searchParams.get('type') || '',
    }))
  }, [urlListing, searchParams.get('q'), searchParams.get('type')])

  useEffect(() => {
    if (user) {
      wishlistApi.getMine().then(res => setWishlistIds(res.data.map(p => p.id))).catch(() => {})
      userApi.getPreferences().then(res => {
        if (res.data) {
          setAiPrefs(res.data)
          setPrefsForm({
            listingType: res.data.listingType || '',
            propertyType: res.data.propertyType || '',
            maxPrice: res.data.maxPrice || '',
            minBedrooms: res.data.minBedrooms || '',
            preferredLocation: res.data.preferredLocation || '',
          })
          if (searchParams.get('ai') === 'match') setAiActive(true)
        }
      }).catch(() => {})
    }
  }, [user])

  const fetchProperties = async (currentFilters, currentPage = 1) => {
    setLoading(true)
    try {
      const params = {
        query: currentFilters.query || undefined,
        listingType: currentFilters.listingType || undefined,
        propertyType: currentFilters.propertyType || undefined,
        minPrice: currentFilters.minPrice || undefined,
        maxPrice: currentFilters.maxPrice || undefined,
        minBedrooms: currentFilters.minBedrooms || undefined,
        availableOnly: currentFilters.availableOnly,
        page: currentPage,
        pageSize: 12,
      }
      const res = await propertyApi.getAll(params)
      let items = res.data.items

      if (currentFilters._aiActive && aiPrefs) {
        items = items
          .map(p => ({ ...p, _score: getMatchScore(p, aiPrefs) }))
          .sort((a, b) => b._score - a._score)
      }

      setProperties(items)
      setTotalCount(res.data.totalCount)
      setTotalPages(res.data.totalPages)
      setPage(currentPage)
    } catch {
      showToast('Failed to load properties', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProperties({ ...filters, _aiActive: aiActive }, 1)
  }, [filters.listingType, filters.query, filters.propertyType, aiActive])

  const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }))

  const applyFilters = () => fetchProperties({ ...filters, _aiActive: aiActive }, 1)

  const handleReset = () => {
    const reset = { query: '', listingType: urlListing, propertyType: '', minPrice: '', maxPrice: '', minBedrooms: '', availableOnly: true, _aiActive: false }
    setFilters(reset)
    const newParams = {}
    if (urlListing) newParams.listing = urlListing
    setSearchParams(newParams)
    fetchProperties(reset, 1)
  }

  const handleWishlistToggle = (propertyId) => {
    setWishlistIds(prev =>
      prev.includes(propertyId) ? prev.filter(id => id !== propertyId) : [...prev, propertyId]
    )
  }

  const handleSavePrefs = async () => {
    if (!user) { navigate('/login'); return }
    try {
      const prefs = {
        listingType: prefsForm.listingType || null,
        propertyType: prefsForm.propertyType || null,
        maxPrice: prefsForm.maxPrice ? Number(prefsForm.maxPrice) : null,
        minBedrooms: prefsForm.minBedrooms ? Number(prefsForm.minBedrooms) : null,
        preferredLocation: prefsForm.preferredLocation || null,
      }
      await userApi.upsertPreferences(prefs)
      setAiPrefs(prefs)
      setAiActive(true)
      setShowPrefsModal(false)
      showToast('AI Matching activated!', 'success')
    } catch {
      showToast('Failed to save preferences', 'error')
    }
  }

  return (
    <div>
      <div className={mode.heroClass}>
        <div className="properties-hero-inner">
          <h1>{mode.label}</h1>
          <p>{mode.desc}</p>
          <div className="hero-search-bar">
            <input
              type="text"
              placeholder="Search by location or property name…"
              value={filters.query}
              onChange={e => handleFilterChange('query', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
            />
            <button onClick={applyFilters}>Search</button>
          </div>
          <div className="listing-tabs">
            <Link to="/properties" className={`listing-tab ${urlListing === '' ? 'active' : ''}`}>All</Link>
            <Link to="/properties?listing=rent" className={`listing-tab listing-tab--rent ${urlListing === 'rent' ? 'active' : ''}`}>Rent</Link>
            <Link to="/properties?listing=sale" className={`listing-tab listing-tab--sale ${urlListing === 'sale' ? 'active' : ''}`}>Buy</Link>
          </div>
        </div>
      </div>

      <div className="properties-layout">
        <aside className="sidebar-filters">
          <h3>Filters</h3>

          <div className="filter-section">
            <h4>Search</h4>
            <input
              type="text" placeholder="Location or name…"
              value={filters.query}
              onChange={e => handleFilterChange('query', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
              className="filter-input"
            />
          </div>

          {urlListing === '' && (
            <div className="filter-section">
              <h4>Listing Type</h4>
              {[['', 'All'], ['rent', 'For Rent'], ['sale', 'For Sale']].map(([val, lbl]) => (
                <label key={val} className="filter-radio">
                  <input type="radio" name="listing" checked={filters.listingType === val}
                    onChange={() => handleFilterChange('listingType', val)} />
                  {lbl}
                </label>
              ))}
            </div>
          )}

          <div className="filter-section">
            <h4>Property Type</h4>
            {PROPERTY_TYPES.map(t => (
              <label key={t} className="filter-radio">
                <input type="checkbox" checked={filters.propertyType === t}
                  onChange={() => handleFilterChange('propertyType', filters.propertyType === t ? '' : t)} />
                {t}
              </label>
            ))}
          </div>

          <div className="filter-section">
            <h4>Price Range (RWF){urlListing === 'rent' ? ' /month' : ''}</h4>
            <div className="price-range">
              <input type="number" placeholder="Min" value={filters.minPrice}
                onChange={e => handleFilterChange('minPrice', e.target.value)} />
              <span>–</span>
              <input type="number" placeholder="Max" value={filters.maxPrice}
                onChange={e => handleFilterChange('maxPrice', e.target.value)} />
            </div>
          </div>

          <div className="filter-section">
            <h4>Bedrooms (min)</h4>
            {[['', 'Any'], ['1', '1+'], ['2', '2+'], ['3', '3+'], ['4', '4+']].map(([val, lbl]) => (
              <label key={val} className="filter-radio">
                <input type="radio" name="beds" checked={filters.minBedrooms === val}
                  onChange={() => handleFilterChange('minBedrooms', val)} />
                {lbl}
              </label>
            ))}
          </div>

          <div className="filter-section">
            <h4>Availability</h4>
            <label className="filter-radio">
              <input type="checkbox" checked={filters.availableOnly}
                onChange={e => handleFilterChange('availableOnly', e.target.checked)} />
              Available only
            </label>
          </div>

          <button className={`btn btn-block btn-filter-apply ${mode.accentClass}`} onClick={applyFilters}>Apply Filters</button>
          <button className="btn btn-block btn-filter-reset" onClick={handleReset}>Reset</button>
        </aside>

        <div>
          {/* AI Match Banner */}
          <div className={`ai-match-banner ${aiActive ? 'ai-active' : ''}`}>
            <div style={{ flex: 1 }}>
              <strong>AI Smart Matching</strong>
              <p style={{ fontSize: '0.82rem', opacity: 0.85, margin: 0 }}>
                {aiActive ? 'AI Matching is ON — properties ranked by match score.' : 'Set your preferences and let AI rank properties for you.'}
              </p>
            </div>
            <button className="btn-ai-toggle" onClick={() => {
              if (aiActive) { setAiActive(false) }
              else { if (!user) { navigate('/login'); return } setShowPrefsModal(true) }
            }}>
              {aiActive ? 'Edit Preferences' : 'Enable AI Match'}
            </button>
          </div>

          <div className="sort-bar">
            <span className="results-count">
              <span className={`results-mode-tag ${mode.accentClass}`}>
                {urlListing === 'rent' ? 'Rentals' : urlListing === 'sale' ? 'For Sale' : 'All Listings'}
              </span>
              {totalCount} propert{totalCount !== 1 ? 'ies' : 'y'} found
            </span>
          </div>

          {loading ? (
            <div className="spinner" />
          ) : properties.length === 0 ? (
            <div className="empty-state">
              <h3>No properties found</h3>
              <p>{mode.emptyMsg}</p>
            </div>
          ) : (
            <div className="properties-grid">
              {properties.map(p => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  matchScore={aiActive && aiPrefs ? p._score ?? getMatchScore(p, aiPrefs) : null}
                  wishlisted={wishlistIds.includes(p.id)}
                  onWishlistToggle={handleWishlistToggle}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => fetchProperties({ ...filters, _aiActive: aiActive }, page - 1)}>← Prev</button>
              <span>Page {page} of {totalPages}</span>
              <button className="btn btn-outline btn-sm" disabled={page === totalPages} onClick={() => fetchProperties({ ...filters, _aiActive: aiActive }, page + 1)}>Next →</button>
            </div>
          )}
        </div>
      </div>

      {showPrefsModal && (
        <div className="modal-overlay" onClick={() => setShowPrefsModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPrefsModal(false)}>✕</button>
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
            <button className="btn btn-primary btn-block" onClick={handleSavePrefs}>Apply AI Matching</button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
