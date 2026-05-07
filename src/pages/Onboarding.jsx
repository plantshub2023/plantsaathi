import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ZONES, getZone } from '../data/zones.js'
import { PLANTS } from '../data/plants.js'
import { useStorage } from '../hooks/useStorage.js'

export default function Onboarding() {
  const [step, setStep]                   = useState(1)
  const [name, setName]                   = useState('')
  const [citySearch, setCitySearch]       = useState('')
  const [city, setCity]                   = useState('')
  const [zone, setZone]                   = useState(null)   // [code, name, peakTemp]
  const [showDropdown, setShowDropdown]   = useState(false)
  const [selectedPlants, setSelectedPlants] = useState([])
  const [inputFocused, setInputFocused]   = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')
  const [locationError,   setLocationError]   = useState('')

  const navigate    = useNavigate()
  const { saveUser } = useStorage()

  // ─── City autocomplete ──────────────────────────────────────────────────────

  const allCities = Object.keys(ZONES)

  const suggestions = citySearch.length > 0
    ? (() => {
        const q  = citySearch.toLowerCase()
        const sw = allCities.filter(c => c.toLowerCase().startsWith(q))
        const inc = allCities.filter(
          c => !c.toLowerCase().startsWith(q) && c.toLowerCase().includes(q)
        )
        return [...sw, ...inc].slice(0, 7)
      })()
    : []

  function handleCitySelect(selected) {
    setCity(selected)
    setCitySearch(selected)
    setZone(ZONES[selected])
    setShowDropdown(false)
  }

  // ─── Plants ─────────────────────────────────────────────────────────────────

  function togglePlant(id) {
    setSelectedPlants(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  // ─── Complete ────────────────────────────────────────────────────────────────

  function handleComplete(skipPlants = false) {
    saveUser({
      name,
      city,
      zone:     zone ? zone[0] : null,
      zoneName: zone ? zone[1] : null,
      plants:   skipPlants ? [] : selectedPlants,
      joinedDate: new Date().toISOString(),
    })
    navigate('/garden')
  }

  // ─── Location detection ──────────────────────────────────────────────────────

  async function detectLocation() {
    setLocationLoading(true)
    setLocationError('')
    setLocationMessage('')

    if (!navigator.geolocation) {
      setLocationError('Location not supported on this device')
      setLocationLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords

          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data = await res.json()

          const placeName =
            data.address.village ||
            data.address.hamlet ||
            data.address.suburb ||
            data.address.neighbourhood ||
            data.address.town ||
            data.address.city ||
            data.address.county ||
            data.address.state_district ||
            data.address.state

          const district = data.address.county ||
            data.address.state_district || ''
          const state = data.address.state || ''

          const displayName = [placeName, district, state]
            .filter(Boolean).join(', ')

          if (placeName) {
            const zoneData = getZone(placeName)

            if (zoneData) {
              setCity(placeName)
              setCitySearch(placeName)
              setZone(zoneData)
              setLocationMessage(
                `✅ ${displayName} detected — ${zoneData[0]} ${zoneData[1]}`
              )
            } else {
              const assigned = assignZoneByCoords(latitude, longitude)
              saveCustomLocation(placeName, displayName, latitude, longitude, assigned)
              setCity(placeName)
              setCitySearch(placeName)
              setZone(assigned)
              setLocationMessage(
                `✅ ${displayName} detected — ${assigned[0]} ${assigned[1]} (auto assigned)`
              )
            }
          }
        } catch (err) {
          setLocationError('Could not detect location. Please type your city.')
        }
        setLocationLoading(false)
      },
      () => {
        setLocationError('Location access denied. Please type your city.')
        setLocationLoading(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  function assignZoneByCoords(lat, lon) {
    if (lat > 32 && lon > 76 && lon < 80)
      return ['Z1', 'Cold Alpine', 20]
    if (lat > 26 && lat < 32 && lon > 86 && lon < 90)
      return ['Z2', 'Cold Hills', 25]
    if (lat > 25 && lat < 30 && lon > 87 && lon < 92)
      return ['Z3', 'Subtropical Hills', 28]
    if (lat > 30 && lon > 76 && lon < 82)
      return ['Z4', 'Subtropical Highland', 33]
    if (lat > 22 && lat < 27 && lon > 88 && lon < 93)
      return ['Z5', 'Subtropical Monsoon', 38]
    if (lat > 23 && lat < 26 && lon > 91 && lon < 93)
      return ['Z6', 'Subtropical Monsoon Highland', 32]
    if (lat < 14 && lon > 92)
      return ['Z9', 'Cool Tropical Highland', 33]
    if (lat < 17 && lon > 73 && lon < 77)
      return ['Z10', 'Tropical Mid-Elevation Monsoon', 38]
    if (lat < 20 && lon > 72 && lon < 76)
      return ['Z11', 'Tropical Monsoon Coastal', 38]
    if (lat < 18 && lon > 77)
      return ['Z14', 'Tropical WDS Coastal', 42]
    if (lat < 20 && lon > 76 && lon < 80)
      return ['Z15', 'Tropical Semi-Arid', 48]
    if (lat > 25 && lon < 73)
      return ['Z17', 'Subtropical Hot Arid', 50]
    if (lat > 20 && lat < 28 && lon > 68 && lon < 76)
      return ['Z8', 'Subtropical Semi-Arid', 44]
    if (lat > 18 && lat < 24 && lon > 77 && lon < 85)
      return ['Z13', 'Tropical WDS Hot Interior', 48]
    if (lat < 20 && lon > 74 && lon < 78)
      return ['Z18', 'Tropical Hot Semi-Arid', 46]
    if (lat < 18 && lon > 76 && lon < 80)
      return ['Z12', 'Tropical Wet-Dry Savanna', 40]
    if (lat > 24 && lon > 76 && lon < 88)
      return ['Z16', 'Subtropical Hot Semi-Arid Continental', 48]
    return ['Z7', 'Humid Subtropical', 42]
  }

  function saveCustomLocation(placeName, displayName, lat, lon, zoneData) {
    const customLocations = JSON.parse(
      localStorage.getItem('customLocations') || '{}'
    )
    customLocations[placeName] = {
      zone:        zoneData[0],
      zoneName:    zoneData[1],
      peakTemp:    zoneData[2],
      displayName,
      lat,
      lon,
      addedDate:   new Date().toISOString(),
    }
    localStorage.setItem('customLocations', JSON.stringify(customLocations))
  }

  // ─── Shared style tokens ─────────────────────────────────────────────────────

  const page = {
    height: '100svh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: 'var(--cream)',
    color: 'var(--text)',
    fontFamily: 'var(--font-body)',
  }

  const scrollArea = {
    flex: 1,
    overflowY: 'auto',
    padding: '52px 24px 8px',
    WebkitOverflowScrolling: 'touch',
  }

  const footer = {
    padding: '16px 24px 36px',
    background: 'var(--cream)',
    borderTop: '1px solid var(--border)',
    flexShrink: 0,
  }

  const h1 = {
    fontFamily: 'var(--font-display)',
    fontWeight: 500,
    fontSize: '28px',
    lineHeight: 1.25,
    color: 'var(--text)',
    margin: '0 0 12px',
  }

  const muted = {
    fontSize: '15px',
    color: 'var(--muted)',
    lineHeight: 1.55,
    margin: '0 0 36px',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--muted)',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
  }

  function inputStyle(focused) {
    return {
      width: '100%',
      padding: '14px 16px',
      fontSize: '16px',
      fontFamily: 'var(--font-body)',
      color: 'var(--text)',
      background: '#fff',
      border: `1.5px solid ${focused ? 'var(--green)' : 'var(--border)'}`,
      borderRadius: '12px',
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'border-color 0.2s',
    }
  }

  const btnPrimary = {
    flex: 1,
    padding: '16px',
    fontSize: '16px',
    fontWeight: 500,
    fontFamily: 'var(--font-body)',
    color: '#fff',
    background: 'var(--green)',
    border: 'none',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
  }

  const btnOutline = {
    flex: 1,
    padding: '16px',
    fontSize: '16px',
    fontWeight: 500,
    fontFamily: 'var(--font-body)',
    color: 'var(--muted)',
    background: 'transparent',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
  }

  const btnDisabled = { opacity: 0.35, cursor: 'not-allowed' }

  // ─── Progress dots ───────────────────────────────────────────────────────────

  const progressDots = (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      marginTop: '20px',
    }}>
      {[1, 2, 3].map(n => (
        <div
          key={n}
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: n === step ? 'var(--green)' : 'var(--border)',
            transform: n === step ? 'scale(1.3)' : 'scale(1)',
            transition: 'all 0.25s ease',
          }}
        />
      ))}
    </div>
  )

  // ─── Step 1 — Name ───────────────────────────────────────────────────────────

  if (step === 1) return (
    <div style={page}>
      <div style={scrollArea}>

        {/* Brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '48px' }}>
          <span style={{ fontSize: '22px' }}>🌱</span>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize: '16px',
            color: 'var(--green)',
          }}>
            PlantSaathi
          </span>
        </div>

        <h1 style={{ ...h1, fontSize: '32px', marginBottom: '16px' }}>
          Care for your plants, better
        </h1>
        <p style={muted}>
          India's first plant care app built for Indian soil, Indian seasons
          and Indian homes
        </p>

        <label style={labelStyle}>Your name</label>
        <input
          style={inputStyle(inputFocused)}
          type="text"
          placeholder="e.g. Priya"
          value={name}
          onChange={e => setName(e.target.value)}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          autoFocus
        />

      </div>

      <div style={footer}>
        <div style={{ display: 'flex' }}>
          <button
            style={{
              ...btnPrimary,
              ...(name.trim() === '' ? btnDisabled : {}),
            }}
            disabled={name.trim() === ''}
            onClick={() => setStep(2)}
          >
            Next →
          </button>
        </div>
        {progressDots}
      </div>
    </div>
  )

  // ─── Step 2 — City ───────────────────────────────────────────────────────────

  if (step === 2) return (
    <div style={page}>
      <div style={scrollArea}>

        <h1 style={h1}>Where do you grow?</h1>
        <p style={muted}>We'll tailor care tips to your local climate</p>

        <label style={labelStyle}>Your city</label>
        <div style={{ position: 'relative' }}>
          <input
            style={{
              ...inputStyle(inputFocused),
              borderRadius: (showDropdown && suggestions.length > 0)
                ? '12px 12px 0 0'
                : '12px',
            }}
            type="text"
            placeholder="Search city…"
            value={citySearch}
            onChange={e => {
              setCitySearch(e.target.value)
              setCity('')
              setZone(null)
              setShowDropdown(true)
            }}
            onFocus={() => { setInputFocused(true); setShowDropdown(true) }}
            onBlur={() => {
              setInputFocused(false)
              setTimeout(() => setShowDropdown(false), 150)
            }}
            autoFocus
          />

          {showDropdown && suggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#fff',
              border: '1.5px solid var(--green)',
              borderTop: 'none',
              borderRadius: '0 0 12px 12px',
              zIndex: 20,
              maxHeight: '210px',
              overflowY: 'auto',
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            }}>
              {suggestions.map((c, i) => (
                <div
                  key={c}
                  onMouseDown={e => { e.preventDefault(); handleCitySelect(c) }}
                  style={{
                    padding: '13px 16px',
                    fontSize: '15px',
                    cursor: 'pointer',
                    color: 'var(--text)',
                    borderBottom: i < suggestions.length - 1
                      ? '1px solid var(--border)'
                      : 'none',
                  }}
                >
                  {c}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Use my location button */}
        <button
          onClick={detectLocation}
          disabled={locationLoading}
          style={{
            width:          '100%',
            padding:        '12px',
            marginTop:      '10px',
            background:     'white',
            border:         '1.5px solid var(--green)',
            borderRadius:   '12px',
            color:          'var(--green)',
            fontSize:       '14px',
            fontWeight:     500,
            cursor:         locationLoading ? 'not-allowed' : 'pointer',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            '8px',
            fontFamily:     'var(--font-body)',
          }}
        >
          {locationLoading ? '⏳ Detecting location…' : '📍 Use my location'}
        </button>

        {locationMessage && (
          <div style={{
            marginTop:    '8px',
            padding:      '10px 12px',
            background:   'var(--green-light)',
            borderRadius: '8px',
            fontSize:     '13px',
            color:        'var(--green-dark)',
          }}>
            {locationMessage}
          </div>
        )}

        {locationError && (
          <div style={{
            marginTop:    '8px',
            padding:      '10px 12px',
            background:   '#FCEBEB',
            borderRadius: '8px',
            fontSize:     '13px',
            color:        '#E24B4A',
          }}>
            {locationError}
          </div>
        )}

        {/* Zone pill */}
        {zone && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '14px',
            padding: '8px 16px',
            background: 'var(--green-light)',
            color: 'var(--green-dark)',
            borderRadius: '100px',
            fontSize: '13px',
            fontWeight: 500,
          }}>
            <span>🌍</span>
            <span>{zone[0]} · {zone[1]}</span>
            <span style={{ opacity: 0.65 }}>· up to {zone[2]}°C</span>
          </div>
        )}

      </div>

      <div style={footer}>
        <div style={{ display: 'flex' }}>
          <button
            style={{
              ...btnPrimary,
              ...(!city ? btnDisabled : {}),
            }}
            disabled={!city}
            onClick={() => setStep(3)}
          >
            Next →
          </button>
        </div>
        {progressDots}
      </div>
    </div>
  )

  // ─── Step 3 — Plants ─────────────────────────────────────────────────────────

  return (
    <div style={page}>
      <div style={scrollArea}>

        <h1 style={h1}>What do you grow?</h1>
        <p style={{ ...muted, marginBottom: '24px' }}>
          Select your plants — you can add more later
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {PLANTS.map(plant => {
            const sel = selectedPlants.includes(plant.id)
            return (
              <button
                key={plant.id}
                onClick={() => togglePlant(plant.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 500,
                  borderRadius: '100px',
                  border: `1.5px solid ${sel ? 'var(--green)' : 'var(--border)'}`,
                  background: sel ? 'var(--green-light)' : '#fff',
                  color: sel ? 'var(--green-dark)' : 'var(--text)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{plant.emoji}</span>
                <span>{plant.name}</span>
              </button>
            )
          })}
        </div>

      </div>

      <div style={footer}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={btnOutline} onClick={() => handleComplete(true)}>
            Skip
          </button>
          <button style={btnPrimary} onClick={() => handleComplete(false)}>
            Done ✓
          </button>
        </div>
        {progressDots}
      </div>
    </div>
  )
}
