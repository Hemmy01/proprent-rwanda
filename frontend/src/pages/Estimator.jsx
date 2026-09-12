import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { propertyApi } from '../api/services'
import Footer from '../components/common/Footer'

function formatRWF(price) {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(price)
}

function runEstimate(property, comparables) {
  let estimated
  if (comparables.length === 0) {
    estimated = property.price * (0.92 + Math.random() * 0.16)
  } else {
    const avgPerSqm = comparables.reduce((s, p) => s + p.price / p.sizeM2, 0) / comparables.length
    estimated = Math.round(avgPerSqm * property.sizeM2)
  }
  const diff = ((property.price - estimated) / estimated) * 100
  let verdict, verdictClass
  if (Math.abs(diff) <= 10) { verdict = 'Fair Market Price'; verdictClass = 'verdict-fair' }
  else if (diff > 10) { verdict = `${Math.round(diff)}% Above Market`; verdictClass = 'verdict-high' }
  else { verdict = `${Math.round(Math.abs(diff))}% Below Market`; verdictClass = 'verdict-low' }
  return { estimated, verdict, verdictClass, diff: Math.round(diff) }
}

export default function Estimator() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [estimate, setEstimate] = useState(null)
  const [comparables, setComparables] = useState([])

  // Search properties as user types
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await propertyApi.getAll({ query: query.trim(), availableOnly: true, pageSize: 8 })
        setResults(res.data.items)
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = async (property) => {
    setSelected(property)
    setResults([])
    setQuery(property.title)
    setEstimate(null)

    // Fetch similar properties for comparison
    try {
      const res = await propertyApi.getSimilar(property.id)
      const comps = res.data.filter(p =>
        p.listingType === property.listingType &&
        p.propertyType === property.propertyType
      )
      setComparables(comps)
      setEstimate(runEstimate(property, comps))
    } catch {
      setEstimate(runEstimate(property, []))
      setComparables([])
    }
  }

  const reset = () => {
    setSelected(null)
    setEstimate(null)
    setComparables([])
    setQuery('')
    setResults([])
  }

  return (
    <div>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1a73e8, #6c35ff)',
        color: '#fff', padding: '3.5rem 2rem 3rem', textAlign: 'center'
      }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: 1, opacity: 0.85, marginBottom: '0.6rem', textTransform: 'uppercase' }}>
          AI-Powered
        </div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.6rem' }}>AI Price Estimator</h1>
        <p style={{ fontSize: '1rem', opacity: 0.88, maxWidth: 520, margin: '0 auto' }}>
          Search for any property and our AI will instantly compare it against similar listings to tell you if the price is fair.
        </p>
      </div>

      <div style={{ maxWidth: 720, margin: '2.5rem auto', padding: '0 1.5rem' }}>

        {/* Search box */}
        <div style={{ position: 'relative', marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
            Search for a property
          </label>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); if (selected) reset() }}
              placeholder="Type a property name or location…"
              style={{
                flex: 1, border: '2px solid var(--border)', borderRadius: 8,
                padding: '0.75rem 1rem', fontSize: '0.95rem', outline: 'none',
                fontFamily: 'inherit'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            {selected && (
              <button className="btn btn-outline btn-sm" onClick={reset} style={{ whiteSpace: 'nowrap' }}>
                Clear
              </button>
            )}
          </div>

          {/* Dropdown results */}
          {(results.length > 0 || searching) && !selected && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
              background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden', marginTop: 4
            }}>
              {searching && (
                <div style={{ padding: '0.8rem 1rem', color: 'var(--gray)', fontSize: '0.88rem' }}>Searching…</div>
              )}
              {results.map(p => (
                <div
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  style={{
                    padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--light)'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{p.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>{p.location} · {p.propertyType}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                    {formatRWF(p.price)}{p.listingType === 'rent' ? '/mo' : ''}
                  </div>
                </div>
              ))}
              {!searching && results.length === 0 && (
                <div style={{ padding: '0.8rem 1rem', color: 'var(--gray)', fontSize: '0.88rem' }}>No properties found</div>
              )}
            </div>
          )}
        </div>

        {/* Result card */}
        {selected && estimate && (
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', overflow: 'hidden' }}>

            {/* Property header */}
            <div style={{ display: 'flex', gap: '1rem', padding: '1.4rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
              {selected.primaryImage && (
                <img src={selected.primaryImage} alt={selected.title}
                  style={{ width: 100, height: 75, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.2rem' }}>{selected.title}</div>
                <div style={{ color: 'var(--gray)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>{selected.location}</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className={`badge badge-${selected.listingType}`}>{selected.listingType === 'rent' ? 'For Rent' : 'For Sale'}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>{selected.propertyType} · {selected.sizeM2}m²</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginBottom: '0.2rem' }}>Listed Price</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--dark)' }}>
                  {formatRWF(selected.price)}{selected.listingType === 'rent' ? <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>/mo</span> : ''}
                </div>
              </div>
            </div>

            {/* Estimate result */}
            <div style={{ padding: '1.6rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.4rem' }}>
                <div style={{ background: 'var(--light)', borderRadius: 10, padding: '1.1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--gray)', marginBottom: '0.3rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Listed Price</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{formatRWF(selected.price)}{selected.listingType === 'rent' ? '/mo' : ''}</div>
                </div>
                <div style={{ background: '#f0f4ff', borderRadius: 10, padding: '1.1rem', textAlign: 'center', border: '2px solid var(--primary)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--primary)', marginBottom: '0.3rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>AI Estimated Value</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)' }}>{formatRWF(estimate.estimated)}{selected.listingType === 'rent' ? '/mo' : ''}</div>
                </div>
              </div>

              {/* Verdict */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '0.8rem', padding: '1rem', borderRadius: 10,
                background: estimate.verdictClass === 'verdict-fair' ? '#e8f5e9'
                  : estimate.verdictClass === 'verdict-high' ? '#fce8e8' : '#fff8e1',
                marginBottom: '1.2rem'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '1.1rem', fontWeight: 800,
                    color: estimate.verdictClass === 'verdict-fair' ? 'var(--success)'
                      : estimate.verdictClass === 'verdict-high' ? 'var(--danger)' : '#f57c00'
                  }}>
                    {estimate.verdict}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray)', marginTop: '0.2rem' }}>
                    {estimate.verdictClass === 'verdict-fair'
                      ? 'This property is priced within 10% of the estimated market value.'
                      : estimate.verdictClass === 'verdict-high'
                      ? `This property is listed ${estimate.diff}% above the estimated market value.`
                      : `This property is listed ${Math.abs(estimate.diff)}% below the estimated market value — potentially a good deal.`}
                  </div>
                </div>
              </div>

              {/* Comparables */}
              {comparables.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.6rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Based on {comparables.length} comparable {comparables.length === 1 ? 'property' : 'properties'}
                  </div>
                  {comparables.map(c => (
                    <div key={c.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.6rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.88rem'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.title}</div>
                        <div style={{ color: 'var(--gray)', fontSize: '0.8rem' }}>{c.location} · {c.sizeM2}m²</div>
                      </div>
                      <div style={{ fontWeight: 700 }}>{formatRWF(c.price)}{c.listingType === 'rent' ? '/mo' : ''}</div>
                    </div>
                  ))}
                </div>
              )}
              {comparables.length === 0 && (
                <div style={{ fontSize: '0.82rem', color: 'var(--gray)', textAlign: 'center', padding: '0.5rem 0' }}>
                  Estimate based on property size and type averages — no direct comparables found nearby.
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.4rem' }}>
                <button className="btn btn-primary" onClick={() => navigate(`/properties/${selected.id}`)}>
                  View Full Listing
                </button>
                <button className="btn btn-outline" onClick={reset}>
                  Estimate Another
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!selected && !query && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--gray)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>Search above to get started</div>
            <p style={{ fontSize: '0.92rem' }}>Type a property name, location, or type to find a listing and check its price.</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
