import { useMemo, useState } from 'react'
import { useStorage } from '../hooks/useStorage.js'
import BottomNav from '../components/BottomNav.jsx'
import { plantshubCatalogue } from '../data/plantshubCatalogue.js'

// ─── Filter chips ────────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'all',             label: 'All' },
  { key: 'indoor',          label: '🏠 Indoor' },
  { key: 'outdoor',         label: '🌿 Outdoor' },
  { key: 'balcony',         label: '🪴 Balcony' },
  { key: 'bedroom',         label: '🛏️ Bedroom' },
  { key: 'office',          label: '💼 Office' },
  { key: 'flowering',       label: '🌸 Flowering' },
  { key: 'low-maintenance', label: '💧 Low Maintenance' },
  { key: 'air-purifying',   label: '🌬️ Air Purifying' },
]

function matchesFilter(plant, filterKey) {
  switch (filterKey) {
    case 'all':             return true
    case 'indoor':          return plant.locations.includes('indoor')
    case 'outdoor':         return plant.locations.includes('outdoor')
    case 'balcony':         return plant.locations.includes('balcony')
    case 'bedroom':         return plant.locations.includes('bedroom')
    case 'office':          return plant.locations.includes('office') || plant.locations.includes('office-desk')
    case 'flowering':       return plant.types.includes('flowering')
    case 'low-maintenance': return plant.types.includes('low-maintenance')
    case 'air-purifying':   return plant.types.includes('air-purifying')
    default:                return true
  }
}

// ─── Thumbnail with image-error fallback ────────────────────────────────────

function PlantThumbnail({ plant }) {
  const [errored, setErrored] = useState(false)
  if (!plant.image || errored) {
    return (
      <div style={{
        width: '100%', height: '100%',
        background: '#E8F5F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '48px',
      }}>{plant.emoji}</div>
    )
  }
  return (
    <img
      src={plant.image}
      alt={plant.name}
      loading="lazy"
      onError={() => setErrored(true)}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
      }}
    />
  )
}

// ─── Plant card ─────────────────────────────────────────────────────────────

function PlantCard({ plant, onBuy, onNotify, onAdd }) {
  return (
    <div style={{
      background:   '#fff',
      borderRadius: '16px',
      overflow:     'hidden',
      boxShadow:    '0 2px 8px rgba(0,0,0,0.06)',
      position:     'relative',
    }}>
      {/* Image */}
      <div style={{ height: '140px', position: 'relative', overflow: 'hidden' }}>
        <PlantThumbnail plant={plant} />
        <div style={{
          position:     'absolute',
          top:          '8px',
          left:         '8px',
          fontSize:     '10px',
          fontWeight:   600,
          color:        '#fff',
          padding:      '3px 8px',
          borderRadius: '10px',
          background:   plant.inStock ? '#1D9E75' : '#FF6B6B',
        }}>
          {plant.inStock ? '✓ In Stock' : 'Out of Stock'}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '10px' }}>
        <div style={{
          fontSize:           '13px',
          fontWeight:         600,
          color:              '#1a1a1a',
          lineHeight:         1.3,
          minHeight:          '34px',
          display:            '-webkit-box',
          WebkitLineClamp:    2,
          WebkitBoxOrient:    'vertical',
          overflow:           'hidden',
          textOverflow:       'ellipsis',
        }}>
          {plant.name}
        </div>

        {/* Price */}
        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {plant.salePrice != null ? (
            <>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#1D9E75' }}>
                ₹{plant.salePrice}
              </span>
              <span style={{ fontSize: '12px', color: '#aaa', textDecoration: 'line-through' }}>
                ₹{plant.price}
              </span>
            </>
          ) : (
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#1D9E75' }}>
              ₹{plant.price}
            </span>
          )}
        </div>

        {/* Buttons */}
        <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
          {plant.inStock ? (
            <button
              onClick={() => onBuy(plant)}
              style={{
                flex:         1,
                borderRadius: '12px',
                padding:      '6px 0',
                fontSize:     '11px',
                fontWeight:   500,
                border:       'none',
                cursor:       'pointer',
                background:   '#1D9E75',
                color:        '#fff',
                fontFamily:   'var(--font-body)',
              }}
            >
              🛒 Buy
            </button>
          ) : (
            <button
              onClick={() => onNotify(plant)}
              style={{
                flex:         1,
                borderRadius: '12px',
                padding:      '6px 0',
                fontSize:     '11px',
                fontWeight:   500,
                border:       'none',
                cursor:       'pointer',
                background:   '#FF6B6B',
                color:        '#fff',
                fontFamily:   'var(--font-body)',
              }}
            >
              🔔 Notify
            </button>
          )}
          <button
            onClick={() => onAdd(plant)}
            style={{
              flex:         1,
              background:   '#fff',
              color:        '#1D9E75',
              border:       '1.5px solid #1D9E75',
              borderRadius: '12px',
              padding:      '6px 0',
              fontSize:     '11px',
              fontWeight:   500,
              cursor:       'pointer',
              fontFamily:   'var(--font-body)',
            }}
          >
            ➕ Add
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Section ────────────────────────────────────────────────────────────────

function Section({ title, plants, emptyMessage, onBuy, onNotify, onAdd }) {
  return (
    <>
      <div style={{
        fontSize:     '14px',
        fontWeight:   600,
        color:        '#1a1a1a',
        padding:      '0 16px',
        marginTop:    '16px',
        marginBottom: '8px',
      }}>
        {title}
      </div>
      {plants.length === 0 ? (
        <div style={{
          display:    'block',
          textAlign:  'center',
          padding:    '40px 20px',
          fontSize:   '14px',
          color:      '#888',
        }}>
          {emptyMessage}
        </div>
      ) : (
        <div style={{
          padding:             '0 16px',
          display:             'grid',
          gridTemplateColumns: '1fr 1fr',
          gap:                 '12px',
        }}>
          {plants.map(p => (
            <PlantCard
              key={p.id}
              plant={p}
              onBuy={onBuy}
              onNotify={onNotify}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}
    </>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function Home() {
  const { getUser, getPlants, addPlant } = useStorage()
  const user = getUser()

  const [searchQuery,    setSearchQuery]    = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [toast,          setToast]          = useState(null)
  // Mirror plants in local state so newly-added show up immediately for duplicate check.
  const [plants,         setPlants]         = useState(() => getPlants())

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }

  const filteredList = useMemo(() => {
    let list = plantshubCatalogue
    const q = searchQuery.trim().toLowerCase()
    if (q) list = list.filter(p => p.name.toLowerCase().includes(q))
    if (selectedFilter !== 'all') list = list.filter(p => matchesFilter(p, selectedFilter))
    return list
  }, [searchQuery, selectedFilter])

  const inStockList = useMemo(
    () => plantshubCatalogue.filter(p => p.inStock).slice(0, 10),
    []
  )

  const isFiltered = Boolean(searchQuery.trim()) || selectedFilter !== 'all'

  function handleBuy(plant) {
    window.open(plant.url, '_blank')
  }

  function handleNotify() {
    showToast("We'll notify you when available", 'success')
  }

  function handleAddToGarden(catalogPlant) {
    const exists = plants.some(
      p => (p.name || '').toLowerCase() === catalogPlant.name.toLowerCase()
    )
    if (exists) {
      showToast(`🌱 ${catalogPlant.name} already in your garden!`, 'error')
      return
    }
    // useStorage.addPlant seeds id, addedDate, lastWatered, diagnoses, reminders.
    const newPlant = addPlant({
      name:           catalogPlant.name,
      emoji:          catalogPlant.emoji,
      photo:          null,
      notes:          '',
      category:       catalogPlant.types[0] || 'general',
      locationId:     null,
      waterDays:      null,
      plantshubUrl:   catalogPlant.url,
      plantshubPrice: catalogPlant.price,
      fromCatalogue:  true,
    })
    setPlants(prev => [...prev, newPlant])
    showToast(`✅ ${catalogPlant.name} added to your garden!`, 'success')
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight:     '100svh',
      background:    '#f0ede6',
      fontFamily:    'var(--font-body)',
      color:         'var(--text)',
      paddingBottom: '88px',
    }}>
      <style>{`
        .home-chip-scroll::-webkit-scrollbar { display: none; }
        @keyframes phToastFade {
          0%   { opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        background:     '#1D9E75',
        padding:        '16px',
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
      }}>
        <div style={{
          fontFamily: '"DM Serif Display", serif',
          fontSize:   '20px',
          color:      '#fff',
        }}>
          🌿 PlantSaathi
        </div>
        {user?.name && (
          <div style={{
            fontSize: '13px',
            color:    'rgba(255,255,255,0.85)',
          }}>
            {user.name}
          </div>
        )}
      </div>

      {/* Search */}
      <div style={{ margin: '16px', position: 'relative' }}>
        <span style={{
          position:      'absolute',
          left:          '16px',
          top:           '50%',
          transform:     'translateY(-50%)',
          fontSize:      '18px',
          color:         '#aaa',
          pointerEvents: 'none',
        }}>🔍</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search plants... (Rose, Monstera, Cactus)"
          style={{
            background:   '#fff',
            borderRadius: '25px',
            padding:      '12px 16px 12px 44px',
            fontSize:     '15px',
            border:       'none',
            outline:      'none',
            width:        '100%',
            boxSizing:    'border-box',
            boxShadow:    '0 2px 8px rgba(0,0,0,0.1)',
            fontFamily:   'var(--font-body)',
          }}
        />
      </div>

      {/* Filter chips */}
      <div
        className="home-chip-scroll"
        style={{
          padding:         '0 16px 12px',
          display:         'flex',
          gap:             '8px',
          overflowX:       'auto',
          scrollbarWidth:  'none',
          msOverflowStyle: 'none',
        }}
      >
        {FILTERS.map(f => {
          const active = selectedFilter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setSelectedFilter(f.key)}
              style={{
                cursor:       'pointer',
                whiteSpace:   'nowrap',
                padding:      '6px 14px',
                borderRadius: '20px',
                fontSize:     '12px',
                transition:   'all 0.2s',
                background:   active ? '#1D9E75' : '#fff',
                border:       `1.5px solid ${active ? '#1D9E75' : '#E0E0E0'}`,
                color:        active ? '#fff' : '#555',
                fontFamily:   'var(--font-body)',
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {isFiltered ? (
        <Section
          title={`Results (${filteredList.length} plants found)`}
          plants={filteredList}
          emptyMessage="🔍 No plants found"
          onBuy={handleBuy}
          onNotify={handleNotify}
          onAdd={handleAddToGarden}
        />
      ) : (
        <>
          <Section
            title="✅ In Stock at Plantshub"
            plants={inStockList}
            emptyMessage="🔍 No plants found"
            onBuy={handleBuy}
            onNotify={handleNotify}
            onAdd={handleAddToGarden}
          />
          <Section
            title="🌱 Browse All Plants"
            plants={plantshubCatalogue}
            emptyMessage="🔍 No plants found"
            onBuy={handleBuy}
            onNotify={handleNotify}
            onAdd={handleAddToGarden}
          />
        </>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position:     'fixed',
          bottom:       '90px',
          left:         '50%',
          transform:    'translateX(-50%)',
          background:   toast.type === 'success' ? '#1D9E75' : '#FF6B6B',
          color:        '#fff',
          padding:      '10px 20px',
          borderRadius: '20px',
          fontSize:     '13px',
          fontWeight:   500,
          boxShadow:    '0 4px 12px rgba(0,0,0,0.15)',
          zIndex:       1000,
          animation:    'phToastFade 2.5s ease forwards',
          fontFamily:   'var(--font-body)',
        }}>
          {toast.message}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
