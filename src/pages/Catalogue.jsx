import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useStorage } from '../hooks/useStorage.js'
import BottomNav from '../components/BottomNav.jsx'
import { plantshubCatalogue } from '../data/plantshubCatalogue.js'
import { getZone } from '../data/climateZones.js'
import { getFamily, familySlugToDataName } from '../data/plantFamilies.js'

// ─── Static title lookup (location/type/trending) ───────────────────────────
// Climate and family titles are derived from their data files at render time.

const TITLES = {
  location: {
    indoor:        '🏠 Indoor Plants',
    outdoor:       '🌿 Outdoor Plants',
    balcony:       '🪴 Balcony Plants',
    bedroom:       '🛏️ Bedroom Plants',
    kitchen:       '🍳 Kitchen Plants',
    'living-room': '🛋️ Living Room Plants',
    office:        '💼 Office Plants',
    'office-desk': '🖥️ Desk Plants',
  },
  type: {
    succulent:         '🌵 Succulents',
    flowering:         '🌸 Flowering Plants',
    'air-purifying':   '🌬️ Air Purifier Plants',
    'low-maintenance': '💧 Low Care Plants',
    bonsai:            '🌳 Bonsai',
    herbs:             '🌿 Herbs',
    fruit:             '🥭 Fruit Plants',
    climber:           '🌴 Climbers',
    hanging:           '💐 Hanging Plants',
  },
  trending: {
    gift:                '🎁 Gift Plants',
    'office-desk-trend': '💼 Office Desk Plants',
    'new-arrival':       '🌟 New Arrivals',
    premium:             '⭐ Premium Plants',
    'good-luck':         '🍀 Good Luck Plants',
    aromatic:            '🌶️ Aromatic Plants',
  },
}

function matchCategory(plant, filterType, slug) {
  if (filterType === 'location') return plant.locations.includes(slug)
  if (filterType === 'type')     return plant.types.includes(slug)
  if (filterType === 'trending') return plant.types.includes(slug)
  if (filterType === 'climate')  return Array.isArray(plant.climate) && plant.climate.includes(slug)
  if (filterType === 'family') {
    const target = familySlugToDataName(slug)
    return (plant.family || '').toLowerCase() === target
  }
  return true
}

function resolveTitle(filterType, slug) {
  if (filterType === 'climate') {
    const z = getZone(slug)
    return z ? `${z.emoji} ${z.name} Plants` : 'Plants'
  }
  if (filterType === 'family') {
    const f = getFamily(slug)
    return f ? `${f.emoji} ${f.name} Collection` : 'Plants'
  }
  return TITLES[filterType]?.[slug] || 'Plants'
}

// ─── Plant thumbnail with image-error fallback ──────────────────────────────

function PlantThumbnail({ plant }) {
  const [errored, setErrored] = useState(false)
  if (!plant.image || errored) {
    return (
      <div style={{
        width:          '100%',
        height:         '100%',
        background:     '#E8F5F0',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       '48px',
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
        width:     '100%',
        height:    '100%',
        objectFit: 'cover',
        display:   'block',
      }}
    />
  )
}

// ─── Plant card ─────────────────────────────────────────────────────────────

function PlantCard({ plant, isInWishlist, onBuy, onToggleWishlist }) {
  const heart = isInWishlist
  return (
    <div style={{
      background:   '#fff',
      borderRadius: '16px',
      overflow:     'hidden',
      boxShadow:    '0 2px 8px rgba(0,0,0,0.06)',
      position:     'relative',
    }}>
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

      <div style={{ padding: '10px' }}>
        <div style={{
          fontSize:        '13px',
          fontWeight:      600,
          color:           '#1a1a1a',
          lineHeight:      1.3,
          minHeight:       '34px',
          display:         '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow:        'hidden',
          textOverflow:    'ellipsis',
        }}>
          {plant.name}
        </div>

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

        <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
          <button
            onClick={() => onBuy(plant)}
            style={{
              flex:         3,
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
          <button
            onClick={() => onToggleWishlist(plant)}
            aria-label={heart ? 'Remove from wishlist' : 'Add to wishlist'}
            style={{
              width:        '36px',
              background:   heart ? '#FFF0F0' : '#fff',
              border:       `1.5px solid ${heart ? '#FF6B6B' : '#1D9E75'}`,
              borderRadius: '12px',
              fontSize:     '16px',
              cursor:       'pointer',
              padding:      0,
              fontFamily:   'var(--font-body)',
            }}
          >
            {heart ? '❤️' : '🤍'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function Catalogue() {
  const navigate = useNavigate()
  const params   = useParams()
  const [searchParams] = useSearchParams()
  const filterType = params.filterType                          // 'location' | 'type' | 'trending' | undefined (search)
  const slug       = params.slug
  const isSearchMode = !filterType
  const initialQ     = isSearchMode ? (searchParams.get('q') || '') : ''

  const { getWishlist, isInWishlist, addToWishlist, removeFromWishlist } = useStorage()

  const [searchQuery,  setSearchQuery]  = useState(initialQ)
  const [stockFilter,  setStockFilter]  = useState('all')       // 'all' | 'in-stock' | 'out-of-stock'
  const [toast,        setToast]        = useState(null)
  // Local wishlist mirror so heart state flips instantly without re-mounting.
  const [wishlistIds, setWishlistIds] = useState(() => new Set(getWishlist().map(i => i.id)))

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }

  const title = isSearchMode ? 'Search Results' : resolveTitle(filterType, slug)

  const filtered = useMemo(() => {
    let list = plantshubCatalogue
    if (!isSearchMode) {
      list = list.filter(p => matchCategory(p, filterType, slug))
    }
    const q = searchQuery.trim().toLowerCase()
    if (q) list = list.filter(p => p.name.toLowerCase().includes(q))
    if (stockFilter === 'in-stock')     list = list.filter(p => p.inStock)
    if (stockFilter === 'out-of-stock') list = list.filter(p => !p.inStock)
    // In-stock first, out-of-stock at the bottom. Stable sort preserves
    // catalogue order within each bucket.
    return [...list].sort((a, b) => Number(b.inStock) - Number(a.inStock))
  }, [filterType, slug, isSearchMode, searchQuery, stockFilter])

  function handleBuy(plant) {
    window.open(plant.url, '_blank')
  }

  function handleToggleWishlist(plant) {
    if (wishlistIds.has(plant.id)) {
      removeFromWishlist(plant.id)
      setWishlistIds(prev => {
        const next = new Set(prev); next.delete(plant.id); return next
      })
      showToast('💔 Removed from wishlist', 'error')
    } else {
      addToWishlist(plant)
      setWishlistIds(prev => new Set(prev).add(plant.id))
      showToast('❤️ Added to wishlist', 'success')
    }
  }

  const stockChips = [
    { key: 'all',          label: 'All' },
    { key: 'in-stock',     label: '✅ In Stock Only' },
    { key: 'out-of-stock', label: 'Out of Stock' },
  ]

  return (
    <div style={{
      minHeight:     '100svh',
      background:    '#f0ede6',
      fontFamily:    'var(--font-body)',
      color:         'var(--text)',
      paddingBottom: '88px',
    }}>
      <style>{`
        .cat-chip-scroll::-webkit-scrollbar { display: none; }
        @keyframes phToastFade {
          0%   { opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: '#1D9E75',
        padding:    '14px 16px',
        display:    'flex',
        alignItems: 'center',
        gap:        '12px',
      }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          style={{
            background: 'none',
            border:     'none',
            fontSize:   '22px',
            color:      '#fff',
            cursor:     'pointer',
            padding:    0,
            lineHeight: 1,
            fontFamily: 'var(--font-body)',
          }}
        >
          ←
        </button>
        <div>
          <div style={{
            fontFamily: '"DM Serif Display", serif',
            fontSize:   '18px',
            color:      '#fff',
            lineHeight: 1.1,
          }}>
            {title}
          </div>
          <div style={{
            fontSize:  '11px',
            color:     'rgba(255,255,255,0.85)',
            marginTop: '3px',
          }}>
            {filtered.length} {filtered.length === 1 ? 'plant' : 'plants'} found
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ margin: '12px 16px', position: 'relative' }}>
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
          autoFocus={isSearchMode}
          placeholder={isSearchMode
            ? 'Search plants... (Rose, Monstera, Cactus)'
            : 'Filter within this category...'}
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

      {/* Stock filter chips */}
      <div
        className="cat-chip-scroll"
        style={{
          padding:         '0 16px 12px',
          display:         'flex',
          gap:             '8px',
          overflowX:       'auto',
          scrollbarWidth:  'none',
          msOverflowStyle: 'none',
        }}
      >
        {stockChips.map(chip => {
          const active = stockFilter === chip.key
          return (
            <button
              key={chip.key}
              onClick={() => setStockFilter(chip.key)}
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
              {chip.label}
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding:   '40px 20px',
          fontSize:  '14px',
          color:     '#888',
        }}>
          🔍 No plants found
        </div>
      ) : (
        <div style={{
          padding:             '0 16px',
          display:             'grid',
          gridTemplateColumns: '1fr 1fr',
          gap:                 '12px',
        }}>
          {filtered.map(p => (
            <PlantCard
              key={p.id}
              plant={p}
              isInWishlist={wishlistIds.has(p.id)}
              onBuy={handleBuy}
              onToggleWishlist={handleToggleWishlist}
            />
          ))}
        </div>
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
