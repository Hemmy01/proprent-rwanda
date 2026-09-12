import { useNavigate } from 'react-router-dom'
import { wishlistApi } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

function formatRWF(price) {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(price)
}

export default function PropertyCard({ property, matchScore, wishlisted, onWishlistToggle }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()

  const handleWishlist = async (e) => {
    e.stopPropagation()
    if (!user) { navigate('/login'); return }
    try {
      await wishlistApi.toggle(property.id)
      onWishlistToggle?.(property.id)
      showToast(wishlisted ? 'Removed from wishlist' : 'Saved to wishlist', wishlisted ? 'info' : 'success')
    } catch {
      showToast('Failed to update wishlist', 'error')
    }
  }

  return (
    <div className="property-card" onClick={() => navigate(`/properties/${property.id}`)}>
      <div className="property-card-img">
        <img
          src={property.primaryImage || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80'}
          alt={property.title}
          loading="lazy"
        />
        <span className={`prop-badge prop-badge-${property.listingType}`}>
          {property.listingType === 'rent' ? 'For Rent' : 'For Sale'}
        </span>
        {property.isFeatured && (
          <span className="prop-badge prop-badge-featured" style={{ left: 'auto', right: 50 }}>Featured</span>
        )}
        {matchScore != null && (
          <span className="prop-badge prop-badge-ai" style={{ left: 12, right: 'auto', top: 'auto', bottom: 12 }}>
            {matchScore}% Match
          </span>
        )}
        <button
          className={`wishlist-btn ${wishlisted ? 'active' : ''}`}
          onClick={handleWishlist}
          title={wishlisted ? 'Remove from wishlist' : 'Save property'}
          style={{ top: 'auto', bottom: 12, right: 12 }}
        >
          {wishlisted ? 'Saved' : 'Save'}
        </button>
      </div>
      <div className="property-card-body">
        <div className="property-card-price">
          {formatRWF(property.price)}
          {property.listingType === 'rent' && <span>/month</span>}
        </div>
        <div className="property-card-title">{property.title}</div>
        <div className="property-card-location">{property.location}</div>
        <div className="property-card-features">
          {property.bedrooms > 0 && <span>{property.bedrooms} Bed{property.bedrooms > 1 ? 's' : ''}</span>}
          <span>{property.bathrooms} Bath</span>
          <span>{property.sizeM2}m²</span>
        </div>
      </div>
    </div>
  )
}
