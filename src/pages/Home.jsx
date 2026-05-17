import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStorage } from '../hooks/useStorage.js'
import BottomNav from '../components/BottomNav.jsx'
import { climateZones } from '../data/climateZones.js'
import { plantFamilies } from '../data/plantFamilies.js'
import usePageTitle from '../hooks/usePageTitle.js'

// ─── Static section data ────────────────────────────────────────────────────

// Codes shown first on Home — the nine most common Indian zones,
// rendered in climate order (Cold → Subtropical → Tropical) so the
// grid reads top-down from coolest to hottest. Remaining climates
// surface via "View all zones". "Your zone" highlighting is keyed
// off `user.zone` and works wherever the user's code lands in the list.
const TOP_CLIMATE_CODES = ['Z1', 'Z2', 'Z7', 'Z16', 'Z11', 'Z12', 'Z13', 'Z14', 'Z18']

const LOCATIONS = [
  { slug: 'indoor',      emoji: '🏠', label: 'Indoor'      },
  { slug: 'outdoor',     emoji: '🌿', label: 'Outdoor'     },
  { slug: 'balcony',     emoji: '🪴', label: 'Balcony'     },
  { slug: 'bedroom',     emoji: '🛏️', label: 'Bedroom'     },
  { slug: 'kitchen',     emoji: '🍳', label: 'Kitchen'     },
  { slug: 'living-room', emoji: '🛋️', label: 'Living Room' },
  { slug: 'office',      emoji: '💼', label: 'Office'      },
  { slug: 'office-desk', emoji: '🖥️', label: 'Desk'        },
]

const TYPES = [
  { slug: 'succulent',       emoji: '🌵', label: 'Succulents'   },
  { slug: 'flowering',       emoji: '🌸', label: 'Flowering'    },
  { slug: 'air-purifying',   emoji: '🌬️', label: 'Air Purifier' },
  { slug: 'low-maintenance', emoji: '💧', label: 'Low Care'     },
  { slug: 'bonsai',          emoji: '🌳', label: 'Bonsai'       },
  { slug: 'herbs',           emoji: '🌿', label: 'Herbs'        },
  { slug: 'fruit',           emoji: '🥭', label: 'Fruit'        },
  { slug: 'climber',         emoji: '🌴', label: 'Climbers'     },
  { slug: 'hanging',         emoji: '💐', label: 'Hanging'      },
]

const TRENDING = [
  { slug: 'gift',              emoji: '🎁', label: 'Gift Plants'  },
  { slug: 'office-desk-trend', emoji: '💼', label: 'Office Desk'  },
  { slug: 'new-arrival',       emoji: '🌟', label: 'New Arrivals' },
  { slug: 'premium',           emoji: '⭐', label: 'Premium'      },
  { slug: 'good-luck',         emoji: '🍀', label: 'Good Luck'    },
  { slug: 'aromatic',          emoji: '🌶️', label: 'Aromatic'     },
]

const VISIBLE_FAMILY_COUNT = 3

// ─── Shared style fragments ─────────────────────────────────────────────────

const sectionTitle = {
  fontSize:      '14px',
  fontWeight:    700,
  color:         '#1a1a1a',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  padding:       '0 16px',
  marginTop:     '20px',
  marginBottom:  '4px',
}

const sectionSubtitle = {
  fontSize:     '12px',
  color:        '#666',
  padding:      '0 16px',
  marginBottom: '12px',
}

const grid3 = {
  padding:             '0 16px',
  display:             'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap:                 '10px',
}

const grid2 = {
  padding:             '0 16px',
  display:             'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap:                 '10px',
}

const categoryCard = {
  background:   '#fff',
  borderRadius: '14px',
  padding:      '16px 10px',
  textAlign:    'center',
  cursor:       'pointer',
  boxShadow:    '0 2px 8px rgba(0,0,0,0.05)',
  transition:   'transform 0.2s',
  border:       'none',
  fontFamily:   'var(--font-body)',
}

const categoryEmoji = {
  fontSize:     '36px',
  display:      'block',
  marginBottom: '6px',
  lineHeight:   1,
  fontFamily:   '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif',
}

const categoryLabel = {
  fontSize:   '12px',
  fontWeight: 600,
  color:      '#1a1a1a',
}

const viewAllLink = {
  display:    'block',
  textAlign:  'right',
  padding:    '8px 16px 0',
  fontSize:   '12px',
  color:      '#1D9E75',
  background: 'none',
  border:     'none',
  cursor:     'pointer',
  width:      '100%',
  fontFamily: 'var(--font-body)',
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function Home() {
  usePageTitle('Home')
  const navigate = useNavigate()
  const { getUser, getWishlist, getFinderSession } = useStorage()
  const user           = getUser()
  const wishlist       = getWishlist()
  const finderSession  = getFinderSession()   // null if none, or { date, daysAgo, ... }

  const [searchQuery,  setSearchQuery]  = useState('')
  const [showAllZones, setShowAllZones] = useState(false)

  function goToSearch() {
    const q = searchQuery.trim()
    navigate(q ? `/catalogue/search?q=${encodeURIComponent(q)}` : '/catalogue/search')
  }

  // ─── Derived ─────────────────────────────────────────────────────────────

  const visibleZones = showAllZones
    ? climateZones
    : TOP_CLIMATE_CODES
        .map(code => climateZones.find(z => z.code === code))
        .filter(Boolean)

  const visibleFamilies = plantFamilies.slice(0, VISIBLE_FAMILY_COUNT)

  const userZoneCode = user?.zone || null

  return (
    <div style={{
      minHeight:     '100svh',
      background:    '#f0ede6',
      fontFamily:    'var(--font-body)',
      color:         'var(--text)',
      paddingBottom: '88px',
    }}>
      <style>{`
        .home-h-scroll::-webkit-scrollbar { display: none; }
        .home-cat-card:active { transform: scale(0.97); }
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
          onFocus={goToSearch}
          onKeyDown={(e) => { if (e.key === 'Enter') goToSearch() }}
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

      {/* Wishlist preview */}
      {wishlist.length > 0 && (
        <>
          <div style={{
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
            padding:        '0 16px',
            marginBottom:   '8px',
          }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#1a1a1a' }}>
              ❤️ My Wishlist ({wishlist.length})
            </div>
            <button
              onClick={() => navigate('/wishlist')}
              style={{
                background: 'none',
                border:     'none',
                fontSize:   '12px',
                color:      '#1D9E75',
                cursor:     'pointer',
                padding:    0,
                fontFamily: 'var(--font-body)',
              }}
            >
              View all →
            </button>
          </div>
          <div
            className="home-h-scroll"
            style={{
              padding:         '0 16px 16px',
              display:         'flex',
              gap:             '10px',
              overflowX:       'auto',
              scrollbarWidth:  'none',
              msOverflowStyle: 'none',
            }}
          >
            {wishlist.map(item => (
              <button
                key={item.id}
                onClick={() => navigate('/wishlist')}
                style={{
                  width:      '80px',
                  flexShrink: 0,
                  background: 'none',
                  border:     'none',
                  padding:    0,
                  cursor:     'pointer',
                  textAlign:  'left',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    style={{
                      width:        '80px',
                      height:       '80px',
                      borderRadius: '12px',
                      objectFit:    'cover',
                      display:      'block',
                    }}
                  />
                ) : (
                  <div style={{
                    width:          '80px',
                    height:         '80px',
                    borderRadius:   '12px',
                    background:     '#E8F5F0',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    fontSize:       '32px',
                  }}>{item.emoji}</div>
                )}
                <div style={{
                  fontSize:        '11px',
                  color:           '#555',
                  marginTop:       '4px',
                  lineHeight:      1.3,
                  display:         '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow:        'hidden',
                  textOverflow:    'ellipsis',
                }}>
                  {item.name}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Section 1 — Plants by Climate Zone */}
      <div style={sectionTitle}>🌍 Plants by Climate Zone</div>
      <div style={sectionSubtitle}>Find plants perfect for your weather</div>
      <div style={grid3}>
        {visibleZones.map(zone => {
          const isUserZone = userZoneCode === zone.code
          return (
            <button
              key={zone.code}
              className="home-cat-card"
              onClick={() => navigate(`/catalogue/climate/${zone.code}`)}
              style={{
                ...categoryCard,
                padding:  '14px 8px',
                position: 'relative',
                border:   isUserZone ? '2px solid #1D9E75' : '2px solid transparent',
              }}
            >
              {isUserZone && (
                <span style={{
                  position:     'absolute',
                  top:          '-7px',
                  right:        '6px',
                  background:   '#1D9E75',
                  color:        '#fff',
                  fontSize:     '9px',
                  fontWeight:   700,
                  padding:      '2px 6px',
                  borderRadius: '8px',
                  lineHeight:   1.2,
                  letterSpacing: '0.3px',
                }}>
                  Your zone
                </span>
              )}
              <span style={{ ...categoryEmoji, fontSize: '24px', marginBottom: '4px' }}>
                {zone.emoji}
              </span>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                {zone.code}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a', lineHeight: 1.2 }}>
                {zone.name}
              </div>
              <div style={{ fontSize: '10px', color: '#aaa', marginTop: '2px' }}>
                {zone.maxTemp}°C
              </div>
            </button>
          )
        })}
      </div>
      <button onClick={() => setShowAllZones(v => !v)} style={viewAllLink}>
        {showAllZones ? 'Show less ←' : 'View all zones →'}
      </button>

      {/* Section 2 — Plants by Name (family chips) */}
      <div style={sectionTitle}>🌱 Plants by Name</div>
      <div
        className="home-h-scroll"
        style={{
          padding:           '0 16px 8px',
          display:           'flex',
          gap:               '10px',
          overflowX:         'auto',
          scrollPaddingRight: '16px',
          scrollBehavior:    'smooth',
          scrollbarWidth:    'none',
          msOverflowStyle:   'none',
        }}
      >
        {visibleFamilies.map(f => (
          <button
            key={f.slug}
            onClick={() => navigate(`/catalogue/family/${f.slug}`)}
            style={{
              background:    '#fff',
              borderRadius:  '24px',
              padding:       '7px 12px',
              whiteSpace:    'nowrap',
              cursor:        'pointer',
              border:        '1.5px solid #E0E0E0',
              display:       'inline-flex',
              alignItems:    'center',
              gap:           '6px',
              flexShrink:    0,
              minWidth:      'fit-content',
              fontSize:      '13px',
              fontFamily:    'var(--font-body)',
            }}
          >
            <span style={{
              fontSize:   '16px',
              lineHeight: 1,
              fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif',
            }}>
              {f.emoji}
            </span>
            <span style={{ color: '#1a1a1a' }}>{f.name}</span>
            <span style={{ fontSize: '10px', color: '#888', opacity: 0.7 }}>({f.count})</span>
          </button>
        ))}
        {/* trailing spacer so last chip has breathing room */}
        <div style={{ width: '16px', flexShrink: 0 }} />
      </div>
      <button onClick={() => navigate('/plant-families')} style={viewAllLink}>
        View all plant families →
      </button>

      {/* Section 3 — Plants by Location */}
      <div style={sectionTitle}>📍 Plants by Location</div>
      <div style={grid3}>
        {LOCATIONS.map(c => (
          <button
            key={c.slug}
            className="home-cat-card"
            onClick={() => navigate(`/catalogue/location/${c.slug}`)}
            style={categoryCard}
          >
            <span style={categoryEmoji}>{c.emoji}</span>
            <span style={categoryLabel}>{c.label}</span>
          </button>
        ))}
        <div />
      </div>

      {/* Section 4 — Plants by Type */}
      <div style={sectionTitle}>🌿 Plants by Type</div>
      <div style={grid3}>
        {TYPES.map(c => (
          <button
            key={c.slug}
            className="home-cat-card"
            onClick={() => navigate(`/catalogue/type/${c.slug}`)}
            style={categoryCard}
          >
            <span style={categoryEmoji}>{c.emoji}</span>
            <span style={categoryLabel}>{c.label}</span>
          </button>
        ))}
      </div>

      {/* Section 5 — Trending */}
      <div style={sectionTitle}>🛍️ Trending</div>
      <div style={grid2}>
        {TRENDING.map(c => (
          <button
            key={c.slug}
            className="home-cat-card"
            onClick={() => navigate(`/catalogue/trending/${c.slug}`)}
            style={categoryCard}
          >
            <span style={categoryEmoji}>{c.emoji}</span>
            <span style={categoryLabel}>{c.label}</span>
          </button>
        ))}
      </div>

      {/* Section 6 — Smart finder entry point */}
      <button
        onClick={() => navigate('/find-plants')}
        style={{
          display:      'block',
          textAlign:    'left',
          width:        'calc(100% - 32px)',
          margin:       '20px 16px 0',
          padding:      '20px',
          borderRadius: '16px',
          background:   'linear-gradient(135deg, #1D9E75 0%, #2ECC71 100%)',
          color:        '#fff',
          border:       'none',
          cursor:       'pointer',
          fontFamily:   'var(--font-body)',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '8px', lineHeight: 1 }}>🔮</div>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>
          Find Plants for My Space
        </div>
        <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px', lineHeight: 1.5 }}>
          AI suggests plants based on your space and care preferences
        </div>
      </button>
      {finderSession && (
        <button
          onClick={() => navigate('/find-plants?session=last')}
          style={{
            display:      'inline-block',
            margin:       '8px 16px 0',
            padding:      '6px 14px',
            background:   '#fff',
            border:       '1.5px solid #1D9E75',
            color:        '#1D9E75',
            borderRadius: '20px',
            cursor:       'pointer',
            fontSize:     '12px',
            fontWeight:   600,
            fontFamily:   'var(--font-body)',
          }}
        >
          📋 View your last results →
          <span style={{ color: '#888', fontWeight: 400, marginLeft: '6px' }}>
            ({finderSession.daysAgo === 0 ? 'today' : `${finderSession.daysAgo}d ago`}
            {finderSession.count ? ` · ${finderSession.count} plants` : ''})
          </span>
        </button>
      )}

      <BottomNav />
    </div>
  )
}
