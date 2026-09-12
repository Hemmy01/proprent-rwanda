import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { applicationApi, propertyApi, wishlistApi, userApi, agentApi } from '../../api/services'
import { LocationPicker } from '../../components/common/LocationMap'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ user, activeTab, onTabChange, onLogout }) {
  const isAdmin = user.role === 'admin'

  const tenantNav = [
    { id: 'overview',     label: 'Overview' },
    { id: 'applications', label: 'My Applications' },
    { id: 'wishlist',     label: 'Saved Properties' },
    { id: 'profile',      label: 'My Profile' },
  ]
  const agentNav = [
    { id: 'overview',          label: 'Overview' },
    { id: 'agent-properties',  label: 'My Listings' },
    { id: 'agent-applications',label: 'Applications' },
    { id: 'profile',           label: 'My Profile' },
  ]
  const adminNav = [
    { id: 'overview',         label: 'Overview' },
    { id: 'all-applications', label: 'Applications' },
    { id: 'properties',       label: 'Properties' },
    { id: 'agents',           label: 'Agents' },
    { id: 'users',            label: 'Users' },
    { id: 'reports',          label: 'Reports' },
    { id: 'profile',          label: 'My Profile' },
  ]

  const navItems = isAdmin ? adminNav : user.role === 'agent' ? agentNav : tenantNav

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo">P</div>
        <div className="sidebar-brand-name">Prop<span>Rent</span></div>
      </div>
      <div className="sidebar-user">
        <div className="sidebar-avatar">{user.fullName.charAt(0).toUpperCase()}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-name">{user.fullName}</div>
          <div className="sidebar-role">
            {user.role === 'admin' ? 'Administrator' : user.role === 'agent' ? 'Agent' : 'Tenant'}
          </div>
        </div>
      </div>
      <div className="sidebar-section-label">Navigation</div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <a
            key={item.id}
            className={activeTab === item.id ? 'active' : ''}
            onClick={() => onTabChange(item.id)}
          >
            {item.label}
          </a>
        ))}
      </nav>
      <div className="sidebar-logout">
        <a onClick={onLogout}>Sign Out</a>
      </div>
    </aside>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ iconClass, value, label, onClick }) {
  return (
    <div className="stat-card" style={onClick ? { cursor: 'pointer' } : {}} onClick={onClick}>
      <div className={`stat-icon ${iconClass}`} />
      <div>
        <div className="stat-val">{value}</div>
        <div className="stat-lbl">{label}</div>
      </div>
    </div>
  )
}

// ── Format RWF ────────────────────────────────────────────────────────────────
function formatRWF(price) {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(price)
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ stats, recentApps, isAdmin, onTabChange }) {
  return (
    <div>
      <div className="dash-stats">
        {isAdmin ? (
          <>
            <StatCard iconClass="icon-blue"   value={stats.totalProperties}   label="Total Properties" />
            <StatCard iconClass="icon-green"  value={stats.availableProperties} label="Available" />
            <StatCard iconClass="icon-orange" value={stats.totalApplications}  label="Applications" />
            <StatCard iconClass="icon-red"    value={stats.pendingApplications} label="Pending Review" />
            {stats.pendingAgents > 0 && (
              <StatCard iconClass="icon-orange" value={stats.pendingAgents} label="Agents Awaiting Approval"
                onClick={() => onTabChange('agents')} />
            )}
          </>
        ) : (
          <>
            <StatCard iconClass="icon-blue"   value={stats.totalApplications}   label="Applications" />
            <StatCard iconClass="icon-green"  value={stats.approvedApplications} label="Approved" />
            <StatCard iconClass="icon-orange" value={stats.pendingApplications}  label="Pending" />
            <StatCard iconClass="icon-red"    value={stats.wishlistCount}        label="Saved Properties"
              onClick={() => onTabChange('wishlist')} />
          </>
        )}
      </div>

      <div className="table-card">
        <div className="table-header"><h3>Recent Activity</h3></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Activity</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentApps.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>No recent activity</td></tr>
              ) : recentApps.map(a => (
                <tr key={a.id}>
                  <td>
                    {isAdmin ? <><strong>{a.tenantName}</strong> applied for </> : 'Applied for '}
                    <strong>{a.propertyTitle}</strong>
                  </td>
                  <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── My Applications Tab ───────────────────────────────────────────────────────
function MyApplicationsTab({ applications, onWithdraw }) {
  return (
    <div className="table-card">
      <div className="table-header"><h3>My Applications</h3></div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Property</th><th>Type</th><th>Price</th><th>Applied</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>
                No applications yet. <a href="/properties" style={{ color: 'var(--primary)' }}>Browse properties</a>
              </td></tr>
            ) : applications.map(a => (
              <tr key={a.id}>
                <td><strong>{a.propertyTitle}</strong><br /><small style={{ color: 'var(--gray)' }}>{a.propertyLocation}</small></td>
                <td>{a.propertyType}</td>
                <td>{formatRWF(a.propertyPrice)}{a.propertyListingType === 'rent' ? '/mo' : ''}</td>
                <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                <td>{a.status === 'pending' && (
                  <button className="btn btn-sm btn-danger" onClick={() => onWithdraw(a.id)}>Withdraw</button>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── All Applications Tab (Admin) ──────────────────────────────────────────────
function AllApplicationsTab({ applications, onUpdateStatus }) {
  return (
    <div className="table-card">
      <div className="table-header"><h3>All Applications</h3></div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Applicant</th><th>Property</th><th>Message</th><th>Viewing Date</th><th>Date</th><th>Status</th></tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>No applications yet</td></tr>
            ) : applications.map(a => (
              <tr key={a.id}>
                <td>
                  <strong>{a.tenantName}</strong><br />
                  <small style={{ color: 'var(--gray)' }}>{a.tenantEmail}</small>
                </td>
                <td>{a.propertyTitle}</td>
                <td style={{ maxWidth: 200, whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>{a.message || '—'}</td>
                <td>{a.viewingDate ? new Date(a.viewingDate).toLocaleDateString() : '—'}</td>
                <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                <td>
                  {a.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn btn-sm btn-success" onClick={() => onUpdateStatus(a.id, 'approved')}>Approve</button>
                      <button className="btn btn-sm btn-danger" onClick={() => onUpdateStatus(a.id, 'rejected')}>Reject</button>
                    </div>
                  ) : (
                    <span className={`badge badge-${a.status}`}>{a.status}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Row Action Menu (long-press) ──────────────────────────────────────────────
function RowActionMenu({ x, y, onEdit, onDelete, onClose }) {
  useEffect(() => {
    const close = () => onClose()
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [onClose])

  return (
    <div
      onMouseDown={e => e.stopPropagation()}
      style={{
        position: 'fixed', top: y, left: x, zIndex: 9999,
        background: '#fff', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        minWidth: 160, overflow: 'hidden', border: '1px solid var(--border)'
      }}
    >
      <button className="row-menu-btn" onClick={onEdit}>Edit Property</button>
      <div style={{ height: 1, background: 'var(--border)' }} />
      <button className="row-menu-btn row-menu-btn--danger" onClick={onDelete}>Delete Property</button>
    </div>
  )
}

// ── Property Form (shared by Add & Edit) ─────────────────────────────────────
const EMPTY_FORM = {
  title: '', location: '', propertyType: 'Apartment', listingType: 'rent',
  price: '', sizeM2: '', bedrooms: 0, bathrooms: 1, parking: 0,
  description: '', imageUrl: '', amenities: '', isAvailable: true, isFeatured: false
}

function PropertyForm({ initial, onSubmit, onCancel, loading, submitLabel }) {
  const [form, setForm] = useState(initial)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(initial.imageUrl || '')
  const handleChange = e => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }
  const isEdit = !!initial.id

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await propertyApi.uploadImage(file).then(r => r.data.url)
      setForm(prev => ({ ...prev, imageUrl: url }))
      setPreviewUrl(url)
    } catch {
      alert('Image upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }}>
      <div className="form-row">
        <div className="form-group"><label>Title</label><input name="title" value={form.title} onChange={handleChange} required /></div>
      <div className="form-group">
          <label>Location</label>
          <input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Kiyovu, Kigali" required />
          <div style={{ marginTop: '0.5rem' }}>
            <LocationPicker value={form.location} onChange={loc => setForm(prev => ({ ...prev, location: loc }))} />
          </div>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Property Type</label>
          <select name="propertyType" value={form.propertyType} onChange={handleChange}>
            {['Apartment','House','Studio','Townhouse','Commercial'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Listing Type</label>
          <select name="listingType" value={form.listingType} onChange={handleChange}>
            <option value="rent">For Rent</option>
            <option value="sale">For Sale</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group"><label>Size (m²)</label><input type="number" name="sizeM2" value={form.sizeM2} onChange={handleChange} required={!isEdit} /></div>
        <div className="form-group"><label>Bedrooms</label><input type="number" name="bedrooms" value={form.bedrooms} onChange={handleChange} min={0} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label>Bathrooms</label><input type="number" name="bathrooms" value={form.bathrooms} onChange={handleChange} min={1} /></div>
        <div className="form-group"><label>Parking Spaces</label><input type="number" name="parking" value={form.parking} onChange={handleChange} min={0} /></div>
      </div>
      {!isEdit && (
        <>
          <div className="form-group">
            <label>Property Image</label>
            <input
              type="file" accept="image/jpeg,image/png,image/webp"
              onChange={handleImagePick}
              disabled={uploading}
            />
            {uploading && <small style={{ color: 'var(--gray)' }}>Uploading…</small>}
            {previewUrl && (
              <img src={previewUrl} alt="preview"
                style={{ marginTop: '0.5rem', width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 6 }} />
            )}
          </div>
          <div className="form-group"><label>Amenities (comma separated)</label><input name="amenities" value={form.amenities} onChange={handleChange} placeholder="WiFi, Pool, Security" /></div>
        </>
      )}
      <div className="form-row">
        <div className="form-group"><label>Price (RWF)</label><input type="number" name="price" value={form.price} onChange={handleChange} required /></div>
        <div className="form-group" style={{ justifyContent: 'flex-end', gap: '1.2rem', display: 'flex', alignItems: 'center', paddingTop: '1.4rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
            <input type="checkbox" name="isAvailable" checked={form.isAvailable} onChange={handleChange} /> Available
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
            <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={handleChange} /> Featured
          </label>
        </div>
      </div>
      <div className="form-group"><label>Description</label><textarea name="description" value={form.description} onChange={handleChange} /></div>
      <div style={{ display: 'flex', gap: '0.8rem' }}>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : submitLabel}</button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

// ── Manage Properties Tab (Admin) ─────────────────────────────────────────────
function PropertiesTab({ onRefresh: onGlobalRefresh }) {
  const { showToast } = useToast()
  const [allProperties, setAllProperties] = useState([])
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [menu, setMenu] = useState(null)
  const [pendingListings, setPendingListings] = useState([])
  const longPressTimer = useRef(null)

  const loadAll = useCallback(async () => {
    setLoadingList(true)
    try {
      const [propsRes, pendingRes] = await Promise.all([
        propertyApi.getAll({ pageSize: 500, availableOnly: false }),
        agentApi.getPendingListings(),
      ])
      setAllProperties(propsRes.data.items)
      setPendingListings(pendingRes.data)
    } catch { showToast('Failed to load properties.', 'error') }
    finally { setLoadingList(false) }
  }, [showToast])

  useEffect(() => { loadAll() }, [loadAll])

  const onRefresh = () => { loadAll(); onGlobalRefresh() }

  const filtered = allProperties.filter(p =>
    !search ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.location.toLowerCase().includes(search.toLowerCase())
  )

  const handleListingStatus = async (id, status) => {
    try {
      await agentApi.approveListingStatus(id, status)
      showToast(status === 'approved' ? 'Listing approved and now live.' : 'Listing rejected.', status === 'approved' ? 'success' : 'info')
      setPendingListings(prev => prev.filter(p => p.id !== id))
      onRefresh()
    } catch { showToast('Failed to update listing status.', 'error') }
  }

  const handlePressStart = (e, p) => {
    const { clientX, clientY } = e.touches ? e.touches[0] : e
    longPressTimer.current = setTimeout(() => {
      setMenu({ x: clientX, y: clientY, property: p })
    }, 600)
  }

  const handlePressEnd = () => {
    clearTimeout(longPressTimer.current)
  }

  const handleAdd = async (form) => {
    setLoading(true)
    try {
      await propertyApi.create({
        title: form.title, location: form.location,
        propertyType: form.propertyType, listingType: form.listingType,
        price: Number(form.price), sizeM2: Number(form.sizeM2),
        bedrooms: Number(form.bedrooms), bathrooms: Number(form.bathrooms),
        parking: Number(form.parking), description: form.description,
        isFeatured: form.isFeatured, isAvailable: form.isAvailable,
        images: form.imageUrl ? [form.imageUrl] : [],
        amenities: form.amenities.split(',').map(a => a.trim()).filter(Boolean)
      })
      showToast('Property added!', 'success')
      setMode(null)
      onRefresh()
    } catch { showToast('Failed to add property.', 'error') }
    finally { setLoading(false) }
  }

  const handleEdit = async (form) => {
    setLoading(true)
    try {
      await propertyApi.update(mode.id, {
        title: form.title, location: form.location,
        price: Number(form.price), description: form.description,
        isAvailable: form.isAvailable, isFeatured: form.isFeatured,
        propertyType: form.propertyType, listingType: form.listingType,
        bedrooms: Number(form.bedrooms), bathrooms: Number(form.bathrooms),
        parking: Number(form.parking), sizeM2: Number(form.sizeM2) || undefined
      })
      showToast('Property updated!', 'success')
      setMode(null)
      onRefresh()
    } catch { showToast('Failed to update property.', 'error') }
    finally { setLoading(false) }
  }

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return
    try {
      await propertyApi.delete(p.id)
      showToast('Property deleted.', 'info')
      onRefresh()
    } catch { showToast('Failed to delete property.', 'error') }
  }

  if (mode === 'add') return (
    <div className="add-property-form">
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 700 }}>Add New Property</h3>
      <PropertyForm initial={EMPTY_FORM} onSubmit={handleAdd} onCancel={() => setMode(null)} loading={loading} submitLabel="Add Property" />
    </div>
  )

  if (mode && mode.id) return (
    <div className="add-property-form">
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 700 }}>Edit Property</h3>
      <PropertyForm
        initial={{ id: mode.id, title: mode.title, location: mode.location, price: mode.price, description: mode.description || '', isAvailable: mode.isAvailable, isFeatured: mode.isFeatured, propertyType: mode.propertyType, listingType: mode.listingType, bedrooms: mode.bedrooms, bathrooms: mode.bathrooms, parking: mode.parking, sizeM2: mode.sizeM2 }}
        onSubmit={handleEdit} onCancel={() => setMode(null)} loading={loading} submitLabel="Save Changes"
      />
    </div>
  )

  if (loadingList) return <div className="spinner" />

  return (
    <>
      {menu && (
        <RowActionMenu
          x={menu.x} y={menu.y}
          onEdit={() => { setMode(menu.property); setMenu(null) }}
          onDelete={() => { handleDelete(menu.property); setMenu(null) }}
          onClose={() => setMenu(null)}
        />
      )}
      {pendingListings.length > 0 && (
        <div className="table-card" style={{ marginBottom: '1.5rem' }}>
          <div className="table-header">
            <h3>Pending Review</h3>
            <span className="badge badge-pending">{pendingListings.length} pending</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Title</th><th>Agent</th><th>Location</th><th>Price</th><th>Action</th></tr></thead>
              <tbody>
                {pendingListings.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.title}</strong></td>
                    <td>{p.agent?.fullName || '—'}</td>
                    <td>{p.location}</td>
                    <td>{formatRWF(p.price)}{p.listingType === 'rent' ? '/mo' : ''}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn btn-sm btn-success" onClick={() => handleListingStatus(p.id, 'approved')}>Approve</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleListingStatus(p.id, 'rejected')}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="table-card">
        <div className="table-header">
          <h3>All Properties</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setMode('add')}>+ Add Property</button>
          </div>
        </div>
        <div className="report-filters">
          <input
            type="text" placeholder="Search by title or location…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="filter-input"
          />
          <span style={{ fontSize: '0.82rem', color: 'var(--gray)', whiteSpace: 'nowrap' }}>
            {filtered.length} of {allProperties.length} properties
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Title</th><th>Location</th><th>Type</th><th>Price (RWF)</th><th>Listing</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>No properties match your search</td></tr>
              ) : filtered.map(p => (
                <tr
                  key={p.id}
                  onMouseDown={e => handlePressStart(e, p)}
                  onMouseUp={handlePressEnd}
                  onMouseLeave={handlePressEnd}
                  onTouchStart={e => handlePressStart(e, p)}
                  onTouchEnd={handlePressEnd}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <td><strong>{p.title}</strong></td>
                  <td>{p.location}</td>
                  <td>{p.propertyType}</td>
                  <td>{formatRWF(p.price)}{p.listingType === 'rent' ? '/mo' : ''}</td>
                  <td><span className={`badge badge-${p.listingType}`}>{p.listingType === 'rent' ? 'Rent' : 'Sale'}</span></td>
                  <td><span className={`badge ${p.isAvailable ? 'badge-available' : 'badge-taken'}`}>{p.isAvailable ? 'Available' : 'Taken'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ── Agent: My Listings Tab ───────────────────────────────────────────────────
function AgentPropertiesTab({ properties, onRefresh }) {
  const { showToast } = useToast()
  const [mode, setMode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [menu, setMenu] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const longPressTimer = useRef(null)

  const handlePressStart = (e, p) => {
    const { clientX, clientY } = e.touches ? e.touches[0] : e
    longPressTimer.current = setTimeout(() => setMenu({ x: clientX, y: clientY, property: p }), 600)
  }
  const handlePressEnd = () => clearTimeout(longPressTimer.current)

  const handleToggle = async (e, p) => {
    e.stopPropagation()
    setTogglingId(p.id)
    try {
      await propertyApi.toggleAvailability(p.id)
      showToast(p.isAvailable ? 'Marked as taken.' : 'Marked as available.', 'success')
      onRefresh()
    } catch { showToast('Failed to update availability.', 'error') }
    finally { setTogglingId(null) }
  }

  const handleAdd = async (form) => {
    setLoading(true)
    try {
      await propertyApi.create({
        title: form.title, location: form.location,
        propertyType: form.propertyType, listingType: form.listingType,
        price: Number(form.price), sizeM2: Number(form.sizeM2),
        bedrooms: Number(form.bedrooms), bathrooms: Number(form.bathrooms),
        parking: Number(form.parking), description: form.description,
        isFeatured: false, isAvailable: form.isAvailable,
        images: form.imageUrl ? [form.imageUrl] : [],
        amenities: form.amenities.split(',').map(a => a.trim()).filter(Boolean)
      })
      showToast('Listing added!', 'success')
      setMode(null); onRefresh()
    } catch { showToast('Failed to add listing.', 'error') }
    finally { setLoading(false) }
  }

  const handleEdit = async (form) => {
    setLoading(true)
    try {
      await propertyApi.update(mode.id, {
        title: form.title, location: form.location,
        price: Number(form.price), description: form.description,
        isAvailable: form.isAvailable, isFeatured: form.isFeatured,
        propertyType: form.propertyType, listingType: form.listingType,
        bedrooms: Number(form.bedrooms), bathrooms: Number(form.bathrooms),
        parking: Number(form.parking), sizeM2: Number(form.sizeM2) || undefined
      })
      showToast('Listing updated!', 'success')
      setMode(null); onRefresh()
    } catch { showToast('Failed to update listing.', 'error') }
    finally { setLoading(false) }
  }

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete "${p.title}"?`)) return
    try {
      await propertyApi.delete(p.id)
      showToast('Listing deleted.', 'info'); onRefresh()
    } catch { showToast('Failed to delete listing.', 'error') }
  }

  if (mode === 'add') return (
    <div className="add-property-form">
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 700 }}>Add New Listing</h3>
      <PropertyForm initial={EMPTY_FORM} onSubmit={handleAdd} onCancel={() => setMode(null)} loading={loading} submitLabel="Add Listing" />
    </div>
  )
  if (mode && mode.id) return (
    <div className="add-property-form">
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 700 }}>Edit Listing</h3>
      <PropertyForm
        initial={{ id: mode.id, title: mode.title, location: mode.location, price: mode.price, description: mode.description || '', isAvailable: mode.isAvailable, isFeatured: mode.isFeatured, propertyType: mode.propertyType, listingType: mode.listingType, bedrooms: mode.bedrooms, bathrooms: mode.bathrooms, parking: mode.parking, sizeM2: mode.sizeM2 }}
        onSubmit={handleEdit} onCancel={() => setMode(null)} loading={loading} submitLabel="Save Changes"
      />
    </div>
  )

  return (
    <>
      {menu && (
        <RowActionMenu x={menu.x} y={menu.y}
          onEdit={() => { setMode(menu.property); setMenu(null) }}
          onDelete={() => { handleDelete(menu.property); setMenu(null) }}
          onClose={() => setMenu(null)}
        />
      )}
      <div className="table-card">
        <div className="table-header">
          <h3>My Listings</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setMode('add')}>+ Add Listing</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Title</th><th>Location</th><th>Price (RWF)</th><th>Listing</th><th>Available</th><th>Status</th></tr></thead>
            <tbody>
              {properties.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>No listings yet. Add your first property.</td></tr>
              ) : properties.map(p => (
                <tr key={p.id}
                  onMouseDown={e => handlePressStart(e, p)} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd}
                  onTouchStart={e => handlePressStart(e, p)} onTouchEnd={handlePressEnd}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <td><strong>{p.title}</strong></td>
                  <td>{p.location}</td>
                  <td>{formatRWF(p.price)}{p.listingType === 'rent' ? '/mo' : ''}</td>
                  <td><span className={`badge badge-${p.listingType}`}>{p.listingType === 'rent' ? 'Rent' : 'Sale'}</span></td>
                  <td>
                    <button
                      className={`btn btn-sm ${p.isAvailable ? 'btn-danger' : 'btn-success'}`}
                      onClick={e => handleToggle(e, p)}
                      disabled={togglingId === p.id}
                    >
                      {togglingId === p.id ? '…' : p.isAvailable ? 'Mark Taken' : 'Mark Available'}
                    </button>
                  </td>
                  <td>
                    <span className={`badge ${
                      p.listingStatus === 'approved' ? 'badge-approved' :
                      p.listingStatus === 'rejected' ? 'badge-rejected' : 'badge-pending'
                    }`}>{p.listingStatus === 'pending_review' ? 'Pending Review' : p.listingStatus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ── Agent: Applications Tab ───────────────────────────────────────────────────
function AgentApplicationsTab({ applications, onUpdateStatus }) {
  return (
    <div className="table-card">
      <div className="table-header"><h3>Applications on My Listings</h3></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Applicant</th><th>Property</th><th>Message</th><th>Viewing Date</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>
            {applications.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>No applications yet</td></tr>
            ) : applications.map(a => (
              <tr key={a.id}>
                <td><strong>{a.tenantName}</strong><br /><small style={{ color: 'var(--gray)' }}>{a.tenantEmail}</small></td>
                <td>{a.propertyTitle}</td>
                <td style={{ maxWidth: 200, whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>{a.message || '—'}</td>
                <td>{a.viewingDate ? new Date(a.viewingDate).toLocaleDateString() : '—'}</td>
                <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                <td>
                  {a.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn btn-sm btn-success" onClick={() => onUpdateStatus(a.id, 'approved')}>Approve</button>
                      <button className="btn btn-sm btn-danger" onClick={() => onUpdateStatus(a.id, 'rejected')}>Reject</button>
                    </div>
                  ) : (
                    <span className={`badge badge-${a.status}`}>{a.status}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Reports Tab (Admin) ──────────────────────────────────────────────────────
const PIE_COLORS = ['#1a73e8', '#ff6b35', '#28a745', '#ffc107', '#6c35ff']

function ReportsTab() {
  const { showToast } = useToast()
  const [allApps, setAllApps]   = useState([])
  const [allProps, setAllProps] = useState([])
  const [loading, setLoading]   = useState(true)

  // filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchName,   setSearchName]   = useState('')

  useEffect(() => {
    Promise.all([
      applicationApi.getAll(),
      propertyApi.getAll({ pageSize: 500 }),
    ]).then(([appsRes, propsRes]) => {
      setAllApps(appsRes.data)
      setAllProps(propsRes.data.items)
    }).catch(() => showToast('Failed to load report data', 'error'))
    .finally(() => setLoading(false))
  }, [])

  // ── derived / filtered data ──────────────────────────────────────────────
  const filteredApps = allApps.filter(a => {
    const date = new Date(a.createdAt)
    if (dateFrom && date < new Date(dateFrom)) return false
    if (dateTo   && date > new Date(dateTo + 'T23:59:59')) return false
    if (statusFilter && a.status !== statusFilter) return false
    if (searchName && !a.tenantName?.toLowerCase().includes(searchName.toLowerCase()) &&
        !a.propertyTitle?.toLowerCase().includes(searchName.toLowerCase())) return false
    return true
  })

  // applications per month (last 6 months)
  const monthlyData = (() => {
    const map = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' })
      map[key] = { month: key, Applications: 0, Approved: 0 }
    }
    allApps.forEach(a => {
      const d = new Date(a.createdAt)
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' })
      if (map[key]) {
        map[key].Applications++
        if (a.status === 'approved') map[key].Approved++
      }
    })
    return Object.values(map)
  })()

  // property type distribution
  const typeData = (() => {
    const map = {}
    allProps.forEach(p => { map[p.propertyType] = (map[p.propertyType] || 0) + 1 })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  })()

  // listing type split
  const listingData = [
    { name: 'For Rent', value: allProps.filter(p => p.listingType === 'rent').length },
    { name: 'For Sale', value: allProps.filter(p => p.listingType === 'sale').length },
  ]

  // summary stats
  const totalRevenue = allApps.filter(a => a.status === 'approved').length  // proxy: approved apps
  const approvalRate = allApps.length ? Math.round(allApps.filter(a => a.status === 'approved').length / allApps.length * 100) : 0

  // ── export helpers ───────────────────────────────────────────────────────
  const exportExcel = () => {
    const rows = filteredApps.map(a => ({
      Applicant:    a.tenantName,
      Email:        a.tenantEmail,
      Property:     a.propertyTitle,
      Location:     a.propertyLocation,
      Price:        a.propertyPrice,
      Status:       a.status,
      Message:      a.message || '',
      'Viewing Date': a.viewingDate ? new Date(a.viewingDate).toLocaleDateString() : '',
      'Applied On': new Date(a.createdAt).toLocaleDateString(),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Applications')
    XLSX.writeFile(wb, `PropRent_Applications_${new Date().toISOString().slice(0,10)}.xlsx`)
    showToast('Excel exported!', 'success')
  }

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('PropRent Rwanda — Applications Report', 14, 15)
    doc.setFontSize(9)
    doc.text(`Generated: ${new Date().toLocaleString()}  |  Total: ${filteredApps.length} records`, 14, 22)
    autoTable(doc, {
      startY: 27,
      head: [['Applicant', 'Email', 'Property', 'Status', 'Viewing Date', 'Applied On']],
      body: filteredApps.map(a => [
        a.tenantName,
        a.tenantEmail,
        a.propertyTitle,
        a.status,
        a.viewingDate ? new Date(a.viewingDate).toLocaleDateString() : '—',
        new Date(a.createdAt).toLocaleDateString(),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [26, 115, 232] },
      alternateRowStyles: { fillColor: [245, 248, 255] },
    })
    doc.save(`PropRent_Applications_${new Date().toISOString().slice(0,10)}.pdf`)
    showToast('PDF exported!', 'success')
  }

  if (loading) return <div className="spinner" />

  return (
    <div>
      {/* Summary KPI cards */}
      <div className="dash-stats" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card"><div className="stat-icon icon-blue" /><div><div className="stat-val">{allApps.length}</div><div className="stat-lbl">Total Applications</div></div></div>
        <div className="stat-card"><div className="stat-icon icon-green" /><div><div className="stat-val">{approvalRate}%</div><div className="stat-lbl">Approval Rate</div></div></div>
        <div className="stat-card"><div className="stat-icon icon-orange" /><div><div className="stat-val">{allProps.length}</div><div className="stat-lbl">Total Listings</div></div></div>
        <div className="stat-card"><div className="stat-icon icon-red" /><div><div className="stat-val">{allProps.filter(p => p.isAvailable).length}</div><div className="stat-lbl">Available Now</div></div></div>
      </div>

      {/* Charts row */}
      <div className="report-charts">
        <div className="table-card" style={{ padding: '1.2rem' }}>
          <div className="table-header" style={{ border: 'none', padding: '0 0 0.8rem' }}>
            <h3>Applications per Month</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="Applications" fill="#1a73e8" radius={[4,4,0,0]} />
              <Bar dataKey="Approved" fill="#28a745" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="table-card" style={{ padding: '1.2rem' }}>
          <div className="table-header" style={{ border: 'none', padding: '0 0 0.8rem' }}>
            <h3>Property Types</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                {typeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="table-card" style={{ padding: '1.2rem' }}>
          <div className="table-header" style={{ border: 'none', padding: '0 0 0.8rem' }}>
            <h3>Rent vs Sale</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={listingData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                {listingData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter + Export bar */}
      <div className="table-card">
        <div className="table-header">
          <h3>Applications Report</h3>
          <div className="report-actions">
            <button className="btn btn-sm btn-success" onClick={exportExcel}>⬇ Export Excel</button>
            <button className="btn btn-sm btn-danger"  onClick={exportPDF}>⬇ Export PDF</button>
          </div>
        </div>
        <div className="report-filters">
          <input type="text" placeholder="Search applicant or property…" value={searchName}
            onChange={e => setSearchName(e.target.value)} className="filter-input" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="sort-select">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="filter-input" style={{ maxWidth: 150 }} />
          <span style={{ color: 'var(--gray)', fontSize: '0.85rem' }}>to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="filter-input" style={{ maxWidth: 150 }} />
          {(dateFrom || dateTo || statusFilter || searchName) && (
            <button className="btn btn-sm btn-outline" onClick={() => { setDateFrom(''); setDateTo(''); setStatusFilter(''); setSearchName('') }}>Clear</button>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Applicant</th><th>Email</th><th>Property</th><th>Price</th><th>Status</th><th>Viewing Date</th><th>Applied On</th></tr>
            </thead>
            <tbody>
              {filteredApps.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>No records match the filters</td></tr>
              ) : filteredApps.map(a => (
                <tr key={a.id}>
                  <td><strong>{a.tenantName}</strong></td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--gray)' }}>{a.tenantEmail}</td>
                  <td>{a.propertyTitle}</td>
                  <td>{new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(a.propertyPrice)}</td>
                  <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                  <td>{a.viewingDate ? new Date(a.viewingDate).toLocaleDateString() : '—'}</td>
                  <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '0.75rem 1.2rem', fontSize: '0.82rem', color: 'var(--gray)', borderTop: '1px solid var(--border)' }}>
          Showing {filteredApps.length} of {allApps.length} records
        </div>
      </div>
    </div>
  )
}

// ── Admin: Users Tab ─────────────────────────────────────────────────────────
function UsersTab() {
  const { showToast } = useToast()
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  const load = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const res = await userApi.getAll()
      setUsers(res.data)
    } catch { showToast('Failed to load users.', 'error') }
    finally { setLoadingUsers(false) }
  }, [showToast])

  useEffect(() => { load() }, [load])

  const handleToggle = async (u) => {
    try {
      await userApi.toggleActive(u.id)
      showToast(`${u.fullName} ${u.isActive ? 'deactivated' : 'activated'}.`, 'success')
      load()
    } catch { showToast('Failed to update user.', 'error') }
  }

  if (loadingUsers) return <div className="spinner" />

  return (
    <div className="table-card">
      <div className="table-header"><h3>All Users</h3><span style={{ fontSize: '0.85rem', color: 'var(--gray)' }}>{users.length} total</span></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>No users found</td></tr>
            ) : users.map(u => (
              <tr key={u.id}>
                <td><strong>{u.fullName}</strong></td>
                <td>{u.email}</td>
                <td>{u.phone || '—'}</td>
                <td><span className={`badge badge-${u.role === 'admin' ? 'approved' : u.role === 'agent' ? 'rent' : 'pending'}`}>{u.role}</span></td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td><span className={`badge ${u.isActive ? 'badge-approved' : 'badge-rejected'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>
                  {u.role !== 'admin' && (
                    <button
                      className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                      onClick={() => handleToggle(u)}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Admin: Agents Tab ─────────────────────────────────────────────────────────
function AgentsTab({ onRefresh }) {
  const { showToast } = useToast()
  const [pending, setPending] = useState([])
  const [active, setActive] = useState([])
  const [loadingAgents, setLoadingAgents] = useState(true)

  const load = useCallback(async () => {
    setLoadingAgents(true)
    try {
      const [pendingRes, allRes] = await Promise.all([agentApi.getPending(), agentApi.getAll()])
      setPending(pendingRes.data)
      setActive(allRes.data.filter(a => a.isActive))
    } catch { showToast('Failed to load agents.', 'error') }
    finally { setLoadingAgents(false) }
  }, [showToast])

  useEffect(() => { load() }, [load])

  const handleApprove = async (userId, name) => {
    try {
      await agentApi.approve(userId)
      showToast(`${name} approved as agent.`, 'success')
      load(); onRefresh()
    } catch { showToast('Failed to approve agent.', 'error') }
  }

  const handleReject = async (userId, name) => {
    if (!window.confirm(`Reject ${name}'s agent application?`)) return
    try {
      await agentApi.reject(userId)
      showToast(`${name}'s application rejected.`, 'info')
      load(); onRefresh()
    } catch { showToast('Failed to reject agent.', 'error') }
  }

  if (loadingAgents) return <div className="spinner" />

  return (
    <div>
      {pending.length > 0 && (
        <div className="table-card" style={{ marginBottom: '1.5rem' }}>
          <div className="table-header">
            <h3>Pending Approval</h3>
            <span className="badge badge-pending">{pending.length} pending</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Registered</th><th>Action</th></tr></thead>
              <tbody>
                {pending.map(a => (
                  <tr key={a.userId}>
                    <td><strong>{a.fullName}</strong></td>
                    <td>{a.email}</td>
                    <td>{a.phone || '—'}</td>
                    <td>{new Date(a.registeredAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn btn-sm btn-success" onClick={() => handleApprove(a.userId, a.fullName)}>Approve</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleReject(a.userId, a.fullName)}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="table-card">
        <div className="table-header"><h3>Active Agents</h3></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th></tr></thead>
            <tbody>
              {active.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>No active agents yet</td></tr>
              ) : active.map(a => (
                <tr key={a.id}>
                  <td><strong>{a.fullName}</strong></td>
                  <td>{a.email}</td>
                  <td>{a.phone || '—'}</td>
                  <td>{a.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Wishlist Tab ──────────────────────────────────────────────────────────────
function WishlistTab({ items }) {
  if (items.length === 0) return (
    <div className="empty-state">
      <p>No saved properties yet.</p>
      <a href="/properties" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-flex' }}>Browse Properties</a>
    </div>
  )
  return (
    <div className="wishlist-grid">
      {items.map(p => (
        <a key={p.id} href={`/properties/${p.id}`} style={{ textDecoration: 'none' }}>
          <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: 0, overflow: 'hidden' }}>
            <img src={p.primaryImage} alt={p.title} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
            <div style={{ padding: '0.8rem' }}>
              <div style={{ fontWeight: 700 }}>{p.title}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--gray)' }}>{p.location}</div>
              <div style={{ color: 'var(--primary)', fontWeight: 800, marginTop: '0.4rem' }}>
                {formatRWF(p.price)}{p.listingType === 'rent' ? '/mo' : ''}
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  )
}

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab({ user, onUpdate }) {
  const { showToast } = useToast()
  const { updateUser } = useAuth()
  const [form, setForm] = useState({ fullName: user.fullName, phone: user.phone || '', currentPassword: '', newPassword: '' })
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await userApi.updateProfile({
        fullName: form.fullName,
        phone: form.phone,
        currentPassword: form.currentPassword || undefined,
        newPassword: form.newPassword || undefined
      })
      updateUser(data)
      onUpdate(data)
      showToast('Profile updated successfully!', 'success')
      setForm(prev => ({ ...prev, currentPassword: '', newPassword: '' }))
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="profile-form">
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 700 }}>My Profile</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group"><label>Full Name</label><input name="fullName" value={form.fullName} onChange={handleChange} required /></div>
        <div className="form-group"><label>Email</label><input type="email" value={user.email} disabled style={{ opacity: 0.6 }} /></div>
        <div className="form-group"><label>Phone</label><input name="phone" value={form.phone} onChange={handleChange} /></div>
        <div className="form-group"><label>Current Password</label><input type="password" name="currentPassword" value={form.currentPassword} onChange={handleChange} placeholder="Leave blank to keep current" /></div>
        <div className="form-group"><label>New Password</label><input type="password" name="newPassword" value={form.newPassword} onChange={handleChange} placeholder="Leave blank to keep current" /></div>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Save Changes'}</button>
      </form>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const isAdmin = user?.role === 'admin'
  const isAgent = user?.role === 'agent'

  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState({ totalProperties: 0, availableProperties: 0, totalApplications: 0, pendingApplications: 0, approvedApplications: 0, wishlistCount: 0, pendingAgents: 0 })
  const [myApps, setMyApps] = useState([])
  const [allApps, setAllApps] = useState([])
  const [agentApps, setAgentApps] = useState([])
  const [properties, setProperties] = useState([])
  const [agentProperties, setAgentProperties] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [loading, setLoading] = useState(true)

  const tabTitles = {
    overview: 'Dashboard Overview', applications: 'My Applications',
    wishlist: 'Saved Properties', 'all-applications': 'All Applications',
    properties: 'Manage Properties', agents: 'Manage Agents', users: 'Manage Users',
    reports: 'Reports & Analytics',
    'agent-properties': 'My Listings', 'agent-applications': 'Applications',
    profile: 'My Profile'
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes] = await Promise.all([applicationApi.getStats()])
      setStats(statsRes.data)

      if (isAdmin) {
        const appsRes = await applicationApi.getAll()
        setAllApps(appsRes.data)
      } else if (isAgent) {
        const [appsRes, propsRes] = await Promise.all([agentApi.getMyApplications(), agentApi.getMyProperties()])
        setAgentApps(appsRes.data)
        setAgentProperties(propsRes.data)
      } else {
        const [appsRes, wishRes] = await Promise.all([applicationApi.getMine(), wishlistApi.getMine()])
        setMyApps(appsRes.data)
        setWishlist(wishRes.data)
      }
    } catch {
      showToast('Failed to load dashboard data.', 'error')
    } finally {
      setLoading(false)
    }
  }, [isAdmin, isAgent, showToast])

  useEffect(() => { loadData() }, [loadData])

  const handleUpdateStatus = async (appId, status) => {
    try {
      await applicationApi.updateStatus(appId, status)
      showToast(`Application ${status}`, status === 'approved' ? 'success' : 'error')
      loadData()
    } catch {
      showToast('Failed to update status.', 'error')
    }
  }

  const handleWithdraw = async (appId) => {
    if (!window.confirm('Withdraw this application?')) return
    try {
      await applicationApi.withdraw(appId)
      showToast('Application withdrawn.', 'info')
      loadData()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to withdraw.', 'error')
    }
  }

  if (!user) return null

  const recentApps = isAdmin ? allApps.slice(0, 5) : isAgent ? agentApps.slice(0, 5) : myApps.slice(0, 5)

  return (
    <div className="dashboard-layout">
      <Sidebar user={user} activeTab={activeTab} onTabChange={setActiveTab} onLogout={logout} />

      <main className="main-content">
        <div className="dash-topbar">
          <div className="dash-topbar-title">{tabTitles[activeTab] || 'Dashboard'}</div>
          <div className="dash-topbar-user">
            <div className="dash-topbar-avatar">{user.fullName.charAt(0).toUpperCase()}</div>
            <div className="dash-topbar-info">
              <span className="dash-topbar-name">{user.fullName}</span>
              <span className="dash-topbar-role">{user.role === 'admin' ? 'Administrator' : user.role === 'agent' ? 'Agent' : 'Tenant'}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="main-scroll"><div className="spinner" /></div>
        ) : (
          <div className="main-scroll">
            {activeTab === 'overview' && (
              <OverviewTab stats={stats} recentApps={recentApps} isAdmin={isAdmin} onTabChange={setActiveTab} />
            )}
            {activeTab === 'applications' && !isAdmin && !isAgent && (
              <MyApplicationsTab applications={myApps} onWithdraw={handleWithdraw} />
            )}
            {activeTab === 'all-applications' && isAdmin && (
              <AllApplicationsTab applications={allApps} onUpdateStatus={handleUpdateStatus} />
            )}
            {activeTab === 'properties' && isAdmin && (
              <PropertiesTab onRefresh={loadData} />
            )}
            {activeTab === 'agents' && isAdmin && (
              <AgentsTab onRefresh={loadData} />
            )}
            {activeTab === 'users' && isAdmin && (
              <UsersTab />
            )}
            {activeTab === 'reports' && isAdmin && (
              <ReportsTab />
            )}
            {activeTab === 'agent-properties' && isAgent && (
              <AgentPropertiesTab properties={agentProperties} onRefresh={loadData} />
            )}
            {activeTab === 'agent-applications' && isAgent && (
              <AgentApplicationsTab applications={agentApps} onUpdateStatus={handleUpdateStatus} />
            )}
            {activeTab === 'wishlist' && !isAdmin && !isAgent && (
              <WishlistTab items={wishlist} />
            )}
            {activeTab === 'profile' && (
              <ProfileTab user={user} onUpdate={() => {}} />
            )}
          </div>
        )}
      </main>
    </div>
  )
}
