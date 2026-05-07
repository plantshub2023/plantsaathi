import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStorage } from '../hooks/useStorage.js'
import { daysSince } from '../utils/reminders.js'
import { getZoneDetails } from '../data/zones.js'
import BottomNav from '../components/BottomNav.jsx'

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const SEVERITY_STYLE = {
  high:   { background: '#FEE2E2', color: '#DC2626' },
  medium: { background: '#FEF3C7', color: '#D97706' },
  low:    { background: '#DCFCE7', color: '#16A34A' },
}

const TIP_CARDS = [
  { key: 'watering',       icon: '💧', label: 'Watering'          },
  { key: 'sunlight',       icon: '☀️', label: 'Sunlight'          },
  { key: 'soil',           icon: '🌱', label: 'Soil & Fertiliser' },
  { key: 'seasonal',       icon: '📅', label: 'This month'        },
  { key: 'commonProblems', icon: '⚠️', label: 'Watch out for'     },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function waterLabel(days) {
  if (days === null) return 'Not watered yet'
  if (days === 0)    return 'Watered today'
  if (days === 1)    return '1 day ago'
  return `${days} days ago`
}

function healthStatus(daysAgo, frequencyDays) {
  if (daysAgo === null)         return 'green'
  if (daysAgo < frequencyDays)  return 'green'
  if (daysAgo === frequencyDays) return 'amber'
  return 'red'
}

const STATUS_COLOR = { green: '#1D9E75', amber: '#F59E0B', red: '#EF4444' }
const STATUS_BG    = { green: '#DCFCE7', amber: '#FEF3C7', red: '#FEE2E2' }
const STATUS_LABEL = {
  green: 'Recently watered',
  amber: 'Due today',
  red:   'Overdue — needs water',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CareTips() {
  const navigate           = useNavigate()
  const { plantId }        = useParams()
  const { getPlants, getUser, waterPlant, deletePlant } = useStorage()

  const plants     = getPlants()
  const user       = getUser()
  const plant      = plants.find(p => p.id === plantId)
  const zoneDetail = user?.zone ? getZoneDetails(user.zone) : null

  // Redirect if plant not found
  useEffect(() => {
    if (!plant) navigate('/garden', { replace: true })
  }, [plantId])

  if (!plant) return null

  // ─── Local state ─────────────────────────────────────────────────────────

  const [, setTick]                                = useState(0)  // bump to re-read getPlants() after waterPlant
  const [justWatered,       setJustWatered]       = useState(false)
  const [tips,              setTips]              = useState(null)
  const [tipsLoading,       setTipsLoading]       = useState(true)
  const [tipsError,         setTipsError]         = useState(null)
  const [showMenu,          setShowMenu]          = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [expandedDiagnosis, setExpandedDiagnosis] = useState(null)

  const watering      = plant.reminders?.watering
  const frequencyDays = watering?.frequencyDays
  const daysAgo       = watering?.lastCompleted ? daysSince(watering.lastCompleted) : null
  const status        = healthStatus(daysAgo, frequencyDays)
  const diagnoses     = (plant.diagnoses || [])

  // ─── Fetch AI care tips on mount ─────────────────────────────────────────

  useEffect(() => {
    fetchCareTips()
  }, [plantId])

  async function fetchCareTips() {
    setTipsLoading(true)
    setTipsError(null)
    try {
      const currentMonth = MONTHS[new Date().getMonth()]
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':                              'application/json',
          'x-api-key':                                 import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version':                         '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 800,
          system:     'You are an expert Indian horticulturist. Give specific advice for Indian conditions only.',
          messages: [{
            role: 'user',
            content: `Plant: ${plant.name}
City: ${user?.city ?? 'India'}, Zone: ${user?.zone ?? 'Z16'} - ${user?.zoneName ?? ''}
Current month: ${currentMonth}

Give care tips in this exact JSON format only:
{
  "watering": "specific watering advice for this zone",
  "sunlight": "sunlight requirements",
  "soil": "soil and fertiliser advice",
  "seasonal": "specific tip for this month in this zone",
  "commonProblems": "watch out for these in your zone"
}`,
          }],
        }),
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data  = await res.json()
      const text  = data.content?.[0]?.text ?? ''
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Could not parse tips')
      setTips(JSON.parse(match[0]))
    } catch (err) {
      setTipsError(err.message ?? 'Could not load tips')
    } finally {
      setTipsLoading(false)
    }
  }

  // ─── Handlers ────────────────────────────────────────────────────────────

  function handleWater() {
    waterPlant(plant.id)
    setTick(t => t + 1)
    setJustWatered(true)
    setTimeout(() => setJustWatered(false), 3000)
  }

  function handleDelete() {
    deletePlant(plant.id)
    navigate('/garden', { replace: true })
  }

  // ─── Shared style tokens ──────────────────────────────────────────────────

  const page = {
    minHeight:     '100svh',
    background:    '#f0ede6',
    fontFamily:    'var(--font-body)',
    color:         'var(--text)',
    paddingBottom: '88px',
  }

  const card = (extra = {}) => ({
    background:   'var(--cream)',
    borderRadius: 'var(--radius)',
    margin:       '0 16px 12px',
    ...extra,
  })

  const sectionLabel = {
    display:       'block',
    fontSize:      '12px',
    fontWeight:    600,
    color:         'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    marginBottom:  '12px',
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={page}>
      {/* Spinner keyframe — minimal style injection for animation only */}
      <style>{`@keyframes ps-spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={card({
        marginTop: '16px',
        padding:   '16px 20px',
        display:   'flex',
        alignItems: 'center',
        gap:        '12px',
      })}>
        <button
          onClick={() => navigate('/garden')}
          style={{ background:'none', border:'none', fontSize:'22px', cursor:'pointer', color:'var(--text)', padding:'4px', lineHeight:1, flexShrink:0 }}
        >
          ←
        </button>

        <h1 style={{
          flex:        1,
          fontFamily:  'var(--font-display)',
          fontWeight:  500,
          fontSize:    '20px',
          margin:      0,
          color:       'var(--text)',
          overflow:    'hidden',
          textOverflow:'ellipsis',
          whiteSpace:  'nowrap',
        }}>
          {plant.name}
        </h1>

        {/* 3-dot menu */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowMenu(v => !v)}
            style={{ background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'var(--muted)', padding:'4px', lineHeight:1 }}
          >
            ···
          </button>
          {showMenu && (
            <>
              <div
                style={{ position:'fixed', inset:0, zIndex:40 }}
                onClick={() => setShowMenu(false)}
              />
              <div style={{
                position:     'absolute',
                top:          '100%',
                right:        0,
                background:   '#fff',
                border:       '1px solid var(--border)',
                borderRadius: '12px',
                padding:      '6px',
                boxShadow:    '0 8px 24px rgba(0,0,0,0.1)',
                zIndex:       50,
                minWidth:     '170px',
              }}>
                <button
                  onClick={() => { setShowMenu(false); setShowDeleteConfirm(true) }}
                  style={{
                    display:      'block',
                    width:        '100%',
                    textAlign:    'left',
                    padding:      '12px 16px',
                    background:   'none',
                    border:       'none',
                    borderRadius: '8px',
                    color:        '#DC2626',
                    fontSize:     '14px',
                    fontFamily:   'var(--font-body)',
                    cursor:       'pointer',
                  }}
                >
                  🗑  Delete plant
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Plant hero ─────────────────────────────────────────────────────── */}
      <div style={card({ overflow: 'hidden' })}>
        {/* Photo / placeholder */}
        <div style={{
          height:         '200px',
          background:     plant.photo ? '#111' : 'var(--green-light)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       '72px',
          overflow:       'hidden',
        }}>
          {plant.photo
            ? <img src={plant.photo} alt={plant.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : (plant.emoji ?? '🌿')
          }
        </div>

        {/* Plant info below photo */}
        <div style={{ padding: '16px 20px 18px' }}>
          <p style={{
            fontFamily:  'var(--font-display)',
            fontWeight:  500,
            fontSize:    '20px',
            margin:      '0 0 4px',
            color:       'var(--text)',
          }}>
            {plant.name}
          </p>
          <p style={{ fontSize:'13px', color:'var(--muted)', margin:'0 0 12px' }}>
            Added {plant.addedDate ? formatDate(plant.addedDate) : 'recently'}
          </p>
          {user?.zone && (
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
              {zoneDetail ? ` · up to ${zoneDetail.peakTemp}°C` : ''}
            </div>
          )}
          {plant.notes && (
            <p style={{ fontSize:'14px', color:'var(--muted)', margin:'12px 0 0', fontStyle:'italic', lineHeight:1.5 }}>
              "{plant.notes}"
            </p>
          )}
        </div>
      </div>

      {/* ── Watering section ───────────────────────────────────────────────── */}
      <div style={card({ padding: '20px' })}>
        <span style={sectionLabel}>💧 Watering</span>

        {/* Status row */}
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          '10px',
          marginBottom: '16px',
          padding:      '12px 16px',
          background:   STATUS_BG[status],
          borderRadius: '12px',
        }}>
          <div style={{
            width:        '10px',
            height:       '10px',
            borderRadius: '50%',
            background:   STATUS_COLOR[status],
            flexShrink:   0,
          }} />
          <div>
            <p style={{ margin:0, fontSize:'14px', fontWeight:500, color:STATUS_COLOR[status] }}>
              {STATUS_LABEL[status]}
            </p>
            <p style={{ margin:0, fontSize:'12px', color:'var(--muted)', marginTop:'2px' }}>
              Last watered: {waterLabel(daysAgo)} · every {frequencyDays} {frequencyDays === 1 ? 'day' : 'days'}
            </p>
          </div>
        </div>

        {/* Mark as watered button */}
        <button
          onClick={handleWater}
          disabled={justWatered}
          style={{
            width:        '100%',
            padding:      '15px',
            fontSize:     '15px',
            fontWeight:   500,
            fontFamily:   'var(--font-body)',
            color:        justWatered ? 'var(--green)' : '#fff',
            background:   justWatered ? 'var(--green-light)' : 'var(--green)',
            border:       justWatered ? '1.5px solid var(--green)' : 'none',
            borderRadius: 'var(--radius)',
            cursor:       justWatered ? 'default' : 'pointer',
            transition:   'all 0.3s ease',
          }}
        >
          {justWatered ? 'Watered today ✓' : '💧 Mark as watered'}
        </button>
      </div>

      {/* ── AI care tips ───────────────────────────────────────────────────── */}
      <div style={card({ padding: '20px' })}>
        <span style={sectionLabel}>✨ Care tips for your zone</span>

        {tipsLoading && (
          <div style={{ textAlign:'center', padding:'24px 0' }}>
            <div style={{
              width:        '28px',
              height:       '28px',
              border:       '3px solid var(--green-light)',
              borderTop:    '3px solid var(--green)',
              borderRadius: '50%',
              margin:       '0 auto 12px',
              animation:    'ps-spin 0.8s linear infinite',
            }} />
            <p style={{ color:'var(--muted)', fontSize:'14px', margin:0 }}>
              Fetching care tips for your zone…
            </p>
          </div>
        )}

        {tipsError && (
          <div style={{ padding:'12px 16px', background:'#FEE2E2', borderRadius:'12px' }}>
            <p style={{ color:'#DC2626', fontSize:'14px', margin:'0 0 10px' }}>
              ⚠️  {tipsError}
            </p>
            <button
              onClick={fetchCareTips}
              style={{ background:'none', border:'none', color:'var(--green)', fontSize:'13px', cursor:'pointer', fontFamily:'var(--font-body)', textDecoration:'underline', padding:0 }}
            >
              Retry
            </button>
          </div>
        )}

        {tips && (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {TIP_CARDS.map(({ key, icon, label }) => tips[key] && (
              <div key={key} style={{
                padding:      '14px 16px',
                background:   '#fff',
                borderRadius: '12px',
                border:       '1px solid var(--border)',
              }}>
                <p style={{ margin:'0 0 5px', fontSize:'12px', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                  {icon}  {label}
                </p>
                <p style={{ margin:0, fontSize:'14px', lineHeight:1.65, color:'var(--text)' }}>
                  {tips[key]}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Diagnosis history ──────────────────────────────────────────────── */}
      <div style={card({ padding: '20px' })}>
        <span style={sectionLabel}>🔬 Past diagnoses</span>

        {diagnoses.length === 0 ? (
          <p style={{ color:'var(--muted)', fontSize:'14px', margin:0, textAlign:'center', padding:'12px 0' }}>
            No diagnoses yet
          </p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {diagnoses.map((d, i) => (
              <div key={i}>
                {/* Summary row */}
                <div
                  onClick={() => setExpandedDiagnosis(expandedDiagnosis === i ? null : i)}
                  style={{
                    display:       'flex',
                    alignItems:    'center',
                    justifyContent:'space-between',
                    padding:       '12px 14px',
                    background:    '#fff',
                    borderRadius:  expandedDiagnosis === i ? '12px 12px 0 0' : '12px',
                    border:        '1px solid var(--border)',
                    cursor:        'pointer',
                    gap:           '10px',
                  }}
                >
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:'0 0 3px', fontSize:'14px', fontWeight:500, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {d.problem ?? 'Unknown problem'}
                    </p>
                    <p style={{ margin:0, fontSize:'12px', color:'var(--muted)' }}>
                      {d.date ? formatDate(d.date) : ''}
                    </p>
                  </div>
                  {d.severity && (
                    <span style={{
                      flexShrink:    0,
                      padding:       '3px 10px',
                      borderRadius:  '100px',
                      fontSize:      '11px',
                      fontWeight:    700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                      ...(SEVERITY_STYLE[d.severity] ?? SEVERITY_STYLE.medium),
                    }}>
                      {d.severity}
                    </span>
                  )}
                  <span style={{ color:'var(--muted)', fontSize:'12px', flexShrink:0 }}>
                    {expandedDiagnosis === i ? '▲' : '▼'}
                  </span>
                </div>

                {/* Expanded detail */}
                {expandedDiagnosis === i && (
                  <div style={{
                    padding:      '14px 16px',
                    background:   '#fafafa',
                    border:       '1px solid var(--border)',
                    borderTop:    'none',
                    borderRadius: '0 0 12px 12px',
                    display:      'flex',
                    flexDirection:'column',
                    gap:          '10px',
                  }}>
                    {d.cause && (
                      <div>
                        <p style={{ margin:'0 0 4px', fontSize:'11px', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Cause</p>
                        <p style={{ margin:0, fontSize:'13px', lineHeight:1.6, color:'var(--text)' }}>{d.cause}</p>
                      </div>
                    )}
                    {d.fixes?.length > 0 && (
                      <div>
                        <p style={{ margin:'0 0 6px', fontSize:'11px', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>How to fix</p>
                        <ol style={{ margin:0, paddingLeft:'18px', display:'flex', flexDirection:'column', gap:'6px' }}>
                          {d.fixes.map((f, j) => (
                            <li key={j} style={{ fontSize:'13px', lineHeight:1.55, color:'var(--text)' }}>{f}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {d.zone_note && (
                      <div style={{ padding:'10px 14px', background:'#FEF3C7', borderRadius:'10px' }}>
                        <p style={{ margin:0, fontSize:'13px', lineHeight:1.55, color:'#78350F' }}>📍 {d.zone_note}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Danger zone ────────────────────────────────────────────────────── */}
      <div style={card({ padding: '20px', marginBottom: '24px' })}>
        <span style={sectionLabel}>Danger zone</span>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          style={{
            width:        '100%',
            padding:      '14px',
            fontSize:     '15px',
            fontWeight:   500,
            fontFamily:   'var(--font-body)',
            color:        '#DC2626',
            background:   '#FEE2E2',
            border:       '1.5px solid #FECACA',
            borderRadius: 'var(--radius)',
            cursor:       'pointer',
          }}
        >
          🗑  Delete this plant
        </button>
      </div>

      {/* ── Delete confirm modal ───────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div style={{
          position:       'fixed',
          inset:          0,
          background:     'rgba(0,0,0,0.45)',
          display:        'flex',
          alignItems:     'flex-end',
          justifyContent: 'center',
          zIndex:         200,
        }}>
          <div style={{
            background:   '#fff',
            borderRadius: '20px 20px 0 0',
            padding:      '28px 24px 44px',
            width:        '100%',
            maxWidth:     '390px',
          }}>
            <p style={{ fontFamily:'var(--font-display)', fontWeight:500, fontSize:'20px', margin:'0 0 8px', color:'var(--text)' }}>
              Delete {plant.name}?
            </p>
            <p style={{ fontSize:'14px', color:'var(--muted)', margin:'0 0 24px', lineHeight:1.5 }}>
              This will permanently remove the plant and all its diagnosis history. This cannot be undone.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              <button
                onClick={handleDelete}
                style={{
                  padding:      '15px',
                  fontSize:     '15px',
                  fontWeight:   500,
                  fontFamily:   'var(--font-body)',
                  color:        '#fff',
                  background:   '#DC2626',
                  border:       'none',
                  borderRadius: 'var(--radius)',
                  cursor:       'pointer',
                }}
              >
                Yes, delete plant
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding:      '15px',
                  fontSize:     '15px',
                  fontWeight:   500,
                  fontFamily:   'var(--font-body)',
                  color:        'var(--text)',
                  background:   'transparent',
                  border:       '1.5px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  cursor:       'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
