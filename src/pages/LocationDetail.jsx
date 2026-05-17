import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStorage } from '../hooks/useStorage.js'
import usePageTitle from '../hooks/usePageTitle.js'

export default function LocationDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { getLocations, getPlants, updatePlant, updateLocation, deleteLocation } = useStorage()

  const [, setTick]        = useState(0)
  const [nameFocused,   setNameFocused]   = useState(false)
  const [pickerOpen,    setPickerOpen]    = useState(false)
  const [pickerChecked, setPickerChecked] = useState(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Re-read from storage on every render (setTick forces re-read after writes)
  const locations = getLocations()
  const plants    = getPlants()
  const isAll     = id === 'all'
  const loc       = isAll
    ? { id: 'all', name: 'All', icon: '🌱' }
    : locations.find(l => l.id === id)

  usePageTitle(loc?.name || 'Location')

  // Name input: initialized once from storage on mount
  const [nameValue, setNameValue] = useState(() => loc?.name ?? '')

  // isAll: plants with no locationId are "in" the All card
  const assignedPlants   = isAll
    ? plants.filter(p => !p.locationId)
    : plants.filter(p => p.locationId === id)
  const unassignedPlants = plants.filter(p => p.locationId !== id)

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleNameBlur() {
    setNameFocused(false)
    const trimmed = nameValue.trim()
    if (!trimmed) {
      setNameValue(loc?.name ?? '')
      return
    }
    if (trimmed !== loc?.name) {
      updateLocation(id, { name: trimmed })
      setTick(t => t + 1)
    }
  }

  function handleUnassign(plantId) {
    updatePlant(plantId, { locationId: undefined })
    setTick(t => t + 1)
  }

  function openPicker() {
    setPickerChecked(new Set())
    setPickerOpen(true)
  }

  function togglePickerPlant(plantId) {
    setPickerChecked(prev => {
      const next = new Set(prev)
      if (next.has(plantId)) next.delete(plantId)
      else next.add(plantId)
      return next
    })
  }

  function handleAddToLocation() {
    pickerChecked.forEach(plantId => {
      updatePlant(plantId, { locationId: id })
    })
    setPickerOpen(false)
    setPickerChecked(new Set())
    setTick(t => t + 1)
  }

  function handleDeleteConfirm() {
    deleteLocation(id)
    navigate(-1)
  }

  // ── Shared thumbnail ─────────────────────────────────────────────────────────

  function thumb(plant) {
    return (
      <div style={{
        width:          '40px',
        height:         '40px',
        borderRadius:   '10px',
        overflow:       'hidden',
        flexShrink:     0,
        background:     'var(--green-light)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
      }}>
        {plant.photo
          ? <img src={plant.photo} alt={plant.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: '22px', lineHeight: 1 }}>{plant.emoji}</span>
        }
      </div>
    )
  }

  // ── Styles ───────────────────────────────────────────────────────────────────

  const sectionLabel = {
    display:       'block',
    fontSize:      '11px',
    fontWeight:    600,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    color:         'var(--muted)',
    margin:        '8px 16px 12px',
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight:     '100svh',
      background:    '#f0ede6',
      fontFamily:    'var(--font-body)',
      color:         'var(--text)',
      paddingBottom: '88px',
    }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        display:    'flex',
        alignItems: 'center',
        gap:        '12px',
        padding:    '16px 16px 12px',
        background: '#f0ede6',
      }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          style={{
            background: 'none',
            border:     'none',
            fontSize:   '24px',
            lineHeight: 1,
            cursor:     'pointer',
            color:      'var(--text)',
            padding:    '4px',
            flexShrink: 0,
          }}
        >
          ←
        </button>
        <span style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0 }}>
          {loc?.icon ?? '📍'}
        </span>
        {isAll ? (
          <span style={{
            flex:       1,
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize:   '22px',
            color:      'var(--text)',
            minWidth:   0,
          }}>
            All
          </span>
        ) : (
          <input
            type="text"
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onFocus={() => setNameFocused(true)}
            onBlur={handleNameBlur}
            style={{
              flex:         1,
              fontFamily:   'var(--font-display)',
              fontWeight:   500,
              fontSize:     '22px',
              color:        'var(--text)',
              border:       'none',
              borderBottom: nameFocused ? '1.5px solid var(--green)' : '1.5px solid transparent',
              background:   'transparent',
              outline:      'none',
              padding:      '2px 0',
              minWidth:     0,
            }}
          />
        )}
      </div>

      {/* ── Plants in this location ─────────────────────────────────────────── */}
      <p style={sectionLabel}>
        {isAll ? 'Plants with no location' : 'Plants in this location'}
      </p>

      {assignedPlants.length === 0 && (
        <p style={{
          fontSize:  '13px',
          color:     'var(--muted)',
          textAlign: 'center',
          padding:   '20px 16px',
          margin:    0,
        }}>
          {isAll
            ? 'All your plants have been assigned to a location'
            : 'No plants here yet — add some below'}
        </p>
      )}

      {assignedPlants.map(plant => (
        <div
          key={plant.id}
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          '12px',
            background:   'var(--cream)',
            borderRadius: '12px',
            padding:      '10px 12px',
            margin:       '0 16px 8px',
          }}
        >
          {thumb(plant)}
          <p style={{
            flex:         1,
            margin:       0,
            fontSize:     '15px',
            fontWeight:   500,
            color:        'var(--text)',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}>
            {plant.name}
          </p>
          {!isAll && (
            <button
              onClick={() => handleUnassign(plant.id)}
              aria-label={`Remove ${plant.name}`}
              style={{
                width:          '28px',
                height:         '28px',
                borderRadius:   '50%',
                border:         '1.5px solid var(--border)',
                background:     '#fff',
                fontSize:       '14px',
                color:          'var(--muted)',
                cursor:         'pointer',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                padding:        0,
                flexShrink:     0,
                fontFamily:     'var(--font-body)',
              }}
            >
              ✕
            </button>
          )}
        </div>
      ))}

      {/* ── + Add plants button ─────────────────────────────────────────────── */}
      {!isAll && !pickerOpen && (
        <button
          onClick={openPicker}
          style={{
            display:      'block',
            width:        'calc(100% - 32px)',
            background:   'transparent',
            color:        'var(--green)',
            border:       '1.5px dashed var(--green)',
            borderRadius: 'var(--radius)',
            padding:      '13px',
            fontSize:     '14px',
            fontWeight:   500,
            fontFamily:   'var(--font-body)',
            margin:       '0 16px 24px',
            cursor:       'pointer',
            textAlign:    'center',
            boxSizing:    'border-box',
          }}
        >
          + Add plants
        </button>
      )}

      {/* ── Inline picker ───────────────────────────────────────────────────── */}
      {!isAll && pickerOpen && (
        <>
          {/* Cancel link */}
          <div style={{ textAlign: 'right', padding: '4px 16px 8px' }}>
            <button
              onClick={() => { setPickerOpen(false); setPickerChecked(new Set()) }}
              style={{
                background: 'transparent',
                border:     'none',
                fontSize:   '13px',
                color:      'var(--muted)',
                cursor:     'pointer',
                fontFamily: 'var(--font-body)',
                padding:    0,
              }}
            >
              Cancel
            </button>
          </div>

          {unassignedPlants.length === 0 ? (
            <p style={{
              fontSize:  '13px',
              color:     'var(--muted)',
              textAlign: 'center',
              padding:   '20px 16px',
              margin:    0,
            }}>
              All plants are already in this location
            </p>
          ) : (
            unassignedPlants.map(plant => {
              const isChecked = pickerChecked.has(plant.id)
              const otherLoc  = plant.locationId
                ? locations.find(l => l.id === plant.locationId)
                : null

              return (
                <button
                  key={plant.id}
                  type="button"
                  onClick={() => togglePickerPlant(plant.id)}
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '12px',
                    width:        'calc(100% - 32px)',
                    background:   isChecked ? 'var(--green-light)' : 'var(--cream)',
                    borderRadius: '12px',
                    padding:      '10px 12px',
                    margin:       '0 16px 8px',
                    border:       `1.5px solid ${isChecked ? 'var(--green)' : 'transparent'}`,
                    cursor:       'pointer',
                    textAlign:    'left',
                    fontFamily:   'var(--font-body)',
                    boxSizing:    'border-box',
                  }}
                >
                  {thumb(plant)}

                  {/* Name + subtitle */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin:       0,
                      fontSize:     '15px',
                      fontWeight:   500,
                      color:        'var(--text)',
                      overflow:     'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace:   'nowrap',
                    }}>
                      {plant.name}
                    </p>
                    {otherLoc && (
                      <p style={{
                        margin:       '2px 0 0',
                        fontSize:     '12px',
                        color:        'var(--muted)',
                        overflow:     'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace:   'nowrap',
                      }}>
                        Currently in {otherLoc.name}
                      </p>
                    )}
                  </div>

                  {/* Checkbox circle */}
                  <div style={{
                    width:          '28px',
                    height:         '28px',
                    borderRadius:   '50%',
                    border:         `2px solid ${isChecked ? 'var(--green)' : 'var(--border)'}`,
                    background:     isChecked ? 'var(--green)' : '#fff',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    flexShrink:     0,
                    transition:     'all 0.15s',
                  }}>
                    {isChecked && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7L5.5 10L11.5 4" stroke="#fff" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </>
      )}

      {/* ── Delete this location ────────────────────────────────────────────── */}
      {!isAll && !pickerOpen && !confirmDelete && (
        <button
          onClick={() => setConfirmDelete(true)}
          style={{
            display:      'block',
            width:        'calc(100% - 32px)',
            padding:      '13px',
            fontSize:     '14px',
            fontWeight:   500,
            fontFamily:   'var(--font-body)',
            color:        '#DC2626',
            background:   'transparent',
            border:       '1.5px solid #DC2626',
            borderRadius: 'var(--radius)',
            margin:       '0 16px 24px',
            cursor:       'pointer',
            textAlign:    'center',
            boxSizing:    'border-box',
          }}
        >
          Delete this location
        </button>
      )}

      {/* ── Confirm delete ──────────────────────────────────────────────────── */}
      {!isAll && !pickerOpen && confirmDelete && (
        <div style={{
          margin:       '0 16px 24px',
          padding:      '14px 16px',
          background:   '#FEE2E2',
          borderRadius: 'var(--radius)',
          textAlign:    'center',
        }}>
          <p style={{
            fontSize:   '14px',
            fontWeight: 500,
            color:      '#DC2626',
            margin:     '0 0 12px',
            fontFamily: 'var(--font-body)',
          }}>
            Delete "{loc?.name}"? Plants in this location won't be deleted.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{
                flex:         1,
                padding:      '10px',
                fontSize:     '14px',
                fontFamily:   'var(--font-body)',
                background:   '#fff',
                border:       '1.5px solid var(--border)',
                borderRadius: '10px',
                cursor:       'pointer',
                color:        'var(--text)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              style={{
                flex:         1,
                padding:      '10px',
                fontSize:     '14px',
                fontWeight:   600,
                fontFamily:   'var(--font-body)',
                background:   '#DC2626',
                color:        '#fff',
                border:       'none',
                borderRadius: '10px',
                cursor:       'pointer',
              }}
            >
              Yes, delete
            </button>
          </div>
        </div>
      )}

      {/* ── Sticky bottom bar (picker mode) ─────────────────────────────────── */}
      {!isAll && pickerOpen && (
        <div style={{
          position:   'fixed',
          bottom:     0,
          left:       '50%',
          transform:  'translateX(-50%)',
          width:      '100%',
          maxWidth:   '390px',
          padding:    '16px 20px',
          background: 'var(--cream)',
          borderTop:  '1px solid var(--border)',
          boxSizing:  'border-box',
          zIndex:     100,
        }}>
          <button
            onClick={handleAddToLocation}
            disabled={pickerChecked.size === 0}
            style={{
              width:        '100%',
              padding:      '14px',
              fontSize:     '15px',
              fontWeight:   500,
              fontFamily:   'var(--font-body)',
              color:        '#fff',
              background:   pickerChecked.size > 0 ? 'var(--green)' : 'var(--border)',
              border:       'none',
              borderRadius: 'var(--radius)',
              cursor:       pickerChecked.size > 0 ? 'pointer' : 'not-allowed',
              transition:   'background 0.15s',
            }}
          >
            Add to this location
          </button>
        </div>
      )}

    </div>
  )
}
