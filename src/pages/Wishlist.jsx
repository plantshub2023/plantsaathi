import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStorage } from '../hooks/useStorage.js'
import BottomNav from '../components/BottomNav.jsx'

// ─── Thumbnail with image-error fallback ────────────────────────────────────

function PlantThumbnail({ item }) {
  const [errored, setErrored] = useState(false)
  if (!item.image || errored) {
    return (
      <div style={{
        width:          '100%',
        height:         '100%',
        background:     '#E8F5F0',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       '48px',
      }}>{item.emoji}</div>
    )
  }
  return (
    <img
      src={item.image}
      alt={item.name}
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

// ─── Page ───────────────────────────────────────────────────────────────────

export default function Wishlist() {
  const navigate = useNavigate()
  const {
    getWishlist, removeFromWishlist, moveWishlistToGarden, getPlants,
  } = useStorage()

  const [items, setItems] = useState(() => getWishlist())
  const [toast, setToast] = useState(null)

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }

  function handleBuy(item) {
    if (item.url) window.open(item.url, '_blank')
  }

  function handleRemove(item) {
    removeFromWishlist(item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
    showToast(`💔 ${item.name} removed from wishlist`, 'error')
  }

  function handleMoveToGarden(item) {
    const plants = getPlants()
    const exists = plants.some(
      p => (p.name || '').toLowerCase() === item.name.toLowerCase()
    )
    if (exists) {
      showToast(`🌱 ${item.name} already in your garden!`, 'error')
      return
    }
    moveWishlistToGarden(item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
    showToast(`✅ ${item.name} moved to your garden!`, 'success')
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
        <div style={{
          fontFamily: '"DM Serif Display", serif',
          fontSize:   '18px',
          color:      '#fff',
        }}>
          ❤️ My Wishlist
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding:   '60px 20px',
        }}>
          <div style={{ fontSize: '64px', lineHeight: 1, marginBottom: '16px' }}>🤍</div>
          <div style={{ fontSize: '16px', color: '#555', marginBottom: '6px' }}>
            No plants in wishlist yet
          </div>
          <div style={{ fontSize: '13px', color: '#888' }}>
            Browse plants and tap ❤️ to save them here
          </div>
          <button
            onClick={() => navigate('/home')}
            style={{
              background:   '#1D9E75',
              color:        '#fff',
              borderRadius: '20px',
              padding:      '10px 24px',
              fontSize:     '13px',
              border:       'none',
              marginTop:    '16px',
              cursor:       'pointer',
              fontFamily:   'var(--font-body)',
            }}
          >
            Browse Plants
          </button>
        </div>
      ) : (
        /* Cards */
        <div style={{
          padding:             '16px',
          display:             'grid',
          gridTemplateColumns: '1fr 1fr',
          gap:                 '12px',
        }}>
          {items.map(item => (
            <div key={item.id} style={{
              background:   '#fff',
              borderRadius: '16px',
              overflow:     'hidden',
              boxShadow:    '0 2px 8px rgba(0,0,0,0.06)',
              position:     'relative',
            }}>
              <div style={{ height: '140px', position: 'relative', overflow: 'hidden' }}>
                <PlantThumbnail item={item} />
                <button
                  onClick={() => handleRemove(item)}
                  aria-label="Remove from wishlist"
                  style={{
                    position:       'absolute',
                    top:            '8px',
                    right:          '8px',
                    background:     'rgba(0,0,0,0.5)',
                    color:          '#fff',
                    width:          '24px',
                    height:         '24px',
                    borderRadius:   '12px',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    fontSize:       '14px',
                    border:         'none',
                    cursor:         'pointer',
                    padding:        0,
                    lineHeight:     1,
                    fontFamily:     'var(--font-body)',
                  }}
                >
                  ×
                </button>
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
                  {item.name}
                </div>

                <div style={{ marginTop: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#1D9E75' }}>
                    ₹{item.price}
                  </span>
                </div>

                <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleBuy(item)}
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
                  <button
                    onClick={() => handleMoveToGarden(item)}
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
                    ➕ Garden
                  </button>
                </div>
              </div>
            </div>
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
