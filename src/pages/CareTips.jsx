import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SprayCan, Sprout, RotateCw, Scissors, Flower2 } from 'lucide-react'
import { useStorage } from '../hooks/useStorage.js'
import { daysSince, daysUntilDue, REMINDER_TYPES } from '../utils/reminders.js'
import { getZoneDetails } from '../data/zones.js'
import BottomNav from '../components/BottomNav.jsx'
import AddLocationSheet, { LOCATION_CATEGORIES } from '../components/AddLocationSheet.jsx'
import SoilMixChart from '../components/SoilMixChart.jsx'
import FertilizerSchedule from '../components/FertilizerSchedule.jsx'
import HealthScoreDonut from '../components/HealthScoreDonut.jsx'
import { calculateHealthScore, getWeakestFactor } from '../utils/healthScore.js'
import { buildConditionPrompt, validateConditionFertilizer } from '../utils/conditionFertilizer.js'

function categoryLabel(id) {
  return LOCATION_CATEGORIES.find(c => c.id === id)?.label ?? id
}

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

const HumidityIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Water drop */}
    <path d="M12 2C12 2 5 9.5 5 14a7 7 0 0 0 14 0c0-4.5-7-12-7-12z" fill="#4A90D9" opacity="0.85" />
    {/* % inside */}
    <text x="8.5" y="16" fontSize="7" fontWeight="bold" fill="white" fontFamily="sans-serif">%</text>
  </svg>
)

const INFO_ROWS = [
  { key: 'soil',        icon: '🌱',  label: 'Soil'                                   },
  { key: 'sunlight',    icon: '☀️',  label: 'Sunlight'                               },
  { key: 'temperature', icon: '🌡️', label: 'Temperature'                            },
  { key: 'humidity',    icon: null,  label: 'Humidity', iconComponent: <HumidityIcon /> },
  { key: 'fertilizer',  icon: '🌿',  label: 'Fertilizer'                             },
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

// ─── Other reminders config ───────────────────────────────────────────────────

const OTHER_REMINDER_KEYS = ['misting', 'fertilizing', 'rotating', 'pruning', 'repotting']

const REMINDER_ICONS = {
  misting:     SprayCan,
  fertilizing: Sprout,
  rotating:    RotateCw,
  pruning:     Scissors,
  repotting:   Flower2,
}

function reminderStatus(reminder) {
  if (!reminder?.enabled) return { text: 'Off', color: '#9CA3AF', bold: false }
  const d = daysUntilDue(reminder)
  if (d === 0) return { text: 'Due today', color: '#1D9E75', bold: true }
  if (d < 0)   return {
    text:  `${Math.abs(d)} ${Math.abs(d) === 1 ? 'day' : 'days'} overdue`,
    color: '#DC2626',
    bold:  true,
  }
  return { text: `in ${d} ${d === 1 ? 'day' : 'days'}`, color: 'var(--muted)', bold: false }
}

function lastDoneText(reminder) {
  if (!reminder?.lastCompleted) return 'Never'
  const d = daysSince(reminder.lastCompleted)
  if (d === 0) return 'today'
  if (d === 1) return '1 day ago'
  return `${d} days ago`
}

// ─── Plant Health helpers ─────────────────────────────────────────────────────

const LIGHT_BY_CATEGORY = {
  tropical:  { label: 'High',      pct: 75  },
  succulent: { label: 'Very High', pct: 100 },
  fern:      { label: 'Low',       pct: 25  },
  flowering: { label: 'High',      pct: 75  },
  herbs:     { label: 'Moderate',  pct: 50  },
  indoor:    { label: 'Moderate',  pct: 50  },
  fruit:     { label: 'Very High', pct: 100 },
  trees:     { label: 'High',      pct: 75  },
}

function lightForCategory(category) {
  return LIGHT_BY_CATEGORY[category] ?? { label: 'Moderate', pct: 50 }
}

function humidityForZone(zone) {
  if (!zone) return { label: 'Moderate', pct: 50 }
  const num = parseInt(zone.replace('Z', ''), 10)
  if (num <= 3)  return { label: 'High',      pct: 75  }
  if (num <= 8)  return { label: 'Very High', pct: 100 }
  if (num <= 13) return { label: 'Low',       pct: 25  }
  return { label: 'High', pct: 75 }  // Z14–Z16
}

// Returns { pct, color, label } for a care reminder meter.
// Ratio of cycle elapsed: <50% = green, 50–100% = yellow, ≥100% = red.
function reminderMeter(reminder, labels) {
  if (!reminder?.enabled)       return { pct: 0,   color: '#D1D5DB', label: 'Off'          }
  if (!reminder.lastCompleted)  return { pct: 100, color: '#DC2626', label: labels.overdue }
  const ratio = daysSince(reminder.lastCompleted) / reminder.frequencyDays
  const pct   = Math.min(ratio, 1) * 100
  if (ratio < 0.5) return { pct, color: '#1D9E75', label: labels.good }
  if (ratio < 1.0) return { pct, color: '#F59E0B', label: labels.soon }
  return { pct: 100, color: '#DC2626', label: labels.overdue }
}

// Returns { pct, color, label } for soil health based on repotting reminder.
// Fresh = repotted ≤6 months ago and >90 days until due; Aging = >6 months or
// due within 3 months; Needs Repotting = overdue; Unknown = never repotted.
function soilMeter(reminder) {
  if (!reminder?.enabled || !reminder.lastCompleted) {
    return { pct: 50, color: '#F59E0B', label: 'Unknown' }
  }
  const elapsed  = daysSince(reminder.lastCompleted)
  const freq     = reminder.frequencyDays
  const pct      = Math.min((elapsed / freq) * 100, 100)
  const daysLeft = freq - elapsed
  if (daysLeft <= 0)                    return { pct: 100, color: '#DC2626', label: 'Needs Repotting' }
  if (elapsed <= 180 && daysLeft > 90) return { pct,      color: '#1D9E75', label: 'Fresh'           }
  return { pct, color: '#F59E0B', label: 'Aging' }
}

function MeterBar({ icon, label, pct, color, status }) {
  return (
    <div>
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        marginBottom:   '7px',
      }}>
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>
          {icon}&nbsp;&nbsp;{label}
        </span>
        <span style={{ fontSize: '13px', fontWeight: 600, color }}>
          {status}
        </span>
      </div>
      <div style={{
        height:       '8px',
        background:   '#E5E7EB',
        borderRadius: '99px',
        overflow:     'hidden',
      }}>
        <div style={{
          height:       '100%',
          width:        `${Math.max(pct, 3)}%`,
          background:   color,
          borderRadius: '99px',
          transition:   'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CareTips() {
  const navigate           = useNavigate()
  const { plantId }        = useParams()
  const { getPlants, getUser, waterPlant, deletePlant, updatePlant, markReminder, getLocations, addLocation } = useStorage()

  const plants        = getPlants()
  const user          = getUser()
  const plant         = plants.find(p => p.id === plantId)
  const zoneDetail    = user?.zone ? getZoneDetails(user.zone) : null
  const locations     = getLocations()
  const plantLocation = plant?.locationId ? locations.find(l => l.id === plant.locationId) : null

  // Redirect if plant not found
  useEffect(() => {
    if (!plant) navigate('/garden', { replace: true })
  }, [plantId])

  if (!plant) return null

  // ─── Local state ─────────────────────────────────────────────────────────

  const [, setTick]                                = useState(0)  // bump to re-read getPlants() after waterPlant
  const [justWatered,        setJustWatered]        = useState(false)
  const [tips,               setTips]               = useState(null)
  const [tipsLoading,        setTipsLoading]        = useState(true)
  const [tipsError,          setTipsError]          = useState(null)
  const [showMenu,           setShowMenu]           = useState(false)
  const [showDeleteConfirm,  setShowDeleteConfirm]  = useState(false)
  const [expandedDiagnosis,  setExpandedDiagnosis]  = useState(null)
  const [expandedReminder,   setExpandedReminder]   = useState(null)
  const [flashedReminder,    setFlashedReminder]    = useState(null)
  const [locationPickerOpen, setLocationPickerOpen] = useState(false)
  const [addLocationOpen,    setAddLocationOpen]    = useState(false)

  // Condition-based ("treatment plan") fertilizer state — only fetched when
  // the plant's health score drops below 50.
  const [conditionFert,       setConditionFert]       = useState(null)
  const [conditionFertLoading, setConditionFertLoading] = useState(false)
  // Tracks whether we've already kicked off a fetch for this mount, so the
  // effect doesn't fire twice during React StrictMode's double-invoke in dev.
  const conditionFetchInFlight = useRef(false)

  const watering      = plant.reminders?.watering
  const frequencyDays = watering?.frequencyDays
  const daysAgo       = watering?.lastCompleted ? daysSince(watering.lastCompleted) : null
  const status        = healthStatus(daysAgo, frequencyDays)
  const diagnoses     = (plant.diagnoses || [])

  const hasSetupInfo = plant.setupInfo && (
    plant.setupInfo.soil ||
    plant.setupInfo.sunlight ||
    plant.setupInfo.temperature ||
    plant.setupInfo.humidity ||
    plant.setupInfo.fertilizer
  )
  const setupRows = hasSetupInfo
    ? INFO_ROWS.filter(({ key }) => !!plant.setupInfo[key])
    : []

  // ─── Plant health meters ────────────────────────────────────────────────────
  const waterMeter = reminderMeter(plant.reminders?.watering,    { good: 'Good', soon: 'Water Soon',     overdue: 'Needs Water'       })
  const fertMeter  = reminderMeter(plant.reminders?.fertilizing, { good: 'Good', soon: 'Fertilize Soon', overdue: 'Needs Fertilizing'  })
  const lightInfo  = lightForCategory(plant.category)
  const humidInfo  = humidityForZone(user?.zone)
  const soilHealth = soilMeter(plant.reminders?.repotting)

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
            content: `Plant: ${plant.name}${plant.category ? `\nCategory: ${plant.category}` : ''}
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

  // ─── Condition-based fertilizer ──────────────────────────────────────────
  // Trigger a fresh AI call when the plant's health score drops below 50
  // and the cached condition fertilizer is missing or stale.
  // Stale ⇔ no cache, no cached date, cached date older than 7 days, OR the
  // current health score has moved by >10 points from the cached score.
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
  const SCORE_DELTA   = 10

  useEffect(() => {
    if (!plant) return
    const health = calculateHealthScore(plant)
    if (health.score >= 50) {
      // Healthy enough — make sure the in-memory state matches and bail.
      setConditionFert(null)
      setConditionFertLoading(false)
      return
    }

    const cg          = plant.careGuide || {}
    const cached      = cg.conditionFertilizer
    const cachedAt    = cg.conditionFertilizerDate
    const cachedScore = cg.conditionFertilizerScore

    let stale = !cached || !cachedAt
    if (!stale) {
      const age = Date.now() - new Date(cachedAt).getTime()
      if (age > SEVEN_DAYS_MS) stale = true
      else if (typeof cachedScore !== 'number' ||
               Math.abs(health.score - cachedScore) > SCORE_DELTA) stale = true
    }

    if (stale) {
      if (!conditionFetchInFlight.current) fetchConditionFertilizer(health)
    } else {
      setConditionFert(cached)
    }
    // Re-run on plant change OR when the cached date is updated (after a
    // successful fetch — closes the loop without polling).
  }, [plantId, plant?.careGuide?.conditionFertilizerDate])

  async function fetchConditionFertilizer(health) {
    conditionFetchInFlight.current = true
    setConditionFertLoading(true)
    try {
      const currentMonth = MONTHS[new Date().getMonth()]
      const prompt = buildConditionPrompt({ plant, health, user, currentMonth })

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
          max_tokens: 1500,
          messages:   [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data    = await res.json()
      const text    = (data.content?.[0]?.text ?? '').trim()
      // Strip markdown fences if the AI wrapped the JSON anyway, then grab
      // the first [...] blob.
      const stripped = text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim()
      const match = stripped.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('Could not parse condition fertilizer JSON')
      const parsed    = JSON.parse(match[0])
      const validated = validateConditionFertilizer(parsed)
      if (!validated) throw new Error('No valid condition fertilizer items')

      setConditionFert(validated)

      // Persist to plant — re-read latest careGuide so we don't stomp on
      // soilMix/fertilizerSchedule that may have landed in a parallel write.
      const fresh = getPlants().find(p => p.id === plant.id)
      if (fresh) {
        updatePlant(plant.id, {
          careGuide: {
            ...(fresh.careGuide || {}),
            conditionFertilizer:      validated,
            conditionFertilizerDate:  new Date().toISOString(),
            conditionFertilizerScore: health.score,
          },
        })
      }
    } catch {
      // Silent — null state in the schedule card lets the user retry via
      // the "Regenerate Care Plan" button.
      setConditionFert(null)
    } finally {
      setConditionFertLoading(false)
      conditionFetchInFlight.current = false
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

  function handleToggleReminder(type) {
    const current = plant.reminders?.[type]
    if (!current) return
    updatePlant(plant.id, {
      reminders: {
        ...plant.reminders,
        [type]: { ...current, enabled: !current.enabled },
      },
    })
    setTick(t => t + 1)
    if (current.enabled && expandedReminder === type) setExpandedReminder(null)
  }

  function handleFrequencyChange(type, delta) {
    const current = plant.reminders?.[type]
    if (!current) return
    const next = Math.max(1, current.frequencyDays + delta)
    if (next === current.frequencyDays) return
    updatePlant(plant.id, {
      reminders: {
        ...plant.reminders,
        [type]: { ...current, frequencyDays: next },
      },
    })
    setTick(t => t + 1)
  }

  function handleMarkReminderDone(type) {
    markReminder(plant.id, type)
    setTick(t => t + 1)
    setExpandedReminder(null)
    setFlashedReminder(type)
    setTimeout(() => setFlashedReminder(null), 600)
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

      {/* ── Health Score (donut + breakdown) ──────────────────────────────── */}
      <div style={{ margin: '0 16px' }}>
        <HealthScoreDonut plant={plant} compact={false} />
      </div>

      {/* ── Location row ──────────────────────────────────────────────────── */}
      {plantLocation ? (
        <div style={{
          display:    'flex',
          alignItems: 'center',
          margin:     '0 16px 16px',
        }}>
          <span style={{
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
            {plantLocation.icon} {plantLocation.name}
          </span>
          <button
            onClick={() => setLocationPickerOpen(true)}
            style={{
              background: 'none',
              border:     'none',
              fontSize:   '12px',
              color:      'var(--muted)',
              marginLeft: '8px',
              cursor:     'pointer',
              padding:    0,
              fontFamily: 'var(--font-body)',
            }}
          >
            Change
          </button>
        </div>
      ) : (
        <button
          onClick={() => setLocationPickerOpen(true)}
          style={{
            background:   'transparent',
            border:       '1.5px dashed var(--green)',
            color:        'var(--green)',
            borderRadius: 'var(--radius)',
            padding:      '10px 16px',
            fontSize:     '14px',
            fontWeight:   500,
            width:        'calc(100% - 32px)',
            margin:       '0 16px 16px',
            cursor:       'pointer',
            fontFamily:   'var(--font-body)',
            display:      'block',
          }}
        >
          📍 Add Location
        </button>
      )}

      {/* ── Plant Info ──────────────────────────────────────────────────────── */}
      {hasSetupInfo && (
        <div style={{
          background:   '#fff',
          border:       '1.5px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding:      '16px',
          margin:       '0 16px 16px',
        }}>
          <p style={{
            fontFamily:  'var(--font-display)',
            fontWeight:  500,
            fontSize:    '16px',
            color:       'var(--text)',
            margin:      '0 0 12px',
          }}>
            🌿 Plant Care Guide
          </p>

          {setupRows.map(({ key, icon, label, iconComponent }, idx) => (
            <div
              key={key}
              style={{
                display:      'flex',
                alignItems:   'flex-start',
                gap:          '10px',
                padding:      '8px 0',
                borderBottom: idx < setupRows.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{
                display:       'flex',
                flexDirection: 'column',
                alignItems:    'center',
                width:         '90px',
                flexShrink:    0,
              }}>
                <span style={{
                  fontSize:      '20px',
                  lineHeight:    1,
                  marginBottom:  '4px',
                  display:       'inline-flex',
                  alignItems:    'center',
                  justifyContent: 'center',
                }}>
                  {iconComponent || icon}
                </span>
                <span style={{
                  fontSize:      '11px',
                  fontWeight:    600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color:         'var(--muted)',
                }}>
                  {label}
                </span>
              </div>
              <span style={{
                flex:       1,
                fontSize:   '14px',
                color:      'var(--text)',
                lineHeight: 1.5,
                paddingTop: '2px',
              }}>
                {plant.setupInfo[key]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Soil Mix Recipe (donut chart) ───────────────────────────────────── */}
      <div style={{ margin: '0 16px' }}>
        <SoilMixChart soilMix={plant.careGuide?.soilMix ?? null} />
      </div>

      {/* ── Fertilizer Schedule ────────────────────────────────────────────── */}
      {(() => {
        const health      = calculateHealthScore(plant)
        const isUnhealthy = health.score < 50
        const weakest     = isUnhealthy ? getWeakestFactor(health) : null

        return (
          <div style={{ margin: '0 16px' }}>
            {isUnhealthy && weakest && (
              <div style={{
                background:   '#FFF0F0',
                borderLeft:   '3px solid #EF4444',
                borderRadius: '8px',
                padding:      '10px 14px',
                marginBottom: '12px',
                fontSize:     '13px',
                color:        '#EF4444',
                lineHeight:   1.5,
                fontFamily:   'var(--font-body)',
              }}>
                🚨 {weakest.label} — showing treatment plan
              </div>
            )}

            {isUnhealthy ? (
              <FertilizerSchedule
                fertilizerSchedule={conditionFert}
                isConditionBased={true}
                conditionLoading={conditionFertLoading}
              />
            ) : (
              <FertilizerSchedule
                fertilizerSchedule={plant.careGuide?.fertilizerSchedule ?? null}
              />
            )}
          </div>
        )
      })()}

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

      {/* ── Other reminders ────────────────────────────────────────────────── */}
      <div style={card({ padding: '20px' })}>
        <span style={sectionLabel}>Other reminders</span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {OTHER_REMINDER_KEYS.map(type => {
            const r = plant.reminders?.[type]
            if (!r) return null
            const Icon       = REMINDER_ICONS[type]
            const meta       = REMINDER_TYPES[type]
            const status     = reminderStatus(r)
            const enabled    = r.enabled
            const isExpanded = enabled && expandedReminder === type
            const isFlashing = flashedReminder === type
            const canDecrease = r.frequencyDays > 1

            return (
              <div
                key={type}
                style={{
                  background:   isFlashing ? 'var(--green-light)' : '#fff',
                  border:       '1px solid var(--border)',
                  borderRadius: '12px',
                  overflow:     'hidden',
                  transition:   'background 0.3s ease',
                }}
              >
                {/* Header row */}
                <div
                  onClick={() => enabled && setExpandedReminder(isExpanded ? null : type)}
                  style={{
                    display:    'flex',
                    alignItems: 'center',
                    gap:        '12px',
                    padding:    '14px 16px',
                    cursor:     enabled ? 'pointer' : 'default',
                  }}
                >
                  <Icon
                    size={20}
                    color={enabled ? '#1D9E75' : '#9CA3AF'}
                    strokeWidth={1.8}
                    style={{ flexShrink: 0 }}
                  />
                  <span style={{
                    flex:       1,
                    fontSize:   '15px',
                    fontWeight: 500,
                    color:      enabled ? 'var(--text)' : '#9CA3AF',
                  }}>
                    {meta.label}
                  </span>
                  <span style={{
                    fontSize:   '13px',
                    fontWeight: status.bold ? 600 : 400,
                    color:      status.color,
                    flexShrink: 0,
                  }}>
                    {status.text}
                  </span>

                  {/* Toggle */}
                  <button
                    onClick={e => { e.stopPropagation(); handleToggleReminder(type) }}
                    aria-label={`${enabled ? 'Disable' : 'Enable'} ${meta.label}`}
                    style={{
                      width:        '40px',
                      height:       '24px',
                      background:   enabled ? 'var(--green)' : '#D1D5DB',
                      borderRadius: '12px',
                      border:       'none',
                      position:     'relative',
                      cursor:       'pointer',
                      transition:   'background 0.2s ease',
                      padding:      0,
                      flexShrink:   0,
                    }}
                  >
                    <span style={{
                      position:     'absolute',
                      top:          '2px',
                      left:         enabled ? '18px' : '2px',
                      width:        '20px',
                      height:       '20px',
                      borderRadius: '50%',
                      background:   '#fff',
                      transition:   'left 0.2s ease',
                      boxShadow:    '0 1px 3px rgba(0,0,0,0.15)',
                    }} />
                  </button>
                </div>

                {/* Editor */}
                {isExpanded && (
                  <div style={{
                    padding:       '14px 16px 16px',
                    borderTop:     '1px solid var(--border)',
                    display:       'flex',
                    flexDirection: 'column',
                    gap:           '14px',
                  }}>
                    {/* Frequency stepper */}
                    <div style={{
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'space-between',
                      gap:            '12px',
                    }}>
                      <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                        Frequency
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text)' }}>Every</span>
                        <button
                          onClick={() => handleFrequencyChange(type, -1)}
                          disabled={!canDecrease}
                          style={{
                            width:          '32px',
                            height:         '32px',
                            background:     canDecrease ? 'var(--green-light)' : '#F3F4F6',
                            color:          canDecrease ? 'var(--green-dark)' : '#D1D5DB',
                            border:         'none',
                            borderRadius:   '8px',
                            fontSize:       '18px',
                            fontWeight:     500,
                            cursor:         canDecrease ? 'pointer' : 'not-allowed',
                            display:        'flex',
                            alignItems:     'center',
                            justifyContent: 'center',
                            flexShrink:     0,
                            lineHeight:     1,
                          }}
                          aria-label="Decrease frequency"
                        >
                          −
                        </button>
                        <span style={{
                          fontSize:   '15px',
                          fontWeight: 600,
                          color:      'var(--text)',
                          minWidth:   '24px',
                          textAlign:  'center',
                        }}>
                          {r.frequencyDays}
                        </span>
                        <button
                          onClick={() => handleFrequencyChange(type, +1)}
                          style={{
                            width:          '32px',
                            height:         '32px',
                            background:     'var(--green-light)',
                            color:          'var(--green-dark)',
                            border:         'none',
                            borderRadius:   '8px',
                            fontSize:       '18px',
                            fontWeight:     500,
                            cursor:         'pointer',
                            display:        'flex',
                            alignItems:     'center',
                            justifyContent: 'center',
                            flexShrink:     0,
                            lineHeight:     1,
                          }}
                          aria-label="Increase frequency"
                        >
                          +
                        </button>
                        <span style={{ fontSize: '13px', color: 'var(--text)' }}>
                          {r.frequencyDays === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                    </div>

                    {/* Last done */}
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                      Last done: {lastDoneText(r)}
                    </p>

                    {/* Mark done button */}
                    <button
                      onClick={() => handleMarkReminderDone(type)}
                      style={{
                        width:        '100%',
                        padding:      '12px',
                        fontSize:     '14px',
                        fontWeight:   500,
                        fontFamily:   'var(--font-body)',
                        color:        '#fff',
                        background:   'var(--green)',
                        border:       'none',
                        borderRadius: '10px',
                        cursor:       'pointer',
                      }}
                    >
                      Mark done today
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Plant Meters ───────────────────────────────────────────────────── */}
      <div style={card({ padding: '20px' })}>
        <span style={sectionLabel}>Plant Meters</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <MeterBar icon="💧" label="Water Meter"      pct={waterMeter.pct} color={waterMeter.color} status={waterMeter.label} />
          <MeterBar icon="🌱" label="Fertilizer Meter" pct={fertMeter.pct}  color={fertMeter.color}  status={fertMeter.label}  />
          <MeterBar icon="☀️" label="Light Meter"      pct={lightInfo.pct}  color="#1D9E75"          status={lightInfo.label}  />
          <MeterBar icon="💧" label="Humidity Meter"   pct={humidInfo.pct}  color="#1D9E75"          status={humidInfo.label}  />
          <MeterBar icon="🪱" label="Soil Meter"       pct={soilHealth.pct} color={soilHealth.color}  status={soilHealth.label} />
        </div>
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

      {/* ── Location Picker bottom sheet ────────────────────────────────────── */}
      {locationPickerOpen && (() => {
        const bestCategories = plant.locationRecommendation?.bestCategories ?? []
        const recommended = bestCategories.length > 0
          ? locations.filter(l => bestCategories.includes(categoryLabel(l.category)))
          : []
        const recommendedIds = new Set(recommended.map(l => l.id))
        const others         = locations.filter(l => !recommendedIds.has(l.id))
        const showLabels     = recommended.length > 0 && others.length > 0

        const renderRow = (loc) => {
          const isRecommended = recommendedIds.has(loc.id)
          const isCurrent     = plant.locationId === loc.id
          return (
            <div
              key={loc.id}
              onClick={() => {
                updatePlant(plant.id, { locationId: loc.id })
                setLocationPickerOpen(false)
                setTick(t => t + 1)
              }}
              style={{
                display:      'flex',
                alignItems:   'center',
                padding:      '12px 16px',
                background:   '#fff',
                borderRadius: '12px',
                margin:       '0 16px 6px',
                cursor:       'pointer',
              }}
            >
              <span style={{ fontSize: '22px', marginRight: '10px', flexShrink: 0, lineHeight: 1 }}>
                {loc.icon}
              </span>
              <span style={{
                flex:       1,
                fontSize:   '14px',
                color:      'var(--text)',
                fontWeight: 500,
              }}>
                {loc.name}
              </span>
              {isRecommended && !isCurrent && (
                <span style={{ fontSize: '14px', flexShrink: 0 }}>✨</span>
              )}
              {isCurrent && (
                <span style={{
                  fontSize:     '10px',
                  color:        'var(--muted)',
                  background:   'var(--border)',
                  borderRadius: '10px',
                  padding:      '2px 6px',
                  flexShrink:   0,
                }}>
                  Current
                </span>
              )}
            </div>
          )
        }

        const groupLabelStyle = (color) => ({
          fontSize:      '11px',
          fontWeight:    600,
          color,
          padding:       '4px 16px',
          margin:        0,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        })

        return (
          <>
            <div
              onClick={() => setLocationPickerOpen(false)}
              style={{
                position:   'fixed',
                inset:      0,
                background: 'rgba(0,0,0,0.4)',
                zIndex:     200,
              }}
            />
            <div style={{
              position:      'fixed',
              bottom:        0,
              left:          0,
              right:         0,
              background:    'var(--cream)',
              borderRadius:  '20px 20px 0 0',
              maxHeight:     '85vh',
              overflowY:     'auto',
              zIndex:        201,
              paddingBottom: '100px',
            }}>
              {/* Drag handle */}
              <div style={{
                display:      'block',
                width:        '36px',
                height:       '4px',
                borderRadius: '2px',
                background:   'var(--border)',
                margin:       '12px auto 8px',
              }} />

              {/* Title */}
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                fontSize:   '20px',
                margin:     0,
                padding:    '0 16px 12px',
                color:      'var(--text)',
              }}>
                Choose Location
              </h2>

              {/* Recommendation banner */}
              <div style={{
                background:   'rgba(29,158,117,0.08)',
                border:       '1px solid rgba(29,158,117,0.2)',
                borderRadius: '12px',
                padding:      '12px 14px',
                margin:       '0 16px 12px',
              }}>
                {bestCategories.length > 0 ? (
                  <>
                    <p style={{
                      fontSize:   '12px',
                      fontWeight: 600,
                      color:      'var(--green)',
                      margin:     0,
                    }}>
                      🌿 Best for {plant.name}:
                    </p>
                    <div style={{
                      display:  'flex',
                      flexWrap: 'wrap',
                      gap:      '6px',
                      margin:   '6px 0 0',
                    }}>
                      {bestCategories.map(cat => (
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
                    {plant.locationRecommendation?.reason && (
                      <p style={{
                        fontSize: '12px',
                        color:    'var(--muted)',
                        margin:   '4px 0 0',
                        lineHeight: 1.5,
                      }}>
                        {plant.locationRecommendation.reason}
                      </p>
                    )}
                  </>
                ) : (
                  <p style={{
                    fontSize: '12px',
                    color:    'var(--muted)',
                    margin:   0,
                    lineHeight: 1.5,
                  }}>
                    🌿 Tip: Match your plant's light and humidity needs to the right spot
                  </p>
                )}
              </div>

              {/* Location list */}
              {showLabels && <p style={groupLabelStyle('var(--green)')}>✨ Recommended</p>}
              {recommended.map(renderRow)}
              {showLabels && <p style={groupLabelStyle('var(--muted)')}>Other Locations</p>}
              {others.map(renderRow)}

              {/* Create new location — always visible */}
              <button
                onClick={() => {
                  setLocationPickerOpen(false)
                  setAddLocationOpen(true)
                }}
                style={{
                  display:      'block',
                  width:        'calc(100% - 32px)',
                  background:   'transparent',
                  border:       '1.5px dashed var(--green)',
                  color:        'var(--green)',
                  borderRadius: 'var(--radius)',
                  padding:      '14px 16px',
                  fontSize:     '14px',
                  fontWeight:   500,
                  margin:       '12px 16px 0',
                  cursor:       'pointer',
                  fontFamily:   'var(--font-body)',
                }}
              >
                + Create new location
              </button>

              {/* Remove location */}
              {plant.locationId && (
                <button
                  onClick={() => {
                    updatePlant(plant.id, { locationId: undefined })
                    setLocationPickerOpen(false)
                    setTick(t => t + 1)
                  }}
                  style={{
                    display:    'block',
                    width:      '100%',
                    background: 'none',
                    border:     'none',
                    fontSize:   '13px',
                    color:      'var(--muted)',
                    textAlign:  'center',
                    padding:    '12px',
                    margin:     '4px 0 0',
                    cursor:     'pointer',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Remove location
                </button>
              )}
            </div>
          </>
        )
      })()}

      {/* ── Add Location sheet (from picker) ───────────────────────────────── */}
      {addLocationOpen && (
        <AddLocationSheet
          onClose={() => setAddLocationOpen(false)}
          onSave={data => {
            const newLoc = addLocation(data)
            updatePlant(plant.id, { locationId: newLoc.id })
            setAddLocationOpen(false)
            setTick(t => t + 1)
          }}
        />
      )}

      <BottomNav />
    </div>
  )
}
