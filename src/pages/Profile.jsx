import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStorage } from '../hooks/useStorage'
import { toDateKey } from '../utils/reminders.js'
import { getZoneDetails } from '../data/zones'
import BottomNav from '../components/BottomNav'
import CareCalendar from '../components/CareCalendar.jsx'

export default function Profile() {
  const navigate   = useNavigate()
  const { getUser, getPlants } = useStorage()
  const [calendarOpen, setCalendarOpen] = useState(false)

  const user   = getUser()
  const plants = getPlants()

  if (!user) { navigate('/onboarding', { replace: true }); return null }

  const zone     = getZoneDetails(user.zone)
  const initials = (user.name || '?').charAt(0).toUpperCase()

  // ─── Stats helpers ─────────────────────────────────────────────────────────
  const now          = Date.now()
  const todayKey     = toDateKey(new Date())
  const wateredToday = plants.filter(
    p => p.reminders?.watering?.lastCompleted === todayKey
  ).length

  const daysTogether = user.joinedDate
    ? Math.max(1, Math.floor((now - new Date(user.joinedDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 1

  // ─── Styles ────────────────────────────────────────────────────────────────
  const page = {
    minHeight:   '100svh',
    paddingBottom: '88px',
    background:  'var(--cream)',
    fontFamily:  'var(--font-body)',
    color:       'var(--text)',
  }

  const section = {
    padding: '0 20px 28px',
  }

  const sectionTitle = {
    fontFamily:    'var(--font-display)',
    fontWeight:    500,
    fontSize:      '18px',
    color:         'var(--text)',
    margin:        '0 0 14px',
  }

  const card = {
    background:   '#fff',
    border:       '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    overflow:     'hidden',
  }

  return (
    <div style={page}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding:      '56px 20px 20px',
        background:   'var(--cream)',
        borderBottom: '1px solid var(--border)',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          fontSize:   '28px',
          margin:     0,
          color:      'var(--text)',
        }}>
          My Profile
        </h1>
      </div>

      {/* ── User Card ──────────────────────────────────────────────────────── */}
      <div style={{ ...section, paddingTop: '24px' }}>
        <div style={{
          ...card,
          padding:    '24px 20px',
          display:    'flex',
          alignItems: 'center',
          gap:        '18px',
        }}>
          {/* Avatar */}
          <div style={{
            width:          '64px',
            height:         '64px',
            borderRadius:   '50%',
            background:     'var(--green)',
            color:          '#fff',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       '26px',
            fontWeight:     600,
            fontFamily:     'var(--font-display)',
            flexShrink:     0,
          }}>
            {initials}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily:   'var(--font-display)',
              fontWeight:   500,
              fontSize:     '22px',
              margin:       '0 0 2px',
              color:        'var(--text)',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
            }}>
              {user.name}
            </p>
            <p style={{
              fontSize: '14px',
              color:    'var(--muted)',
              margin:   '0 0 10px',
            }}>
              {user.city}
            </p>
            {/* Zone pill */}
            <span style={{
              display:      'inline-flex',
              alignItems:   'center',
              gap:          '5px',
              background:   'var(--green-light)',
              color:        'var(--green-dark)',
              fontSize:     '12px',
              fontWeight:   500,
              padding:      '4px 10px',
              borderRadius: '99px',
            }}>
              {user.zone} · {user.zoneName}
            </span>

            {/* Edit Location */}
            <div>
              <button
                onClick={() => navigate('/onboarding', { state: { startStep: 2 } })}
                style={{
                  background:   'transparent',
                  border:       '1.5px solid var(--border)',
                  color:        'var(--text)',
                  borderRadius: 'var(--radius)',
                  padding:      '8px 14px',
                  fontSize:     '13px',
                  fontFamily:   'var(--font-body)',
                  cursor:       'pointer',
                  marginTop:    '8px',
                }}
              >
                ✏️ Edit Location
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      <div style={{ ...section, paddingTop: 0 }}>
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap:                 '10px',
        }}>
          {[
            { icon: '🌱', value: plants.length,  label: 'Total plants',  onClick: undefined                    },
            { icon: '💧', value: wateredToday,   label: 'Watered today', onClick: undefined                    },
            { icon: '📅', value: daysTogether,   label: 'Days together', onClick: () => setCalendarOpen(true)  },
          ].map(({ icon, value, label, onClick }) => (
            <div key={label} onClick={onClick} style={{
              ...card,
              padding:   '16px 10px',
              textAlign: 'center',
              cursor:    onClick ? 'pointer' : 'default',
            }}>
              <div style={{ fontSize: '22px', marginBottom: '4px' }}>{icon}</div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                fontSize:   '22px',
                color:      'var(--text)',
                lineHeight: 1,
              }}>
                {value}
              </div>
              <div style={{
                fontSize:   '11px',
                color:      'var(--muted)',
                marginTop:  '4px',
                lineHeight: 1.3,
              }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── My Plants ──────────────────────────────────────────────────────── */}
      <div style={{ paddingBottom: '28px' }}>
        <h2 style={{ ...sectionTitle, padding: '0 20px 14px', margin: 0 }}>My plants</h2>

        {plants.length === 0 ? (
          <div style={{
            margin:    '0 20px',
            padding:   '18px',
            ...card,
            textAlign: 'center',
            color:     'var(--muted)',
            fontSize:  '14px',
          }}>
            No plants yet — add one from the Garden tab 🌿
          </div>
        ) : (
          <div style={{
            display:                  'flex',
            gap:                      '10px',
            overflowX:                'auto',
            paddingLeft:              '20px',
            paddingRight:             '20px',
            paddingBottom:            '4px',
            WebkitOverflowScrolling:  'touch',
            scrollbarWidth:           'none',
            msOverflowStyle:          'none',
          }}>
            {plants.map(plant => (
              <button
                key={plant.id}
                onClick={() => navigate(`/care-tips/${plant.id}`)}
                style={{
                  display:       'inline-flex',
                  alignItems:    'center',
                  gap:           '6px',
                  padding:       '10px 16px',
                  background:    '#fff',
                  border:        '1px solid var(--border)',
                  borderRadius:  '99px',
                  fontSize:      '14px',
                  fontFamily:    'var(--font-body)',
                  color:         'var(--text)',
                  cursor:        'pointer',
                  whiteSpace:    'nowrap',
                  flexShrink:    0,
                  fontWeight:    500,
                }}
              >
                <span style={{ fontSize: '16px' }}>{plant.emoji || '🌿'}</span>
                {plant.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Zone Info ──────────────────────────────────────────────────────── */}
      {zone && (
        <div style={section}>
          <h2 style={sectionTitle}>Your climate zone</h2>
          <div style={card}>

            {/* Zone header */}
            <div style={{
              background: 'var(--green)',
              padding:    '20px',
            }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                fontSize:   '22px',
                color:      '#fff',
                marginBottom: '4px',
              }}>
                {user.zone} — {zone.name}
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
                Peak temperature: {zone.peakTemp}°C
              </div>
            </div>

            {/* Zone details */}
            <div style={{ padding: '18px 20px' }}>

              {/* Description */}
              <p style={{
                fontSize:    '14px',
                color:       'var(--muted)',
                margin:      '0 0 18px',
                lineHeight:  1.6,
              }}>
                {zone.description}
              </p>

              {/* Grid of attributes */}
              <div style={{
                display:             'grid',
                gridTemplateColumns: '1fr 1fr',
                gap:                 '12px',
                marginBottom:        '18px',
              }}>
                {[
                  { label: '💧 Watering',  value: zone.watering  },
                  { label: '🌫️ Humidity',  value: zone.humidity   },
                  { label: '🌧️ Monsoon',   value: zone.monsoon    },
                  { label: '🌡️ Peak heat', value: `${zone.peakTemp}°C` },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    background:   'var(--green-light)',
                    borderRadius: '10px',
                    padding:      '12px',
                  }}>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      {label}
                    </div>
                    <div style={{
                      fontSize:    '13px',
                      fontWeight:  500,
                      color:       'var(--green-dark)',
                      lineHeight:  1.4,
                      textTransform: 'capitalize',
                    }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Best plants */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{
                  fontSize:     '12px',
                  fontWeight:   500,
                  color:        'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px',
                }}>
                  ✅ Best plants for your zone
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {zone.bestPlants.map(p => (
                    <span key={p} style={{
                      background:   'var(--green-light)',
                      color:        'var(--green-dark)',
                      fontSize:     '12px',
                      fontWeight:   500,
                      padding:      '4px 10px',
                      borderRadius: '99px',
                    }}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Avoid */}
              <div>
                <div style={{
                  fontSize:      '12px',
                  fontWeight:    500,
                  color:         'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom:  '8px',
                }}>
                  ⚠️ Plants to avoid
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {zone.avoid.map(p => (
                    <span key={p} style={{
                      background:   '#FEF3C7',
                      color:        '#92400E',
                      fontSize:     '12px',
                      fontWeight:   500,
                      padding:      '4px 10px',
                      borderRadius: '99px',
                    }}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── App Info ───────────────────────────────────────────────────────── */}
      <div style={section}>
        <h2 style={sectionTitle}>About</h2>
        <div style={{ ...card, padding: '20px' }}>
          <div style={{
            display:       'flex',
            alignItems:    'center',
            gap:           '12px',
            paddingBottom: '16px',
            borderBottom:  '1px solid var(--border)',
            marginBottom:  '16px',
          }}>
            <span style={{ fontSize: '32px' }}>🌿</span>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                fontSize:   '17px',
                color:      'var(--text)',
              }}>
                PlantSaathi v1.0
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
                Made with ❤️ for Indian plant lovers
              </div>
            </div>
          </div>
          <a
            href="https://plantshub.in"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              textDecoration: 'none',
              color:          'var(--text)',
            }}
          >
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>
                Data from PlantsHub
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                plantshub.in
              </div>
            </div>
            <span style={{ color: 'var(--muted)', fontSize: '16px' }}>↗</span>
          </a>
        </div>
      </div>

      {/* ── BottomNav ──────────────────────────────────────────────────────── */}
      <BottomNav />

      {calendarOpen && (
        <CareCalendar
          plants={plants}
          onClose={() => setCalendarOpen(false)}
        />
      )}

    </div>
  )
}
