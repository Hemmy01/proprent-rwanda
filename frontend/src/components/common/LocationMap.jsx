import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons broken by bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Rwanda center
const RWANDA = [-1.9403, 29.8739]

function geocode(query) {
  return fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Rwanda')}&format=json&limit=1`
  ).then(r => r.json())
}

// ── View-only map (PropertyDetail) ───────────────────────────────────────────
export function PropertyMap({ location }) {
  const ref = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (mapRef.current) return
    const map = L.map(ref.current, { zoomControl: true, scrollWheelZoom: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)
    mapRef.current = map

    geocode(location).then(results => {
      if (results.length > 0) {
        const { lat, lon } = results[0]
        map.setView([lat, lon], 15)
        L.marker([lat, lon]).addTo(map).bindPopup(location).openPopup()
      } else {
        map.setView(RWANDA, 9)
      }
    }).catch(() => map.setView(RWANDA, 9))

    return () => { map.remove(); mapRef.current = null }
  }, [location])

  return <div ref={ref} style={{ height: 280, borderRadius: 10, overflow: 'hidden', marginTop: '1.5rem' }} />
}

// ── Picker map (Add/Edit property form) ──────────────────────────────────────
export function LocationPicker({ value, onChange }) {
  const ref = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    if (mapRef.current) return
    const map = L.map(ref.current, { zoomControl: true, scrollWheelZoom: true })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)
    map.setView(RWANDA, 9)
    mapRef.current = map

    map.on('click', async e => {
      const { lat, lng } = e.latlng
      if (markerRef.current) markerRef.current.setLatLng([lat, lng])
      else markerRef.current = L.marker([lat, lng]).addTo(map)

      // Reverse geocode to get a human-readable location
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
        ).then(r => r.json())
        const addr = res.address
        const label = [
          addr.suburb || addr.neighbourhood || addr.village || addr.town,
          addr.city || addr.county,
          addr.country
        ].filter(Boolean).join(', ')
        onChange(label || `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        markerRef.current.bindPopup(label).openPopup()
      } catch {
        onChange(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      }
    })

    return () => { map.remove(); mapRef.current = null }
  }, [])

  // If value changes externally (e.g. user types), pan map to it
  useEffect(() => {
    if (!mapRef.current || !value) return
    geocode(value).then(results => {
      if (results.length > 0) {
        const { lat, lon } = results[0]
        mapRef.current.setView([lat, lon], 14)
        if (markerRef.current) markerRef.current.setLatLng([lat, lon])
        else markerRef.current = L.marker([lat, lon]).addTo(mapRef.current)
      }
    }).catch(() => {})
  }, [value])

  return (
    <div>
      <div ref={ref} style={{ height: 260, borderRadius: 10, overflow: 'hidden', border: '1.5px solid var(--border)' }} />
      <small style={{ color: 'var(--gray)', fontSize: '0.78rem', marginTop: '0.3rem', display: 'block' }}>
        Click on the map to set location, or type above and the map will update.
      </small>
    </div>
  )
}
