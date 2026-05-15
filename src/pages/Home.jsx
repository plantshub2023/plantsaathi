import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStorage } from '../hooks/useStorage.js'
import BottomNav from '../components/BottomNav.jsx'

// ─── Category grids ──────────────────────────────────────────────────────────

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
  { slug: 'foliage',         emoji: '🌿', label: 'Foliage'      },
  { slug: 'sun-loving',      emoji: '☀️', label: 'Sun Loving'   },
]

const TRENDING = [
  { slug: 'gift',        emoji: '🎁', label: 'Gift Plants'         },
  { slug: 'office-desk', emoji: '💼', label: 'Office Desk Plants'  },
]

// ─── Page ───────────────────────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate()
  const { getUser, getWishlist } = useStorage()
  const user     = getUser()
  const wishlist = getWishlist()

  const [searchQuery, setSearchQuery] = useState('')

  function goToSearch() {
    const q = searchQuery.trim()
    navigate(q ? `/catalogue/search?q=${encodeURIComponent(q)}` : '/catalogue/search')
  }

  function goToCategory(filterType, slug) {
    navigate(`/catalogue/${filterType}/${slug}`)
  }

  // ─── Styles ──────────────────────────────────────────────────────────────

  const sectionTitle = {
    fontSize:      '14px',
    fontWeight:    700,
    color:         '#1a1a1a',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding:       '0 16px',
    marginTop:     '20px',
    marginBottom:  '12px',
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
  }

  const categoryLabel = {
    fontSize:   '12px',
    fontWeight: 600,
    color:      '#1a1a1a',
  }

  return (
    <div style={{
      minHeight:     '100svh',
      background:    '#f0ede6',
      fontFamily:    'var(--font-body)',
      color:         'var(--text)',
      paddingBottom: '88px',
    }}>
      <style>{`
        .home-wishlist-scroll::-webkit-scrollbar { display: none; }
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
            marginTop:      '4px',
            marginBottom:   '8px',
          }}>
            <div style={{
              fontSize:   '15px',
              fontWeight: 600,
              color:      '#1a1a1a',
            }}>
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
            className="home-wishlist-scroll"
            style={{
              padding:        '0 16px 16px',
              display:        'flex',
              gap:            '10px',
              overflowX:      'auto',
              scrollbarWidth: 'none',
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

      {/* Plants by Location */}
      <div style={sectionTitle}>📍 Plants by Location</div>
      <div style={grid3}>
        {LOCATIONS.map(c => (
          <button
            key={c.slug}
            className="home-cat-card"
            onClick={() => goToCategory('location', c.slug)}
            style={categoryCard}
          >
            <span style={categoryEmoji}>{c.emoji}</span>
            <span style={categoryLabel}>{c.label}</span>
          </button>
        ))}
        {/* empty 9th cell */}
        <div />
      </div>

      {/* Plants by Type */}
      <div style={sectionTitle}>🌱 Plants by Type</div>
      <div style={grid3}>
        {TYPES.map(c => (
          <button
            key={c.slug}
            className="home-cat-card"
            onClick={() => goToCategory('type', c.slug)}
            style={categoryCard}
          >
            <span style={categoryEmoji}>{c.emoji}</span>
            <span style={categoryLabel}>{c.label}</span>
          </button>
        ))}
      </div>

      {/* Trending */}
      <div style={sectionTitle}>🛍️ Trending</div>
      <div style={grid2}>
        {TRENDING.map(c => (
          <button
            key={c.slug}
            className="home-cat-card"
            onClick={() => goToCategory('trending', c.slug)}
            style={categoryCard}
          >
            <span style={categoryEmoji}>{c.emoji}</span>
            <span style={categoryLabel}>{c.label}</span>
          </button>
        ))}
      </div>

      {/* Phase 2 placeholder */}
      <div style={{
        position:     'relative',
        margin:       '20px 16px',
        padding:      '20px',
        borderRadius: '16px',
        background:   'linear-gradient(135deg, #1D9E75 0%, #2ECC71 100%)',
        color:        '#fff',
      }}>
        <span style={{
          position:     'absolute',
          top:          '12px',
          right:        '12px',
          background:   'rgba(255,255,255,0.2)',
          padding:      '2px 8px',
          borderRadius: '10px',
          fontSize:     '10px',
          fontWeight:   600,
        }}>
          Phase 2
        </span>
        <div style={{ fontSize: '32px', marginBottom: '8px', lineHeight: 1 }}>🔮</div>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>
          Find Plants for My Space
        </div>
        <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px', lineHeight: 1.5 }}>
          Coming soon — AI will suggest plants based on your space, light & maintenance needs
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
