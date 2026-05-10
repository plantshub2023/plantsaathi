import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Droplet, SprayCan, Sprout, RotateCw, Scissors, Flower2, Check } from 'lucide-react'
import { useStorage } from '../hooks/useStorage.js'
import { daysSince, getDueReminders, REMINDER_TYPES } from '../utils/reminders.js'
import BottomNav from '../components/BottomNav.jsx'
import CareCalendar from '../components/CareCalendar.jsx'
import AddLocationSheet, { LOCATION_CATEGORIES } from '../components/AddLocationSheet.jsx'
import { calculateHealthScore } from '../utils/healthScore.js'

// Sub-text rendered below the status label on each Garden plant card,
// keyed by the status enum returned from calculateHealthScore.
const SCORE_SUBTEXT = {
  thriving:     'Great health!',
  'needs-care': 'Needs attention',
  unhealthy:    'Needs treatment',
}

// Donut geometry — r=13 with stroke-width=5 fits inside a 36×36 SVG.
// Circumference is computed once at module load.
const DONUT_CIRCUMFERENCE = 2 * Math.PI * 13  // ≈ 81.68

function categoryLabel(id) {
  return LOCATION_CATEGORIES.find(c => c.id === id)?.label ?? id
}

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

// OpenWeatherMap condition id → emoji
function weatherEmoji(id) {
  if (id >= 200 && id < 300) return '⛈️'
  if (id >= 300 && id < 400) return '🌦️'
  if (id >= 500 && id < 600) return '🌧️'
  if (id >= 600 && id < 700) return '❄️'
  if (id >= 700 && id < 800) return '🌫️'
  if (id === 800)            return '☀️'
  if (id > 800)              return '⛅'
  return '🌤️'
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Garden() {
  const navigate = useNavigate()
  const { getUser, saveUser, getPlants, markReminder, getLocations, addLocation } = useStorage()

  const [, setTick]                         = useState(0)
  const [checkmarks,     setCheckmarks]     = useState({})  // keyed "plantId:type"
  const [calendarOpen,   setCalendarOpen]   = useState(false)
  const [weather,        setWeather]        = useState(null)
  const [forecast,       setForecast]       = useState([])
  const [addSheetOpen,   setAddSheetOpen]   = useState(false)
  const [tasksSheetOpen, setTasksSheetOpen] = useState(false)

  const user   = getUser()
  const plants = getPlants()

  useEffect(() => {
    if (!user) navigate('/onboarding', { replace: true })
  }, [])

  useEffect(() => {
    if (user?.lat && user?.lon) {
      fetchWeather({ lat: user.lat, lon: user.lon })
    } else if (user?.city) {
      fetchWeather({ city: user.city })
    }
  }, [])

  async function fetchWeather({ lat, lon, city }) {
    if (!WEATHER_API_KEY) return
    try {
      const params = (lat != null && lon != null)
        ? `lat=${lat}&lon=${lon}`
        : `q=${encodeURIComponent(city)},IN`

      // Current weather
      const res  = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?${params}&appid=${WEATHER_API_KEY}&units=metric`
      )
      const data = await res.json()
      if (data.cod !== 200) return  // /weather returns numeric 200 on success

      setWeather(data)

      // Persist resolved coords if we resolved via city
      if ((lat == null || lon == null) && data.coord) {
        const u = getUser()
        if (u) saveUser({ ...u, lat: data.coord.lat, lon: data.coord.lon })
      }

      // 3-day forecast
      const forecastRes  = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?${params}&appid=${WEATHER_API_KEY}&units=metric&cnt=24`
      )
      const forecastData = await forecastRes.json()
      if (forecastData.cod === '200' && Array.isArray(forecastData.list)) {
        // One entry per day — pick the noon-ish reading (11:00–13:00 local)
        const daily = []
        const seen  = new Set()
        forecastData.list.forEach(item => {
          const date   = new Date(item.dt * 1000)
          const dayKey = date.toDateString()
          const hour   = date.getHours()
          if (!seen.has(dayKey) && hour >= 11 && hour <= 13) {
            seen.add(dayKey)
            daily.push(item)
          }
        })
        setForecast(daily.slice(0, 3))
      }
    } catch {
      // silently skip — widget just won't show
    }
  }

  function handleTaskDone(plantId, type) {
    markReminder(plantId, type)
    setTick(t => t + 1)
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

  const month      = new Date().getMonth()
  const tasksCount = plants.reduce((sum, p) => sum + getDueReminders(p).length, 0)
  const refDate = user.joinedDate
    || plants.reduce((earliest, p) => {
        if (!p.addedDate) return earliest
        return !earliest || p.addedDate < earliest ? p.addedDate : earliest
      }, null)
  const daysJoined = refDate
    ? Math.max(1, Math.floor((Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 0
  const locations   = getLocations()
  const seasonalTip = getSeasonalTip(month, user.zone || 'Z16')
  const greeting    = getGreeting()

  // ─── Styles ──────────────────────────────────────────────────────────────────

  const page = {
    minHeight:     '100svh',
    background:    '#f0ede6',
    fontFamily:    'var(--font-body)',
    color:         'var(--text)',
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
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          fontSize:   '26px',
          lineHeight: 1.2,
          margin:     '0 0 14px',
          color:      'var(--text)',
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
            marginTop:    '14px',
            padding:      '14px 16px',
            background:   'var(--green-light)',
            borderRadius: '12px',
          }}>
            {/* Today — temperature + condition + city */}
            <div style={{
              fontSize:   '32px',
              fontWeight: 600,
              color:      'var(--text)',
              lineHeight: 1.05,
            }}>
              {weather.main.temp.toFixed(0)}°C
            </div>
            <div style={{
              fontSize:      '14px',
              color:         'var(--muted)',
              textTransform: 'capitalize',
              marginTop:     '2px',
            }}>
              {weather.weather[0].description}
            </div>
            <div style={{
              fontSize:  '12px',
              color:     'var(--muted)',
              marginTop: '2px',
            }}>
              {weather.name}
            </div>

            {/* Detail row */}
            <div style={{
              display:   'flex',
              flexWrap:  'wrap',
              gap:       '16px',
              marginTop: '8px',
              fontSize:  '12px',
              color:     'var(--muted)',
            }}>
              <span>🌡️ Feels like {weather.main.feels_like.toFixed(0)}°C</span>
              <span>💧 Humidity {weather.main.humidity}%</span>
              <span>💨 Wind {(weather.wind.speed * 3.6).toFixed(0)} km/h</span>
              {weather.clouds?.all !== undefined && (
                <span>☁️ Clouds {weather.clouds.all}%</span>
              )}
            </div>

            {/* 3-day forecast */}
            {forecast.length > 0 && (
              <>
                <div style={{
                  borderTop: '1px solid rgba(255,255,255,0.2)',
                  margin:    '12px 0 8px',
                }} />
                <div style={{
                  fontSize:      '11px',
                  fontWeight:    600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  opacity:       0.8,
                  marginBottom:  '8px',
                  color:         'var(--text)',
                }}>
                  Next 3 days
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {forecast.map(item => (
                    <div key={item.dt} style={{
                      flex:         1,
                      textAlign:    'center',
                      padding:      '6px 4px',
                      background:   'rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>
                        {new Date(item.dt * 1000).toLocaleDateString('en-IN', { weekday: 'short' })}
                      </div>
                      <div style={{ fontSize: '18px', lineHeight: 1.2 }}>
                        {weatherEmoji(item.weather[0].id)}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text)' }}>
                        {item.main.temp.toFixed(0)}°C
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Today strip ───────────────────────────────────────────────────── */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap:                 '8px',
        margin:              '0 16px 12px',
      }}>
        {[
          {
            emoji:   '🔔',
            value:   tasksCount,
            label:   'tasks today',
            alert:   tasksCount > 0,
            onClick: () => setTasksSheetOpen(true),
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
              fontFamily:   'var(--font-display)',
              fontWeight:   500,
              fontSize:     '24px',
              lineHeight:   1,
              color:        stat.alert ? '#D97706' : 'var(--text)',
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
          fontSize:      '11px',
          fontWeight:    600,
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          margin:        '0 0 5px',
          opacity:       0.75,
        }}>
          Seasonal tip
        </p>
        <p style={{ fontSize: '14px', margin: 0, lineHeight: 1.55 }}>
          {seasonalTip}
        </p>
      </div>

      {/* ── My Locations ──────────────────────────────────────────────────── */}
      <div style={{ margin: '0 16px 12px' }}>

        {/* Section header with pinned + button */}
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
            My Locations
          </h2>
          <button
            onClick={() => setAddSheetOpen(true)}
            aria-label="Add location"
            style={{
              width:          '32px',
              height:         '32px',
              borderRadius:   '50%',
              background:     'var(--green)',
              color:          '#fff',
              border:         'none',
              fontSize:       '20px',
              lineHeight:     1,
              cursor:         'pointer',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontFamily:     'var(--font-body)',
              flexShrink:     0,
            }}
          >
            +
          </button>
        </div>

        <div style={{
          display:  'flex',
          flexWrap: 'wrap',
          gap:      '8px',
        }}>

          {/* All card — default location for unassigned plants */}
          <div
            onClick={() => navigate('/location/all')}
            style={{
            width:           '62px',
            height:          '62px',
            minWidth:        '62px',
            maxWidth:        '62px',
            padding:         '8px 4px',
            borderRadius:    '14px',
            border:          '1.5px solid var(--green)',
            background:      'var(--green)',
            display:         'flex',
            flexDirection:   'column',
            alignItems:      'center',
            justifyContent:  'center',
            gap:             '4px',
            boxSizing:       'border-box',
            cursor:     'pointer',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '22px', lineHeight: 1, color: '#fff' }}>🌱</span>
            <span style={{
              fontSize:     '10px',
              fontFamily:   'var(--font-body)',
              fontWeight:   500,
              lineHeight:   1.2,
              whiteSpace:   'nowrap',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              maxWidth:     '100%',
              textAlign:    'center',
              color:        '#fff',
            }}>
              All
            </span>
          </div>

          {/* Location cards — tap to open detail page */}
          {locations.map(loc => (
            <div
              key={loc.id}
              onClick={() => navigate(`/location/${loc.id}`)}
              style={{
                width:           '62px',
                height:          '62px',
                minWidth:        '62px',
                maxWidth:        '62px',
                padding:         '8px 4px',
                borderRadius:    '14px',
                border:          '1.5px solid var(--border)',
                background:      '#fff',
                display:         'flex',
                flexDirection:   'column',
                alignItems:      'center',
                justifyContent:  'center',
                gap:             '4px',
                boxSizing:       'border-box',
                cursor:     'pointer',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: '22px', lineHeight: 1, color: 'var(--text)' }}>{loc.icon}</span>
              <span style={{
                fontSize:     '10px',
                fontFamily:   'var(--font-body)',
                fontWeight:   500,
                lineHeight:   1.2,
                whiteSpace:   'nowrap',
                overflow:     'hidden',
                textOverflow: 'ellipsis',
                maxWidth:     '100%',
                textAlign:    'center',
                color:        'var(--text)',
              }}>
                {loc.name}
              </span>
            </div>
          ))}

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
              width:          '36px',
              height:         '36px',
              borderRadius:   '50%',
              background:     'var(--green)',
              color:          '#fff',
              border:         'none',
              fontSize:       '24px',
              lineHeight:     1,
              cursor:         'pointer',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontFamily:     'var(--font-body)',
              flexShrink:     0,
            }}
          >
            +
          </button>
        </div>

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
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              fontSize:   '19px',
              color:      'var(--text)',
              margin:     '0 0 8px',
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
                padding:      '14px 32px',
                background:   'var(--green)',
                color:        '#fff',
                border:       'none',
                borderRadius: 'var(--radius)',
                fontSize:     '15px',
                fontWeight:   500,
                fontFamily:   'var(--font-body)',
                cursor:       'pointer',
              }}
            >
              Add a plant
            </button>
          </div>

        ) : (

          /* ── 2-col grid ───────────────────────────────────────────────── */
          <div style={{
            display:             'grid',
            gridTemplateColumns: '1fr 1fr',
            gap:                 '12px',
          }}>
            {plants.map(plant => {
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

              const plantLocation   = plant.locationId ? locations.find(l => l.id === plant.locationId) : null
              const isWrongLocation = !!(
                plant.locationRecommendation &&
                plant.locationRecommendation.bestCategories?.length > 0 &&
                plantLocation &&
                !plant.locationRecommendation.bestCategories.includes(categoryLabel(plantLocation.category)) &&
                plant.locationRecommendation.warningIfIndoor
              )

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
                      fontWeight:   500,
                      fontSize:     '14px',
                      margin:       '0 0 4px',
                      color:        'var(--text)',
                      whiteSpace:   'nowrap',
                      overflow:     'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {plant.name}
                    </p>
                    {(plant.room || plant.locationId) && (
                      <div style={{
                        display:      'flex',
                        flexWrap:     'wrap',
                        gap:          '4px',
                        marginBottom: '5px',
                      }}>
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
                    {isWrongLocation && (
                      <div style={{
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'space-between',
                        marginTop:      2,
                      }}>
                        <span style={{ fontSize: '10px', color: '#E07B39', fontWeight: 500 }}>
                          Better in {plant.locationRecommendation.bestCategories[0]}
                        </span>
                        <span style={{ fontSize: '12px' }}>⚠️</span>
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

                    {/* Health score row — mini SVG donut + status label */}
                    {(() => {
                      const health = calculateHealthScore(plant)
                      const score  = Math.max(0, Math.min(100, Math.round(health.score)))
                      const filled = (score / 100) * DONUT_CIRCUMFERENCE
                      const empty  = DONUT_CIRCUMFERENCE - filled
                      return (
                        <div style={{
                          display:      'flex',
                          alignItems:   'center',
                          gap:          '8px',
                          marginTop:    '8px',
                          marginBottom: '4px',
                        }}>
                          {/* Mini donut */}
                          <div style={{
                            position:   'relative',
                            width:      '36px',
                            height:     '36px',
                            flexShrink: 0,
                          }}>
                            <svg
                              viewBox="0 0 36 36"
                              width="36"
                              height="36"
                              style={{ transform: 'rotate(-90deg)', display: 'block' }}
                            >
                              {/* Track */}
                              <circle
                                cx="18" cy="18" r="13"
                                fill="none"
                                stroke="#E8F5F0"
                                strokeWidth="5"
                              />
                              {/* Fill */}
                              <circle
                                cx="18" cy="18" r="13"
                                fill="none"
                                stroke={health.color}
                                strokeWidth="5"
                                strokeDasharray={`${filled} ${empty}`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div style={{
                              position:   'absolute',
                              top:        '50%',
                              left:       '50%',
                              transform:  'translate(-50%, -50%)',
                              fontSize:   '10px',
                              fontWeight: 600,
                              color:      health.color,
                              fontFamily: 'var(--font-body)',
                              lineHeight: 1,
                            }}>
                              {score}
                            </div>
                          </div>

                          {/* Status text */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                            <span style={{
                              fontSize:   '11px',
                              fontWeight: 500,
                              color:      health.color,
                              whiteSpace: 'nowrap',
                              overflow:   'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {health.emoji} {health.label}
                            </span>
                            <span style={{
                              fontSize:    '10px',
                              color:       '#aaa',
                              whiteSpace:  'nowrap',
                              overflow:    'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {SCORE_SUBTEXT[health.status]}
                            </span>
                          </div>
                        </div>
                      )
                    })()}

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

      {addSheetOpen && (
        <AddLocationSheet
          onClose={() => setAddSheetOpen(false)}
          onSave={data => {
            const loc = addLocation(data)
            setAddSheetOpen(false)
            navigate(`/location/${loc.id}`)
          }}
        />
      )}

      {/* ── Tasks Today sheet ─────────────────────────────────────────────── */}
      {tasksSheetOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setTasksSheetOpen(false)}
            style={{
              position:   'fixed',
              inset:      0,
              background: 'rgba(0,0,0,0.4)',
              zIndex:     200,
            }}
          />

          {/* Sheet panel */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position:      'fixed',
              bottom:        0,
              left:          0,
              right:         0,
              background:    'var(--cream)',
              borderRadius:  '20px 20px 0 0',
              maxHeight:     '80vh',
              overflowY:     'auto',
              zIndex:        201,
              paddingBottom: '32px',
            }}
          >
            {/* Drag handle */}
            <div style={{
              width:        '36px',
              height:       '4px',
              borderRadius: '2px',
              background:   'var(--border)',
              margin:       '12px auto 0',
            }} />

            {/* Header */}
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              fontSize:   '20px',
              margin:     0,
              padding:    '16px 16px 0',
              color:      'var(--text)',
            }}>
              Today's Tasks
            </h2>

            {tasksCount === 0 ? (

              /* ── All caught up ──────────────────────────────────────────── */
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px', lineHeight: 1 }}>🌿</div>
                <p style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)', margin: '0 0 6px' }}>
                  All caught up!
                </p>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                  No reminders due today
                </p>
              </div>

            ) : (

              /* ── Task list ──────────────────────────────────────────────── */
              <>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 16px 12px' }}>
                  {tasksCount} reminder{tasksCount !== 1 ? 's' : ''} due across your garden
                </p>

                {plants.map(plant => {
                  const dueTypes = getDueReminders(plant)
                  if (dueTypes.length === 0) return null
                  return (
                    <div key={plant.id}>

                      {/* Plant section header */}
                      <div style={{
                        display:    'flex',
                        alignItems: 'center',
                        gap:        '8px',
                        padding:    '12px 16px 4px',
                      }}>
                        {plant.photo ? (
                          <img
                            src={plant.photo}
                            alt={plant.name}
                            style={{
                              width:        '28px',
                              height:       '28px',
                              borderRadius: '8px',
                              objectFit:    'cover',
                              flexShrink:   0,
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: '20px', lineHeight: 1 }}>
                            {plant.emoji || '🌿'}
                          </span>
                        )}
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>
                          {plant.name}
                        </span>
                      </div>

                      {/* Task rows */}
                      {dueTypes.map(type => {
                        const meta = REMINDER_TYPES[type]
                        return (
                          <div
                            key={type}
                            style={{
                              display:        'flex',
                              alignItems:     'center',
                              justifyContent: 'space-between',
                              padding:        '8px 16px',
                              background:     '#fff',
                              borderRadius:   '12px',
                              margin:         '0 16px 6px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '20px', lineHeight: 1 }}>{meta.icon}</span>
                              <span style={{ fontSize: '14px', color: 'var(--text)' }}>
                                {meta.label}
                              </span>
                            </div>
                            <button
                              onClick={() => handleTaskDone(plant.id, type)}
                              style={{
                                padding:      '6px 14px',
                                background:   'var(--green)',
                                color:        '#fff',
                                borderRadius: '20px',
                                fontSize:     '13px',
                                fontWeight:   500,
                                fontFamily:   'var(--font-body)',
                                border:       'none',
                                cursor:       'pointer',
                              }}
                            >
                              Done ✓
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
