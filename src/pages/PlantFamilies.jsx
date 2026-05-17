import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { plantFamilies } from '../data/plantFamilies.js'

export default function PlantFamilies() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const sorted = [...plantFamilies].sort((a, b) => a.name.localeCompare(b.name))
  const q = query.trim().toLowerCase()
  const families = q
    ? sorted.filter(f => f.name.toLowerCase().includes(q))
    : sorted

  return (
    <div style={{
      minHeight:     '100svh',
      background:    '#f0ede6',
      fontFamily:    'var(--font-body)',
      color:         'var(--text)',
      paddingBottom: '88px',
    }}>

      {/* Header */}
      <div style={{
        background:     '#1D9E75',
        padding:        '14px 16px',
        display:        'flex',
        alignItems:     'center',
        gap:            '12px',
      }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          style={{
            background:     'none',
            border:         'none',
            color:          '#fff',
            fontSize:       '22px',
            lineHeight:     1,
            cursor:         'pointer',
            padding:        '4px 6px',
            fontFamily:     'var(--font-body)',
          }}
        >
          ←
        </button>
        <div style={{
          fontFamily: '"DM Serif Display", serif',
          fontSize:   '18px',
          color:      '#fff',
        }}>
          🌱 All Plant Families
        </div>
      </div>

      {/* Search */}
      <div style={{ margin: '16px', position: 'relative' }}>
        <span style={{
          position:      'absolute',
          left:          '16px',
          top:           '50%',
          transform:     'translateY(-50%)',
          fontSize:      '16px',
          color:         '#aaa',
          pointerEvents: 'none',
        }}>🔍</span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search families…"
          style={{
            background:   '#fff',
            borderRadius: '25px',
            padding:      '12px 16px 12px 42px',
            fontSize:     '15px',
            border:       'none',
            outline:      'none',
            width:        '100%',
            boxSizing:    'border-box',
            boxShadow:    '0 2px 8px rgba(0,0,0,0.06)',
            fontFamily:   'var(--font-body)',
          }}
        />
      </div>

      {/* Count line */}
      <div style={{
        padding:    '0 16px 8px',
        fontSize:   '12px',
        color:      '#666',
      }}>
        {families.length} {families.length === 1 ? 'family' : 'families'}
      </div>

      {/* Grid */}
      {families.length === 0 ? (
        <div style={{
          margin:      '32px 16px',
          padding:     '24px',
          background:  '#fff',
          borderRadius:'14px',
          textAlign:   'center',
          color:       '#888',
          fontSize:    '14px',
        }}>
          No families match "{query.trim()}".
        </div>
      ) : (
        <div style={{
          padding:             '0 16px',
          display:             'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap:                 '10px',
        }}>
          {families.map(f => (
            <button
              key={f.slug}
              onClick={() => navigate(`/catalogue/family/${f.slug}`)}
              style={{
                background:   '#fff',
                borderRadius: '14px',
                padding:      '16px 8px',
                textAlign:    'center',
                cursor:       'pointer',
                boxShadow:    '0 2px 8px rgba(0,0,0,0.05)',
                border:       'none',
                fontFamily:   'var(--font-body)',
              }}
            >
              <span style={{
                fontSize:     '32px',
                display:      'block',
                marginBottom: '6px',
                lineHeight:   1,
                fontFamily:   '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif',
              }}>
                {f.emoji}
              </span>
              <div style={{
                fontSize:   '13px',
                fontWeight: 600,
                color:      '#1a1a1a',
                lineHeight: 1.2,
              }}>
                {f.name}
              </div>
              <div style={{
                fontSize:  '11px',
                color:     '#888',
                marginTop: '4px',
              }}>
                {f.count} plants
              </div>
            </button>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
