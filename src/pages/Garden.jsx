import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStorage } from '../hooks/useStorage.js'
import { daysSince, isReminderDue } from '../utils/reminders.js'
import BottomNav from '../components/BottomNav.jsx'

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

// ─── Component ───────────────────────────────────────────────────────────────

export default function Garden() {
  const navigate               = useNavigate()
  const { getUser, getPlants } = useStorage()

  const user   = getUser()
  const plants = getPlants()

  const [weather, setWeather] = useState(null)

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

  if (!user) return null

  const month        = new Date().getMonth()
  const needsWater   = plants.filter(p => isReminderDue(p.reminders?.watering)).length
  const daysJoined   = user.joinedDate
    ? Math.max(0, Math.floor((Date.now() - new Date(user.joinedDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 0
  const seasonalTip  = getSeasonalTip(month, user.zone || 'Z16')
  const greeting     = getGreeting()

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
            emoji: '📅',
            value: daysJoined,
            label: daysJoined === 1 ? 'day together' : 'days together',
            alert: false,
          },
        ].map(stat => (
          <div key={stat.label} style={{
            background:   stat.alert ? '#FFF5E6' : 'var(--cream)',
            borderRadius: 'var(--radius)',
            padding:      '14px 10px',
            textAlign:    'center',
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
                      margin:         '0 0 6px',
                      color:          'var(--text)',
                      whiteSpace:     'nowrap',
                      overflow:       'hidden',
                      textOverflow:   'ellipsis',
                    }}>
                      {plant.name}
                    </p>
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
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
