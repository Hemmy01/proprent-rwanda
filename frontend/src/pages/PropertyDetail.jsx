import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { propertyApi, applicationApi, wishlistApi } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import PropertyCard from '../components/common/PropertyCard'
import { PropertyMap } from '../components/common/LocationMap'

function formatRWF(price) {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(price)
}

export default function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()

  const [property, setProperty] = useState(null)
  const [similar, setSimilar] = useState([])
  const [loading, setLoading] = useState(true)
  const [mainImage, setMainImage] = useState('')
  const [wishlisted, setWishlisted] = useState(false)
  const [wishlistIds, setWishlistIds] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [appForm, setAppForm] = useState({ message: '', viewingDate: '' })
  const [appLoading, setAppLoading] = useState(false)
  const [estimatorResult, setEstimatorResult] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      propertyApi.getById(id),
      propertyApi.getSimilar(id),
    ]).then(([propRes, simRes]) => {
      setProperty(propRes.data)
      setMainImage(propRes.data.primaryImage || propRes.data.images?.[0] || '')
      setSimilar(simRes.data)
    }).catch(() => {
      showToast('Property not found', 'error')
      navigate('/properties')
    }).finally(() => setLoading(false))

    if (user) {
      wishlistApi.checkStatus(id).then(res => setWishlisted(res.data.inWishlist)).catch(() => {})
      wishlistApi.getMine().then(res => setWishlistIds(res.data.map(p => p.id))).catch(() => {})
    }
  }, [id, user, navigate, showToast])

  const handleWishlist = async () => {
    if (!user) { navigate('/login'); return }
    try {
      await wishlistApi.toggle(property.id)
      setWishlisted(prev => !prev)
      showToast(wishlisted ? 'Removed from wishlist' : 'Saved to wishlist', wishlisted ? 'info' : 'success')
    } catch {
      showToast('Failed to update wishlist', 'error')
    }
  }

  const handleApply = async (e) => {
    e.preventDefault()
    if (!user) { navigate('/login'); return }
    setAppLoading(true)
    try {
      await applicationApi.create({
        propertyId: property.id,
        message: appForm.message,
        viewingDate: appForm.viewingDate || null,
      })
      showToast('Application submitted successfully!', 'success')
      setShowModal(false)
      setAppForm({ message: '', viewingDate: '' })
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit application', 'error')
    } finally {
      setAppLoading(false)
    }
  }

  const runEstimator = async () => {
    if (!property) return
    setEstimatorResult({ loading: true })
    try {
      const { estimatePrice } = await import('../api/aiService')
      const result = await estimatePrice({
        price: property.price,
        sizeM2: property.sizeM2,
        propertyType: property.propertyType,
        listingType: property.listingType,
        location: property.location,
        comparables: similar.filter(p =>
          p.listingType === property.listingType &&
          p.propertyType === property.propertyType
        )
      })
      setEstimatorResult(result)
    } catch {
      setEstimatorResult(null)
    }
  }

  if (loading) return <div className="spinner" style={{ marginTop: '4rem' }} />
  if (!property) return null

  const images = property.images?.length > 0 ? property.images : [property.primaryImage].filter(Boolean)

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/">Home</Link> › <Link to="/properties">Properties</Link> › <span>{property.title}</span>
      </div>

      <div className="detail-layout">
        <div>
          <div className="detail-gallery">
            <img className="main-img" src={mainImage} alt={property.title} />
            {images.length > 1 && (
              <div className="thumb-row">
                {images.map((img, i) => (
                  <img key={i} src={img} alt={`View ${i + 1}`}
                    className={mainImage === img ? 'active' : ''}
                    onClick={() => setMainImage(img)} />
                ))}
              </div>
            )}
          </div>

          <div className="detail-info">
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
              <span className={`prop-badge prop-badge-${property.listingType}`} style={{ position: 'static' }}>
                {property.listingType === 'rent' ? 'For Rent' : 'For Sale'}
              </span>
              {property.isFeatured && <span className="prop-badge prop-badge-featured" style={{ position: 'static' }}>Featured</span>}
              <span className={`prop-status ${property.isAvailable ? 'status-available' : 'status-taken'}`} style={{ position: 'static' }}>
                {property.isAvailable ? 'Available' : 'Not Available'}
              </span>
            </div>

            <h1 style={{ fontSize: '1.7rem', fontWeight: 800, marginBottom: '0.4rem' }}>{property.title}</h1>
            <div className="detail-price">
              {formatRWF(property.price)}{property.listingType === 'rent' && <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--gray)' }}>/month</span>}
            </div>
            <div className="detail-location">{property.location}</div>

            <div className="detail-features">
              {property.bedrooms > 0 && <div className="feat"><strong>{property.bedrooms}</strong> Bedroom{property.bedrooms > 1 ? 's' : ''}</div>}
              <div className="feat"><strong>{property.bathrooms}</strong> Bathroom{property.bathrooms > 1 ? 's' : ''}</div>
              <div className="feat"><strong>{property.parking}</strong> Parking</div>
              <div className="feat"><strong>{property.sizeM2}m²</strong></div>
              <div className="feat"><strong>{property.propertyType}</strong></div>
            </div>

            <p className="detail-desc">{property.description}</p>

            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.8rem' }}>Amenities & Features</h3>
            <div className="amenities">
              {property.amenities?.map(a => <span key={a} className="amenity-tag">{a}</span>)}
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={() => {
                if (!user) { navigate('/login'); return }
                setShowModal(true)
              }} disabled={!property.isAvailable}>
                {property.listingType === 'rent' ? 'Apply to Rent' : 'Enquire to Buy'}
              </button>
              <button className={`btn btn-outline ${wishlisted ? 'wishlisted' : ''}`} onClick={handleWishlist}>
                {wishlisted ? 'Saved' : 'Save Property'}
              </button>
              {property.agent?.phone ? (
                <a href={`tel:${property.agent.phone}`} className="btn btn-success">Call {property.agent.fullName.split(' ')[0]}</a>
              ) : (
                <a href="tel:+250788000123" className="btn btn-success">Call Agent</a>
              )}
            </div>

            <PropertyMap location={property.location} />
          </div>
        </div>

        <div>
          <div className="enquiry-card">
            <h3>Contact Agent</h3>
            {property.agent && (
              <div className="agent-info-row">
                <img className="agent-avatar" src={property.agent.avatarUrl || 'https://i.pravatar.cc/48'} alt={property.agent.fullName} />
                <div>
                  <div className="agent-name">{property.agent.fullName}</div>
                  <div className="agent-role">{property.agent.role}</div>
                </div>
              </div>
            )}
            <button className="btn btn-primary btn-block" onClick={() => {
              if (!user) { navigate('/login'); return }
              setShowModal(true)
            }} disabled={!property.isAvailable}>
              {property.listingType === 'rent' ? 'Apply to Rent' : 'Enquire to Buy'}
            </button>
            {property.agent?.phone ? (
              <a href={`tel:${property.agent.phone}`} className="btn btn-block" style={{ marginTop: '0.6rem', background: 'transparent', border: '2px solid var(--primary)', color: 'var(--primary)', textAlign: 'center' }}>
                Call {property.agent.fullName.split(' ')[0]}
              </a>
            ) : (
              <a href="tel:+250788000123" className="btn btn-block" style={{ marginTop: '0.6rem', background: 'transparent', border: '2px solid var(--primary)', color: 'var(--primary)', textAlign: 'center' }}>
                Call Agent
              </a>
            )}
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontSize: '0.82rem', color: 'var(--gray)' }}>
              <div>Ref: PROP-RW-00{property.id}</div>
              <div style={{ marginTop: '0.3rem' }}>Listed: {new Date(property.createdAt).toLocaleDateString()}</div>
            </div>
          </div>

          <div className="ai-estimator-card">
            <h4>AI Price Estimator</h4>
            <p>Is this price fair? Our AI compares similar properties to give you an instant market estimate.</p>
            <button className="btn-estimate" onClick={runEstimator} disabled={estimatorResult?.loading}>
              {estimatorResult?.loading ? 'Analysing…' : 'Estimate Fair Price'}
            </button>
            {estimatorResult && !estimatorResult.loading && (
              <div className="estimator-result">
                <div className="est-label">AI Estimated Market Price</div>
                <div className="est-price">
                  {formatRWF(estimatorResult.estimated)}{property.listingType === 'rent' ? '/mo' : ''}
                </div>
                <div className="est-label" style={{ marginTop: '0.3rem' }}>
                  Listed at: {formatRWF(property.price)}{property.listingType === 'rent' ? '/mo' : ''}
                </div>
                <span className={`est-verdict ${estimatorResult.verdictClass}`}>{estimatorResult.verdict}</span>
                {estimatorResult.explanation && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--gray)', marginTop: '0.5rem', lineHeight: 1.5 }}>
                    {estimatorResult.explanation}
                  </p>
                )}
                <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: '0.3rem' }}>
                  Confidence: {estimatorResult.confidence === 'high' ? '🟢 High' : '🟡 Medium'}
                </div>
              </div>
            )}
          </div>

          <div className="agent-card">
            <h4>Property Summary</h4>
            <table style={{ width: '100%', fontSize: '0.88rem' }}>
              <tbody>
                <tr><td style={{ color: 'var(--gray)', padding: '0.3rem 0' }}>Type</td><td style={{ fontWeight: 600 }}>{property.propertyType}</td></tr>
                <tr><td style={{ color: 'var(--gray)', padding: '0.3rem 0' }}>Listing</td><td style={{ fontWeight: 600 }}>{property.listingType === 'rent' ? 'For Rent' : 'For Sale'}</td></tr>
                <tr><td style={{ color: 'var(--gray)', padding: '0.3rem 0' }}>Size</td><td style={{ fontWeight: 600 }}>{property.sizeM2}m²</td></tr>
                {property.bedrooms > 0 && <tr><td style={{ color: 'var(--gray)', padding: '0.3rem 0' }}>Bedrooms</td><td style={{ fontWeight: 600 }}>{property.bedrooms}</td></tr>}
                <tr><td style={{ color: 'var(--gray)', padding: '0.3rem 0' }}>Bathrooms</td><td style={{ fontWeight: 600 }}>{property.bathrooms}</td></tr>
                <tr><td style={{ color: 'var(--gray)', padding: '0.3rem 0' }}>Parking</td><td style={{ fontWeight: 600 }}>{property.parking}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <div className="similar-section">
          <h2>Similar Properties</h2>
          <div className="properties-grid">
            {similar.map(p => (
              <PropertyCard key={p.id} property={p}
                wishlisted={wishlistIds.includes(p.id)}
                onWishlistToggle={id => setWishlistIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
              />
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            <h2>{property.listingType === 'rent' ? 'Apply to Rent' : 'Enquire to Buy'}</h2>
            <form onSubmit={handleApply}>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={user?.fullName || ''} disabled style={{ opacity: 0.7 }} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={user?.email || ''} disabled style={{ opacity: 0.7 }} />
              </div>
              <div className="form-group">
                <label>Preferred Viewing Date</label>
                <input type="date" value={appForm.viewingDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setAppForm(p => ({ ...p, viewingDate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea placeholder="Tell the agent about yourself and why you're interested…"
                  value={appForm.message} required
                  onChange={e => setAppForm(p => ({ ...p, message: e.target.value }))} />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={appLoading}>
                {appLoading ? 'Submitting…' : 'Submit Application'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
