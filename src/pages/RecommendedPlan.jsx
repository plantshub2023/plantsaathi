import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStorage } from '../hooks/useStorage.js'
import usePageTitle from '../hooks/usePageTitle.js'
import { generateCarePlan, FREQUENCY_RANGES } from '../utils/carePlan.js'
import { REMINDER_TYPES } from '../utils/reminders.js'

// ─── Constants ────────────────────────────────────────────────────────────────

const REMINDER_ORDER = ['watering', 'misting', 'fertilizing', 'rotating', 'pruning', 'repotting']

const REMINDER_ICONS = {
  watering:    '💧',
  misting:     '💦',
  fertilizing: '🌱',
  rotating:    '🔄',
  pruning:     '✂️',
  repotting:   '🪴',
}

const EMPTY_SETUP_INFO = { soil: '', sunlight: '', temperature: '', humidity: '' }
const EMPTY_LOCATION_REC = { bestCategories: [], reason: '', warningIfIndoor: '' }

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecommendedPlan() {
  const { plantId } = useParams()
  const navigate    = useNavigate()
  const { getPlants, getUser, updatePlant } = useStorage()

  const [mode,                   setMode]                   = useState('loading') // loading | editing | saving | error
  const [errorMessage,           setErrorMessage]           = useState('')
  const [reminders,              setReminders]              = useState({})
  const [locationRecommendation, setLocationRecommendation] = useState(EMPTY_LOCATION_REC)
  const setupInfoRef              = useRef(EMPTY_SETUP_INFO)
  const locationRecommendationRef = useRef(EMPTY_LOCATION_REC)
  const soilMixRef                = useRef(null)
  const fertilizerScheduleRef     = useRef(null)

  // Read fresh from storage each render so we get the latest plant data
  const plants = getPlants()
  const plant  = plants.find(p => p.id === plantId)
  const user   = getUser()

  usePageTitle(plant?.name ? `Care Plan for ${plant.name}` : 'Care Plan')

  useEffect(() => {
    if (!plant) { navigate(-1); return }
    fetchPlan()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchPlan() {
    if (!plant) { navigate(-1); return }
    setMode('loading')
    setErrorMessage('')
    try {
      const result = await generateCarePlan({
        plantName:       plant.name,
        category:        plant.category,
        zone:            user?.zone,
        zoneName:        user?.zoneName,
        city:            user?.city,
        catalogWaterDays: typeof plant.waterDays === 'number' ? plant.waterDays : undefined,
      })
      setReminders(result.reminders)
      setupInfoRef.current = result.setupInfo ?? EMPTY_SETUP_INFO
      const loc = result.locationRecommendation ?? EMPTY_LOCATION_REC
      setLocationRecommendation(loc)
      locationRecommendationRef.current = loc
      soilMixRef.current            = result.soilMix            ?? null
      fertilizerScheduleRef.current = result.fertilizerSchedule ?? null
      setMode('editing')
    } catch (err) {
      setErrorMessage(err.message ?? 'Could not generate care plan. Please try again.')
      setMode('error')
    }
  }

  function toggleReminder(type) {
    setReminders(prev => ({
      ...prev,
      [type]: { ...prev[type], enabled: !prev[type].enabled },
    }))
  }

  function setFrequency(type, raw) {
    const range = FREQUENCY_RANGES[type]
    const days  = Math.min(range.max, Math.max(range.min, parseInt(raw, 10) || range.min))
    setReminders(prev => ({
      ...prev,
      [type]: { ...prev[type], frequencyDays: days },
    }))
  }

  function handleSave() {
    setMode('saving')
    // Build storage-ready reminders: drop 'reasoning', add lastCompleted: null
    const newReminders = {}
    for (const type of REMINDER_ORDER) {
      const r = reminders[type]
      if (!r) continue
      newReminders[type] = {
        enabled:       r.enabled,
        frequencyDays: r.frequencyDays,
        lastCompleted: null,
      }
    }
    updatePlant(plantId, {
      reminders:              newReminders,
      setupInfo:              setupInfoRef.current,
      locationRecommendation: locationRecommendationRef.current,
      careGuide:              {
        soilMix:            soilMixRef.current,
        fertilizerSchedule: fertilizerScheduleRef.current,
      },
    })
    navigate('/garden')
  }

  // ── Shared styles ─────────────────────────────────────────────────────────

  const page = {
    minHeight:     '100svh',
    background:    '#f0ede6',
    fontFamily:    'var(--font-body)',
    color:         'var(--text)',
    paddingBottom: '88px',
  }

  const centered = {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    minHeight:      '70vh',
    padding:        '32px 24px',
    textAlign:      'center',
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (mode === 'loading') return (
    <div style={page}>
      <div style={centered}>
        <div style={{ fontSize: '48px', marginBottom: '16px', lineHeight: 1 }}>🌿</div>
        <p style={{ fontSize: '15px', color: 'var(--muted)', margin: 0, fontWeight: 500 }}>
          Generating your plan…
        </p>
        <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '8px 0 0', lineHeight: 1.5 }}>
          Looking at your zone and current season
        </p>
      </div>
    </div>
  )

  // ── Error ─────────────────────────────────────────────────────────────────

  if (mode === 'error') return (
    <div style={page}>
      <div style={centered}>
        <div style={{
          background:   'var(--cream)',
          borderRadius: 'var(--radius)',
          padding:      '24px 20px',
          width:        '100%',
          maxWidth:     '320px',
          textAlign:    'left',
        }}>
          <p style={{
            fontSize:   '15px',
            fontWeight: 500,
            color:      'var(--text)',
            margin:     '0 0 8px',
          }}>
            ⚠️ Couldn't generate plan
          </p>
          <p style={{
            fontSize:   '13px',
            color:      'var(--muted)',
            margin:     '0 0 20px',
            lineHeight: 1.55,
          }}>
            {errorMessage}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={fetchPlan}
              style={{
                flex:         1,
                padding:      '12px',
                fontSize:     '14px',
                fontWeight:   500,
                fontFamily:   'var(--font-body)',
                background:   'var(--green)',
                color:        '#fff',
                border:       'none',
                borderRadius: 'var(--radius)',
                cursor:       'pointer',
              }}
            >
              Try again
            </button>
            <button
              onClick={() => navigate('/garden')}
              style={{
                flex:         1,
                padding:      '12px',
                fontSize:     '14px',
                fontWeight:   500,
                fontFamily:   'var(--font-body)',
                background:   '#fff',
                color:        'var(--text)',
                border:       '1.5px solid var(--border)',
                borderRadius: 'var(--radius)',
                cursor:       'pointer',
              }}
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Editing / Saving ──────────────────────────────────────────────────────

  return (
    <div style={page}>

      {/* ── Sticky top bar ────────────────────────────────────────────────── */}
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
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          fontSize:   '18px',
          margin:     0,
          color:      'var(--text)',
          flex:       1,
          overflow:   'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          Care Plan for {plant?.name}
        </h1>
      </div>

      <p style={{
        fontSize:   '13px',
        color:      'var(--muted)',
        margin:     '0 16px 16px',
        lineHeight: 1.5,
      }}>
        Review and adjust based on your space
      </p>

      {/* ── Reminder cards ────────────────────────────────────────────────── */}
      {REMINDER_ORDER.map(type => {
        const r     = reminders[type]
        if (!r) return null
        const meta    = REMINDER_TYPES[type]
        const icon    = REMINDER_ICONS[type]
        const range   = FREQUENCY_RANGES[type]
        const isLocked = type === 'watering' && typeof plant?.waterDays === 'number'

        return (
          <div
            key={type}
            style={{
              background:   '#fff',
              border:       '1.5px solid var(--border)',
              borderRadius: '14px',
              padding:      '16px',
              margin:       '0 16px 12px',
            }}
          >
            {/* Top row: icon + label + toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0 }}>
                {icon}
              </span>
              <span style={{
                flex:       1,
                fontSize:   '15px',
                fontWeight: 500,
                color:      'var(--text)',
                fontFamily: 'var(--font-body)',
              }}>
                {meta.label}
              </span>

              {/* Pill toggle */}
              <div
                role="switch"
                aria-checked={r.enabled}
                aria-label={`${meta.label} reminder`}
                onClick={() => toggleReminder(type)}
                style={{
                  width:        '36px',
                  height:       '20px',
                  borderRadius: '10px',
                  background:   r.enabled ? 'var(--green)' : 'var(--border)',
                  cursor:       'pointer',
                  position:     'relative',
                  transition:   'background 0.2s',
                  flexShrink:   0,
                }}
              >
                <div style={{
                  position:     'absolute',
                  top:          '2px',
                  left:         r.enabled ? '18px' : '2px',
                  width:        '16px',
                  height:       '16px',
                  borderRadius: '50%',
                  background:   '#fff',
                  transition:   'left 0.2s',
                  boxShadow:    '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </div>
            </div>

            {/* Expanded body (enabled only) */}
            {r.enabled && (
              <div style={{ marginTop: '14px' }}>

                {/* Frequency input row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Every</span>
                  <input
                    type="number"
                    value={r.frequencyDays}
                    min={range.min}
                    max={range.max}
                    disabled={isLocked}
                    onChange={e => setFrequency(type, e.target.value)}
                    style={{
                      width:        '60px',
                      textAlign:    'center',
                      padding:      '8px',
                      fontSize:     '15px',
                      fontWeight:   500,
                      fontFamily:   'var(--font-body)',
                      color:        isLocked ? 'var(--green-dark)' : 'var(--text)',
                      background:   isLocked ? 'var(--green-light)' : '#fff',
                      border:       '1.5px solid var(--border)',
                      borderRadius: '8px',
                      outline:      'none',
                      boxSizing:    'border-box',
                      cursor:       isLocked ? 'default' : 'text',
                    }}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--muted)' }}>days</span>
                  {isLocked && (
                    <span style={{
                      fontSize:     '10px',
                      fontWeight:   500,
                      fontFamily:   'var(--font-body)',
                      color:        'var(--green)',
                      background:   'var(--green-light)',
                      borderRadius: '4px',
                      padding:      '2px 6px',
                    }}>
                      🔒 Set by plant type
                    </span>
                  )}
                </div>

                {/* AI reasoning */}
                {r.reasoning && (
                  <p style={{
                    fontSize:   '12px',
                    fontStyle:  'italic',
                    color:      'var(--muted)',
                    margin:     '8px 0 0',
                    lineHeight: 1.55,
                  }}>
                    {r.reasoning}
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* ── Best Location card ────────────────────────────────────────────── */}
      <div style={{
        background:   '#fff',
        border:       '1.5px solid var(--border)',
        borderRadius: '14px',
        padding:      '16px',
        margin:       '0 16px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0 }}>📍</span>
          <span style={{
            fontSize:   '15px',
            fontWeight: 500,
            color:      'var(--text)',
            fontFamily: 'var(--font-body)',
          }}>
            Best Location
          </span>
        </div>

        {locationRecommendation.bestCategories.length > 0 ? (
          <>
            <div style={{
              display:  'flex',
              flexWrap: 'wrap',
              gap:      '6px',
              margin:   '8px 0 4px',
            }}>
              {locationRecommendation.bestCategories.map(cat => (
                <span key={cat} style={{
                  background:   'rgba(29,158,117,0.1)',
                  color:        'var(--green)',
                  borderRadius: '20px',
                  padding:      '4px 10px',
                  fontSize:     '12px',
                  fontWeight:   500,
                }}>
                  {cat}
                </span>
              ))}
            </div>
            {locationRecommendation.reason && (
              <p style={{
                fontSize:  '13px',
                fontStyle: 'italic',
                color:     'var(--muted)',
                margin:    '4px 0 0',
                lineHeight: 1.5,
              }}>
                {locationRecommendation.reason}
              </p>
            )}
            {locationRecommendation.warningIfIndoor && (
              <p style={{
                fontSize:   '12px',
                color:      '#E07B39',
                margin:     '6px 0 0',
                lineHeight: 1.5,
              }}>
                ⚠️ {locationRecommendation.warningIfIndoor}
              </p>
            )}
          </>
        ) : (
          <p style={{
            fontSize: '13px',
            color:    'var(--muted)',
            margin:   '8px 0 0',
          }}>
            🌿 Adaptable to most locations
          </p>
        )}
      </div>

      {/* ── Sticky bottom bar ─────────────────────────────────────────────── */}
      <div style={{
        position:   'fixed',
        bottom:     0,
        left:       '50%',
        transform:  'translateX(-50%)',
        width:      '100%',
        maxWidth:   '390px',
        padding:    '16px',
        background: '#f0ede6',
        borderTop:  '1px solid var(--border)',
        boxSizing:  'border-box',
        zIndex:     100,
      }}>
        <button
          onClick={handleSave}
          disabled={mode === 'saving'}
          style={{
            width:        '100%',
            padding:      '14px',
            fontSize:     '15px',
            fontWeight:   500,
            fontFamily:   'var(--font-body)',
            color:        '#fff',
            background:   'var(--green)',
            border:       'none',
            borderRadius: 'var(--radius)',
            cursor:       mode === 'saving' ? 'not-allowed' : 'pointer',
            opacity:      mode === 'saving' ? 0.7 : 1,
            transition:   'opacity 0.15s',
          }}
        >
          {mode === 'saving' ? 'Saving…' : 'Save Care Plan'}
        </button>
      </div>

    </div>
  )
}
