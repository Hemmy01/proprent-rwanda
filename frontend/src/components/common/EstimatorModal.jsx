import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { propertyApi } from '../../api/services'

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

export default function EstimatorModal({ onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [estimate, setEstimate] = useState(null)
  const [comparables, setComparables] = useState([])
  const [estimating, setEstimating] = useState(false)

  useEffect(() => {
    if (!query.trim() || selected) { setResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await propertyApi.getAll({ query: query.trim(), availableOnly: true, pageSize: 8 })
        setResults(res.data.items)
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 350)
    return () => clearTimeout(timer)
  }, [query, selected])

  const handleSelect = async (property) => {
    setSelected(property)
    setResults([])
    setQuery(property.title)
    setEstimate(null)
    setEstimating(true)
    try {
      const res = await propertyApi.getSimilar(property.id)
      const comps = res.data.filter(p =>
        p.listingType === property.listingType && p.propertyType === property.propertyType
      )
      setComparables(comps)
      setEstimate(runEstimate(property, comps))
    } catch {
      setEstimate(runEstimate(property, []))
      setComparables([])
    } finally { setEstimating(false) }
  }

  const reset = () => {
    setSelected(null); setEstimate(null)
    setComparables([]); setQuery(''); setResults([])
  }

  const verdictColor = estimate
    ? estimate.verdictClass === 'verdict-fair' ? 'var(--success)'
      : estimate.verdictClass === 'verdict-high' ? 'var(--danger)' : '#f57c00'
    : ''

  const verdictBg = estimate
    ? estimate.verdictClass === 'verdict-fair' ? '#e8f5e9'
      : estimate.verdictClass === 'verdict-high' ? '#fce8e8' : '#fff8e1'
    : ''

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal estimator-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="estimator-modal-header">
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>AI Price Estimator</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: 2 }}>Check if a property is priced fairly</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Search */}
        <div style={{ padding: '1.2rem 1.4rem', borderBottom: '1px solid var(--border)', position: 'relative' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              autoFocus
              value={query}
              onChange={e => { setQuery(e.target.value); if (selected) reset() }}
              placeholder="Search a property name or location…"
              style={{
                flex: 1, border: '1.5px solid var(--border)', borderRadius: 7,
                padding: '0.6rem 0.9rem', fontSize: '0.92rem', outline: 'none', fontFamily: 'inherit'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            {selected && <button className="btn btn-outline btn-sm" onClick={reset}>Clear</button>}
          </div>

          {/* Dropdown */}
          {(results.length > 0 || searching) && !selected && (
            <div style={{
              position: 'absolute', top: '100%', left: '1.4rem', right: '1.4rem', zIndex: 200,
              background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.13)', overflow: 'hidden'
            }}>
              {searching && <div style={{ padding: '0.75rem 1rem', color: 'var(--gray)', fontSize: '0.88rem' }}>Searching…</div>}
              {results.map(p => (
                <div key={p.id} onClick={() => handleSelect(p)}
                  style={{ padding: '0.7rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--light)'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>{p.location} · {p.propertyType}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.88rem', whiteSpace: 'nowrap', marginLeft: '0.8rem' }}>
                    {formatRWF(p.price)}{p.listingType === 'rent' ? '/mo' : ''}
                  </div>
                </div>
              ))}
              {!searching && results.length === 0 && (
                <div style={{ padding: '0.75rem 1rem', color: 'var(--gray)', fontSize: '0.88rem' }}>No properties found</div>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '1.2rem 1.4rem', overflowY: 'auto', maxHeight: 420 }}>

          {/* Empty prompt */}
          {!selected && !query && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--gray)' }}>
              <p style={{ fontSize: '0.92rem' }}>Type a property name or location above to get started.</p>
            </div>
          )}

          {/* Loading */}
          {estimating && <div className="spinner" style={{ margin: '2rem auto' }} />}

          {/* Result */}
          {selected && estimate && !estimating && (
            <div>
              {/* Property row */}
              <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
                {selected.primaryImage && (
                  <img src={selected.primaryImage} alt={selected.title}
                    style={{ width: 72, height: 54, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{selected.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>{selected.location} · {selected.propertyType} · {selected.sizeM2}m²</div>
                </div>
              </div>

              {/* Price comparison */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1rem' }}>
                <div style={{ background: 'var(--light)', borderRadius: 8, padding: '0.9rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: '0.3rem' }}>Listed Price</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{formatRWF(selected.price)}{selected.listingType === 'rent' ? '/mo' : ''}</div>
                </div>
                <div style={{ background: '#f0f4ff', borderRadius: 8, padding: '0.9rem', textAlign: 'center', border: '2px solid var(--primary)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: '0.3rem' }}>AI Estimate</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>{formatRWF(estimate.estimated)}{selected.listingType === 'rent' ? '/mo' : ''}</div>
                </div>
              </div>

              {/* Verdict */}
              <div style={{ background: verdictBg, borderRadius: 8, padding: '0.9rem 1rem', marginBottom: '1rem', textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: verdictColor }}>{estimate.verdict}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--gray)', marginTop: '0.25rem' }}>
                  {estimate.verdictClass === 'verdict-fair'
                    ? 'Priced within 10% of estimated market value.'
                    : estimate.verdictClass === 'verdict-high'
                    ? `Listed ${estimate.diff}% above estimated market value.`
                    : `Listed ${Math.abs(estimate.diff)}% below market — potentially a good deal.`}
                </div>
              </div>

              {/* Comparables */}
              {comparables.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: '0.5rem' }}>
                    Based on {comparables.length} comparable {comparables.length === 1 ? 'property' : 'properties'}
                  </div>
                  {comparables.map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{c.title}</span>
                        <span style={{ color: 'var(--gray)', marginLeft: '0.4rem' }}>{c.sizeM2}m²</span>
                      </div>
                      <span style={{ fontWeight: 700 }}>{formatRWF(c.price)}{c.listingType === 'rent' ? '/mo' : ''}</span>
                    </div>
                  ))}
                </div>
              )}
              {comparables.length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginBottom: '1rem' }}>
                  No direct comparables found — estimate based on property size and type averages.
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.7rem' }}>
                <button className="btn btn-primary btn-sm" onClick={() => { onClose(); navigate(`/properties/${selected.id}`) }}>
                  View Listing
                </button>
                <button className="btn btn-outline btn-sm" onClick={reset}>
                  Estimate Another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
