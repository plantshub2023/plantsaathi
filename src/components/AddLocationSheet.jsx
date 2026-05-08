import { useState } from 'react'
import { createPortal } from 'react-dom'

// ─── Location categories ──────────────────────────────────────────────────────

export const LOCATION_CATEGORIES = [
  { id: 'living_room',    icon: '🏠', label: 'Living Room'        },
  { id: 'bedroom',        icon: '🛏️', label: 'Bedroom'             },
  { id: 'balcony',        icon: '🌿', label: 'Balcony'             },
  { id: 'potted_outdoor', icon: '🪴', label: 'Potted Outdoor'      },
  { id: 'outdoor',        icon: '🌳', label: 'Outdoor / On Ground' },
  { id: 'office',         icon: '💼', label: 'Office'              },
]

// ─── Component ────────────────────────────────────────────────────────────────

// Props:
//   onSave(data)       — called with { name, category, icon }
//   onDelete()         — called when user confirms deletion (edit mode only)
//   onClose()          — dismiss without saving
//   existing           — location object to pre-fill (edit mode); omit for add mode

export default function AddLocationSheet({ onSave, onDelete, onClose, existing }) {
  const [name,       setName]       = useState(existing?.name     ?? '')
  const [category,   setCategory]   = useState(existing?.category ?? '')
  const [nameFocused, setNameFocused] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const selectedCat = LOCATION_CATEGORIES.find(c => c.id === category)
  const canSave     = name.trim().length > 0 && category !== ''

  function handleCategoryPick(cat) {
    setCategory(cat.id)
    // Auto-fill name only if the field is still empty
    if (!name.trim()) setName(cat.label)
  }

  function handleSave() {
    if (!canSave) return
    onSave({ name: name.trim(), category, icon: selectedCat?.icon ?? '📍' })
  }

  // ── Shared style tokens ───────────────────────────────────────────────────

  const labelStyle = {
    display:       'block',
    fontSize:      '11px',
    fontWeight:    600,
    color:         'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    marginBottom:  '10px',
  }

  const inputStyle = {
    width:        '100%',
    padding:      '13px 16px',
    fontSize:     '16px',
    fontFamily:   'var(--font-body)',
    color:        'var(--text)',
    background:   '#fff',
    border:       `1.5px solid ${nameFocused ? 'var(--green)' : 'var(--border)'}`,
    borderRadius: '12px',
    outline:      'none',
    boxSizing:    'border-box',
    transition:   'border-color 0.2s',
    marginBottom: '20px',
  }

  const closeBtn = {
    width:          '32px',
    height:         '32px',
    borderRadius:   '50%',
    border:         '1.5px solid var(--border)',
    background:     '#fff',
    fontSize:       '18px',
    cursor:         'pointer',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    color:          'var(--text)',
    fontFamily:     'var(--font-body)',
    lineHeight:     1,
    padding:        0,
    flexShrink:     0,
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:   'fixed',
          top:        0,
          left:       0,
          width:      '100vw',
          height:     '100vh',
          background: 'rgba(0,0,0,0.45)',
          zIndex:     9999,
        }}
      />

      {/* Sheet */}
      <div style={{
        position:      'fixed',
        bottom:        0,
        left:          '50%',
        transform:     'translateX(-50%)',
        width:         '100%',
        maxWidth:      '390px',
        maxHeight:     '92vh',
        overflowY:     'auto',
        background:    'var(--cream)',
        borderRadius:  '20px 20px 0 0',
        zIndex:        10000,
        animation:     'slideUp 0.25s ease',
        padding:       '0 20px max(24px, env(safe-area-inset-bottom))',
      }}>

        {/* Header */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '20px 0 18px',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize:   '20px',
            margin:     0,
            color:      'var(--text)',
          }}>
            {existing ? 'Edit Location' : 'Add Location'}
          </h2>
          <button onClick={onClose} style={closeBtn} aria-label="Close">×</button>
        </div>

        {/* Category grid */}
        <p style={labelStyle}>Category</p>
        <div style={{
          display:             'grid',
          gridTemplateColumns: '1fr 1fr',
          gap:                 '8px',
          marginBottom:        '20px',
        }}>
          {LOCATION_CATEGORIES.map(cat => {
            const active = category === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryPick(cat)}
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  gap:            '10px',
                  padding:        '12px 14px',
                  background:     active ? 'var(--green-light)' : '#fff',
                  border:         `1.5px solid ${active ? 'var(--green)' : 'var(--border)'}`,
                  borderRadius:   '12px',
                  cursor:         'pointer',
                  fontFamily:     'var(--font-body)',
                  transition:     'all 0.15s',
                  textAlign:      'left',
                }}
              >
                <span style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0 }}>
                  {cat.icon}
                </span>
                <span style={{
                  fontSize:  '13px',
                  fontWeight: active ? 600 : 400,
                  color:     active ? 'var(--green-dark)' : 'var(--text)',
                  lineHeight: 1.3,
                }}>
                  {cat.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Name input */}
        <p style={labelStyle}>Name</p>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onFocus={() => setNameFocused(true)}
          onBlur={() => setNameFocused(false)}
          placeholder="e.g. Raj ka Balcony"
          style={inputStyle}
        />

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            width:        '100%',
            padding:      '15px',
            fontSize:     '16px',
            fontWeight:   500,
            fontFamily:   'var(--font-body)',
            color:        '#fff',
            background:   canSave ? 'var(--green)' : 'var(--border)',
            border:       'none',
            borderRadius: 'var(--radius)',
            cursor:       canSave ? 'pointer' : 'not-allowed',
            marginBottom: existing ? '12px' : '0',
            transition:   'background 0.15s',
          }}
        >
          {existing ? 'Save Changes' : 'Save Location'}
        </button>

        {/* Delete (edit mode only) */}
        {existing && !confirmDelete && (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              width:        '100%',
              padding:      '13px',
              fontSize:     '14px',
              fontWeight:   500,
              fontFamily:   'var(--font-body)',
              color:        '#DC2626',
              background:   'transparent',
              border:       '1.5px solid #DC2626',
              borderRadius: 'var(--radius)',
              cursor:       'pointer',
            }}
          >
            Delete this location
          </button>
        )}

        {/* Confirm delete */}
        {existing && confirmDelete && (
          <div style={{
            padding:      '14px 16px',
            background:   '#FEE2E2',
            borderRadius: 'var(--radius)',
            textAlign:    'center',
          }}>
            <p style={{
              fontSize:     '14px',
              fontWeight:   500,
              color:        '#DC2626',
              margin:       '0 0 12px',
              fontFamily:   'var(--font-body)',
            }}>
              Delete "{existing.name}"? Plants in this location won't be deleted.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  flex: 1, padding: '10px', fontSize: '14px', fontFamily: 'var(--font-body)',
                  background: '#fff', border: '1.5px solid var(--border)',
                  borderRadius: '10px', cursor: 'pointer', color: 'var(--text)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                style={{
                  flex: 1, padding: '10px', fontSize: '14px', fontWeight: 600,
                  fontFamily: 'var(--font-body)', background: '#DC2626', color: '#fff',
                  border: 'none', borderRadius: '10px', cursor: 'pointer',
                }}
              >
                Yes, delete
              </button>
            </div>
          </div>
        )}

      </div>
    </>,
    document.body
  )
}
