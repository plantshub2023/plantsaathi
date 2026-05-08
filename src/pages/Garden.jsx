import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Droplet, SprayCan, Sprout, RotateCw, Scissors, Flower2, Check } from 'lucide-react'
import { useStorage } from '../hooks/useStorage.js'
import { daysSince, isReminderDue, getDueReminders, REMINDER_TYPES } from '../utils/reminders.js'
import BottomNav from '../components/BottomNav.jsx'
import CareCalendar from '../components/CareCalendar.jsx'
import AddLocationSheet from '../components/AddLocationSheet.jsx'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function getHealthStatus(plant) {
  const watering = plant.reminders?.watering
  if (!watering) return 'green'
  const d = daysSince(watering.lastCompleted)
  if (d < watering.frequencyDays)  return 'green'
  if (d === watering.frequencyDays) return 'amber'
  return 'red'
}

const HEALTH_COLORS = {
  green: '#1D9E75',
  amber: '#F59E0B',
  red:   '#EF4444',
}

const CATEGORY_BG = {
  tropical:  '#D4EDE2',
  flowering: '#FDE8F0',
  succulent: '#FEF3E2',
  herbs:     '#DCFCE7',
  indoor:    '#DBEAFE',
  fruit:     '#FEF9C3',
  trees:     '#ECFCCB',
}

const PILL_ICONS = {
  watering:    Droplet,
  misting:     SprayCan,
  fertilizing: Sprout,
  rotating:    RotateCw,
  pruning:     Scissors,
  repotting:   Flower2,
}

function getSeasonalTip(month, zoneCode) {
  const isHills   = ['Z1','Z2','Z3','Z4','Z6'].includes(zoneCode)
  const isArid    = ['Z8','Z17'].includes(zoneCode)
  const isCoastal = ['Z11','Z14'].includes(zoneCode)

  // Summer — March to May
  if (month >= 2 && month <= 4) {
    if (isHills)   return 'Perfect spring in your hills! Great time to sow new seeds and add a dose of fertilizer.'
    if (isArid)    return 'Peak summer ahead. Mulch pots heavily, water only at dawn, and move plants to partial shade.'
    return 'Summer heat is building — water in the early morning, mulch pots, and check leaves for sun scorch.'
  }
  // Monsoon — June to September
  if (month >= 5 && month <= 8) {
    if (isCoastal) return 'Coastal monsoon is intense! Check drainage holes daily and watch for fungal leaf infections.'
    if (isArid)    return 'Monsoon relief is here! Let rain do the work but ensure every pot drains freely.'
    return 'Monsoon season — reduce watering, improve drainage, and watch for fungal spots on your leaves.'
  }
  // Post-monsoon — October to November
  if (month >= 9 && month <= 10) {
    return 'The best growing season in India! Repot if needed, top up with compost, and enjoy cooler planting days.'
  }
  // Winter — December to February
  if (isHills) return 'Cold winter ahead — protect frost-sensitive plants with covers or move them closer to walls.'
  return 'Cool winter months — reduce watering, skip fertiliser, and plant marigolds or petunias for colour.'
}

const WEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY

const ROOM_FILTERS = ['All', 'Indoor', 'Outdoor', 'Balcony', 'Office', 'Bedroom', 'Living Room']

// ─── Component ───────────────────────────────────────────────────────────────

export default function Garden() {
  const navigate                         = useNavigate()
  const { getUser, getPlants, markReminder, getLocations, addLocation, updateLocation, deleteLocation } = useStorage()

  const [, setTick]           = useState(0)
  const [checkmarks, setCheckmarks]           = useState({})  // keyed "plantId:type"
  const [calendarOpen, setCalendarOpen]       = useState(false)
  const [weather, setWeather]                 = useState(null)
  const [activeRoom, setActiveRoom]           = useState('All')
  const [, setLocTick]                        = useState(0)   // bump to re-read locations
  const [activeLocationId, setActiveLocationId] = useState('all')
  const [locationSheet, setLocationSheet]     = useState(null) // null | 'add' | location obj
  const [pendingDeleteId, setPendingDeleteId] = useState(null) // long-press target
  const longPressTimer                        = useRef(null)

  const user   = getUser()
  const plants = getPlants()

  useEffect(() => {
    if (!user) navigate('/onboarding', { replace: true })
  }, [])

  useEffect(() => {
    if (user?.lat && user?.lon) {
      fetchWeather(user.lat, user.lon)
    }
  }, [])

  async function fetchWeather(lat, lon) {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`
      )
      const data = await res.json()
      setWeather({
        temp:        Math.round(data.main.temp),
        humidity:    data.main.humidity,
        description: data.weather[0].description,
        city:        data.name,
      })
    } catch {
      // silently skip — widget just won't show
    }
  }

  function handleMarkPill(plantId, type, e) {
    e.stopPropagation()
    const key = `${plantId}:${type}`
    setCheckmarks(prev => ({ ...prev, [key]: true }))
    markReminder(plantId, type)
    setTimeout(() => {
      setCheckmarks(prev => { const next = { ...prev }; delete next[key]; return next })
      setTick(t => t + 1)
    }, 600)
  }

  if (!user) return null

  const month        = new Date().getMonth()
  const needsWater   = plants.filter(p => isReminderDue(p.reminders?.watering)).length
  const refDate = user.joinedDate
    || plants.reduce((earliest, p) => {
        if (!p.addedDate) return earliest
        return !earliest || p.addedDate < earliest ? p.addedDate : earliest
      }, null)
  const daysJoined = refDate
    ? Math.max(1, Math.floor((Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 0
  const locations      = getLocations()
  const seasonalTip    = getSeasonalTip(month, user.zone || 'Z16')
  const greeting       = getGreeting()
  const filteredPlants = plants
    .filter(p => activeRoom === 'All'   || p.room       === activeRoom)
    .filter(p => activeLocationId === 'all' || p.locationId === activeLocationId)

  // ─── Styles ──────────────────────────────────────────────────────────────────

  const page = {
    minHeight:   '100svh',
    background:  '#f0ede6',
    fontFamily:  'var(--font-body)',
    color:       'var(--text)',
    paddingBottom: '88px',
  }

  const card = {
    background:   'var(--cream)',
    borderRadius: 'var(--radius)',
    margin:       '0 16px 12px',
    padding:      '20px',
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={page}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ ...card, marginTop: '16px' }}>
        <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 6px' }}>
          {greeting} 👋
        </p>
        <h1 style={{
          fontFamily:   'var(--font-display)',
          fontWeight:   500,
          fontSize:     '26px',
          lineHeight:   1.2,
          margin:       '0 0 14px',
          color:        'var(--text)',
        }}>
          <em style={{ fontStyle: 'italic' }}>{user.name}</em>'s garden
        </h1>
        {user.zone && (
          <div style={{
            display:      'inline-flex',
            alignItems:   'center',
            gap:          '6px',
            padding:      '5px 14px',
            background:   'var(--green-light)',
            color:        'var(--green-dark)',
            borderRadius: '100px',
            fontSize:     '12px',
            fontWeight:   500,
          }}>
            🌍 {user.zone} · {user.zoneName}
          </div>
        )}

        {weather && (
          <div style={{
            display:        'flex',
            alignItems:     'center',
            gap:            '14px',
            marginTop:      '14px',
            padding:        '12px 16px',
            background:     'var(--green-light)',
            borderRadius:   '12px',
          }}>
            <div style={{ fontSize: '26px', lineHeight: 1 }}>
              {weather.temp >= 35 ? '🌡️' : weather.temp >= 25 ? '☀️' : weather.temp >= 15 ? '⛅' : '🌨️'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize:   '13px',
                fontWeight: 600,
                color:      'var(--green-dark)',
                marginBottom: '2px',
              }}>
                {weather.temp}°C &nbsp;·&nbsp; 💧 {weather.humidity}%
              </div>
              <div style={{
                fontSize:    '12px',
                color:       'var(--green-dark)',
                opacity:     0.8,
                textTransform: 'capitalize',
              }}>
                {weather.description}{weather.city ? ` · ${weather.city}` : ''}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Today strip ───────────────────────────────────────────────────── */}
      <div style={{
        display:               'grid',
        gridTemplateColumns:   '1fr 1fr 1fr',
        gap:                   '8px',
        margin:                '0 16px 12px',
      }}>
        {[
          {
            emoji: '💧',
            value: needsWater,
            label: needsWater === 1 ? 'needs water' : 'need water',
            alert: needsWater > 0,
          },
          {
            emoji: '🌱',
            value: plants.length,
            label: plants.length === 1 ? 'plant' : 'plants',
            alert: false,
          },
          {
            emoji:   '📅',
            value:   daysJoined,
            label:   daysJoined === 1 ? 'day together' : 'days together',
            alert:   false,
            onClick: () => setCalendarOpen(true),
          },
        ].map(stat => (
          <div key={stat.label} onClick={stat.onClick} style={{
            background:   stat.alert ? '#FFF5E6' : 'var(--cream)',
            borderRadius: 'var(--radius)',
            padding:      '14px 10px',
            textAlign:    'center',
            cursor:       stat.onClick ? 'pointer' : 'default',
          }}>
            <div style={{ fontSize: '20px', marginBottom: '6px', lineHeight: 1 }}>
              {stat.emoji}
            </div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              fontSize:   '24px',
              lineHeight: 1,
              color:      stat.alert ? '#D97706' : 'var(--text)',
              marginBottom: '5px',
            }}>
              {stat.value}
            </div>
            <div style={{
              fontSize:   '11px',
              color:      'var(--muted)',
              lineHeight: 1.3,
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Seasonal banner ───────────────────────────────────────────────── */}
      <div style={{
        margin:       '0 16px 12px',
        padding:      '16px 18px',
        background:   'var(--green)',
        borderRadius: 'var(--radius)',
        color:        '#fff',
      }}>
        <p style={{
          fontSize:     '11px',
          fontWeight:   600,
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          margin:       '0 0 5px',
          opacity:      0.75,
        }}>
          Seasonal tip
        </p>
        <p style={{
          fontSize:   '14px',
          margin:     0,
          lineHeight: 1.55,
        }}>
          {seasonalTip}
        </p>
      </div>

      {/* ── My Locations ──────────────────────────────────────────────────── */}
      <div style={{ margin: '0 16px 12px' }}>
        <h2 style={{
          fontFamily:  'var(--font-display)',
          fontWeight:  500,
          fontSize:    '20px',
          margin:      '0 0 12px',
          color:       'var(--text)',
        }}>
          My Locations
        </h2>

        <div style={{
          display:                 'flex',
          gap:                     '10px',
          overflowX:               'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth:          'none',
          msOverflowStyle:         'none',
          paddingBottom:           '4px',
        }}>

          {/* All card */}
          {(() => {
            const active = activeLocationId === 'all'
            return (
              <div
                onClick={() => { setActiveLocationId('all'); setPendingDeleteId(null) }}
                style={{
                  flexShrink:   0,
                  width:        '80px',
                  padding:      '12px 8px',
                  borderRadius: '14px',
                  background:   active ? 'var(--green)' : 'var(--cream)',
                  border:       `1.5px solid ${active ? 'var(--green)' : 'var(--border)'}`,
                  display:      'flex',
                  flexDirection: 'column',
                  alignItems:   'center',
                  gap:          '6px',
                  cursor:       'pointer',
                  transition:   'all 0.15s',
                }}
              >
                <span style={{ fontSize: '24px', lineHeight: 1 }}>🌱</span>
                <span style={{
                  fontSize:   '11px',
                  fontWeight: active ? 600 : 400,
                  color:      active ? '#fff' : 'var(--text)',
                  fontFamily: 'var(--font-body)',
                  textAlign:  'center',
                  lineHeight: 1.2,
                }}>
                  All
                </span>
              </div>
            )
          })()}

          {/* Location cards */}
          {locations.map(loc => {
            const active    = activeLocationId === loc.id
            const delTarget = pendingDeleteId === loc.id
            return (
              <div
                key={loc.id}
                style={{ flexShrink: 0, position: 'relative' }}
                onPointerDown={() => {
                  longPressTimer.current = setTimeout(() => setPendingDeleteId(loc.id), 600)
                }}
                onPointerUp={() => clearTimeout(longPressTimer.current)}
                onPointerLeave={() => clearTimeout(longPressTimer.current)}
              >
                <div
                  onClick={() => {
                    if (delTarget) { setPendingDeleteId(null); return }
                    setActiveLocationId(loc.id)
                  }}
                  style={{
                    width:        '80px',
                    padding:      '12px 8px',
                    borderRadius: '14px',
                    background:   delTarget ? '#FEE2E2' : active ? 'var(--green)' : 'var(--cream)',
                    border:       `1.5px solid ${delTarget ? '#DC2626' : active ? 'var(--green)' : 'var(--border)'}`,
                    display:      'flex',
                    flexDirection: 'column',
                    alignItems:   'center',
                    gap:          '6px',
                    cursor:       'pointer',
                    transition:   'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: '24px', lineHeight: 1 }}>{loc.icon}</span>
                  <span style={{
                    fontSize:     '11px',
                    fontWeight:   active ? 600 : 400,
                    color:        delTarget ? '#DC2626' : active ? '#fff' : 'var(--text)',
                    fontFamily:   'var(--font-body)',
                    textAlign:    'center',
                    lineHeight:   1.2,
                    whiteSpace:   'nowrap',
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth:     '64px',
                  }}>
                    {delTarget ? 'Delete?' : loc.name}
                  </span>
                </div>

                {/* Confirm delete (long-press activated) */}
                {delTarget && (
                  <div style={{
                    position:   'absolute',
                    top:        '-8px',
                    right:      '-8px',
                    display:    'flex',
                    gap:        '4px',
                    zIndex:     2,
                  }}>
                    <button
                      onClick={e => { e.stopPropagation(); deleteLocation(loc.id); setPendingDeleteId(null); if (activeLocationId === loc.id) setActiveLocationId('all'); setLocTick(t => t + 1) }}
                      style={{
                        width: '22px', height: '22px', borderRadius: '50%',
                        background: '#DC2626', color: '#fff', border: 'none',
                        fontSize: '13px', cursor: 'pointer', lineHeight: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-body)',
                      }}
                    >✕</button>
                  </div>
                )}

                {/* Edit pencil */}
                {!delTarget && (
                  <button
                    onClick={e => { e.stopPropagation(); setLocationSheet(loc) }}
                    style={{
                      position: 'absolute', top: '-6px', right: '-6px',
                      width: '20px', height: '20px', borderRadius: '50%',
                      background: '#fff', border: '1px solid var(--border)',
                      fontSize: '10px', cursor: 'pointer', lineHeight: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 0,
                    }}
                    aria-label={`Edit ${loc.name}`}
                  >
                    ✏️
                  </button>
                )}
              </div>
            )
          })}

          {/* Add location button */}
          <button
            onClick={() => setLocationSheet('add')}
            style={{
              flexShrink:   0,
              width:        '80px',
              padding:      '12px 8px',
              borderRadius: '14px',
              background:   'var(--cream)',
              border:       '1.5px dashed var(--border)',
              display:      'flex',
              flexDirection: 'column',
              alignItems:   'center',
              gap:          '6px',
              cursor:       'pointer',
              color:        'var(--muted)',
              fontFamily:   'var(--font-body)',
            }}
          >
            <span style={{ fontSize: '24px', lineHeight: 1, color: 'var(--green)' }}>＋</span>
            <span style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.2 }}>
              Add
            </span>
          </button>
        </div>
      </div>

      {/* ── Plant grid ────────────────────────────────────────────────────── */}
      <div style={{ margin: '0 16px' }}>

        {/* Section header */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   '12px',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize:   '20px',
            margin:     0,
            color:      'var(--text)',
          }}>
            My plants
          </h2>
          <button
            onClick={() => navigate('/add-plant')}
            style={{
              width:      '36px',
              height:     '36px',
              borderRadius: '50%',
              background: 'var(--green)',
              color:      '#fff',
              border:     'none',
              fontSize:   '24px',
              lineHeight: 1,
              cursor:     'pointer',
              display:    'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-body)',
              flexShrink: 0,
            }}
          >
            +
          </button>
        </div>

        {/* ── Room filter tabs ──────────────────────────────────────────────── */}
        {plants.length > 0 && (
          <div style={{
            display:                 'flex',
            gap:                     '8px',
            overflowX:               'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth:          'none',
            msOverflowStyle:         'none',
            paddingBottom:           '2px',
            marginBottom:            '12px',
          }}>
            {ROOM_FILTERS.map(r => {
              const active = activeRoom === r
              return (
                <button
                  key={r}
                  onClick={() => setActiveRoom(r)}
                  style={{
                    flexShrink:   0,
                    padding:      '6px 14px',
                    fontSize:     '13px',
                    fontWeight:   active ? 600 : 400,
                    fontFamily:   'var(--font-body)',
                    whiteSpace:   'nowrap',
                    border:       `1.5px solid ${active ? 'var(--green)' : 'var(--border)'}`,
                    borderRadius: '99px',
                    background:   active ? 'var(--green)' : 'var(--cream)',
                    color:        active ? '#fff' : 'var(--text)',
                    cursor:       'pointer',
                    transition:   'background 0.15s, color 0.15s, border-color 0.15s',
                  }}
                >
                  {r}
                </button>
              )
            })}
          </div>
        )}

        {plants.length === 0 ? (

          /* ── Empty state ──────────────────────────────────────────────── */
          <div style={{
            background:   'var(--cream)',
            borderRadius: 'var(--radius)',
            padding:      '48px 24px',
            textAlign:    'center',
          }}>
            <div style={{ fontSize: '52px', marginBottom: '16px' }}>🪴</div>
            <p style={{
              fontFamily:   'var(--font-display)',
              fontWeight:   500,
              fontSize:     '19px',
              color:        'var(--text)',
              margin:       '0 0 8px',
            }}>
              Your garden is empty
            </p>
            <p style={{
              fontSize:   '14px',
              color:      'var(--muted)',
              margin:     '0 0 28px',
              lineHeight: 1.5,
            }}>
              Add your first plant to get started
            </p>
            <button
              onClick={() => navigate('/add-plant')}
              style={{
                padding:    '14px 32px',
                background: 'var(--green)',
                color:      '#fff',
                border:     'none',
                borderRadius: 'var(--radius)',
                fontSize:   '15px',
                fontWeight: 500,
                fontFamily: 'var(--font-body)',
                cursor:     'pointer',
              }}
            >
              Add a plant
            </button>
          </div>

        ) : filteredPlants.length === 0 ? (

          /* ── Filtered empty state ─────────────────────────────────────── */
          <div style={{
            background:   'var(--cream)',
            borderRadius: 'var(--radius)',
            padding:      '36px 24px',
            textAlign:    'center',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
            <p style={{
              fontSize:   '15px',
              fontWeight: 500,
              color:      'var(--text)',
              margin:     '0 0 6px',
            }}>
              No plants in {activeRoom}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
              Add a room when adding a new plant
            </p>
          </div>

        ) : (

          /* ── 2-col grid ───────────────────────────────────────────────── */
          <div style={{
            display:             'grid',
            gridTemplateColumns: '1fr 1fr',
            gap:                 '12px',
          }}>
            {filteredPlants.map(plant => {
              const status        = getHealthStatus(plant)
              const lastCompleted = plant.reminders?.watering?.lastCompleted
              const daysAgo       = lastCompleted ? daysSince(lastCompleted) : null
              const bg            = CATEGORY_BG[plant.category] || CATEGORY_BG.tropical

              const waterLabel =
                daysAgo === null ? 'Not watered yet' :
                daysAgo === 0    ? 'Watered today'   :
                daysAgo === 1    ? '1 day ago'       :
                `${daysAgo} days ago`

              const dueTypes = getDueReminders(plant)

              return (
                <div
                  key={plant.id}
                  onClick={() => navigate(`/care-tips/${plant.id}`)}
                  style={{
                    background:   'var(--cream)',
                    borderRadius: 'var(--radius)',
                    overflow:     'hidden',
                    cursor:       'pointer',
                    border:       '1px solid var(--border)',
                  }}
                >
                  {/* Photo or emoji placeholder */}
                  <div style={{
                    height:         '140px',
                    background:     plant.photo ? '#111' : bg,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    fontSize:       '44px',
                    overflow:       'hidden',
                    flexShrink:     0,
                  }}>
                    {plant.photo ? (
                      <img
                        src={plant.photo}
                        alt={plant.name}
                        style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      plant.emoji || '🌿'
                    )}
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '10px 12px 12px' }}>
                    <p style={{
                      fontWeight:     500,
                      fontSize:       '14px',
                      margin:         '0 0 4px',
                      color:          'var(--text)',
                      whiteSpace:     'nowrap',
                      overflow:       'hidden',
                      textOverflow:   'ellipsis',
                    }}>
                      {plant.name}
                    </p>
                    {(plant.room || plant.locationId) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '5px' }}>
                        {plant.locationId && (() => {
                          const loc = locations.find(l => l.id === plant.locationId)
                          return loc ? (
                            <span style={{
                              display:      'inline-block',
                              fontSize:     '10px',
                              fontWeight:   500,
                              color:        'var(--green-dark)',
                              background:   'var(--green-light)',
                              borderRadius: '99px',
                              padding:      '2px 8px',
                            }}>
                              {loc.icon} {loc.name}
                            </span>
                          ) : null
                        })()}
                        {plant.room && !plant.locationId && (
                          <span style={{
                            display:      'inline-block',
                            fontSize:     '10px',
                            fontWeight:   500,
                            color:        'var(--green-dark)',
                            background:   'var(--green-light)',
                            borderRadius: '99px',
                            padding:      '2px 8px',
                          }}>
                            {plant.room}
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'space-between',
                    }}>
                      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        {waterLabel}
                      </span>
                      <span style={{
                        width:        '8px',
                        height:       '8px',
                        borderRadius: '50%',
                        background:   HEALTH_COLORS[status],
                        flexShrink:   0,
                      }} />
                    </div>

                    {/* Due reminders */}
                    {dueTypes.length > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        <p style={{
                          fontSize:   '12px',
                          color:      '#1D9E75',
                          fontWeight: 500,
                          margin:     '0 0 6px',
                        }}>
                          {dueTypes.length === 1 ? '1 reminder due' : `${dueTypes.length} reminders due`}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {dueTypes.map(type => {
                            const Icon = PILL_ICONS[type]
                            const meta = REMINDER_TYPES[type]
                            const key  = `${plant.id}:${type}`
                            const done = !!checkmarks[key]
                            return (
                              <button
                                key={type}
                                onClick={e => handleMarkPill(plant.id, type, e)}
                                aria-label={`Mark ${meta.label} done`}
                                style={{
                                  display:        'flex',
                                  alignItems:     'center',
                                  justifyContent: 'center',
                                  width:          '28px',
                                  height:         '28px',
                                  background:     'rgba(29,158,117,0.12)',
                                  borderRadius:   '8px',
                                  border:         'none',
                                  cursor:         'pointer',
                                  padding:        0,
                                  flexShrink:     0,
                                }}
                              >
                                {done
                                  ? <Check size={14} color="#1D9E75" strokeWidth={2.5} />
                                  : <Icon  size={14} color="#1D9E75" strokeWidth={1.8} />
                                }
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav />

      {calendarOpen && (
        <CareCalendar
          plants={plants}
          onClose={() => setCalendarOpen(false)}
        />
      )}

      {locationSheet && (
        <AddLocationSheet
          existing={locationSheet === 'add' ? undefined : locationSheet}
          onClose={() => setLocationSheet(null)}
          onSave={data => {
            if (locationSheet === 'add') {
              addLocation(data)
            } else {
              updateLocation(locationSheet.id, data)
            }
            setLocationSheet(null)
            setLocTick(t => t + 1)
          }}
          onDelete={() => {
            if (locationSheet !== 'add') {
              deleteLocation(locationSheet.id)
              if (activeLocationId === locationSheet.id) setActiveLocationId('all')
            }
            setLocationSheet(null)
            setLocTick(t => t + 1)
          }}
        />
      )}
    </div>
  )
}
