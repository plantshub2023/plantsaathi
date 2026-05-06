import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ZONES } from '../data/zones.js'
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
