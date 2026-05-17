import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStorage } from '../hooks/useStorage.js'
import { plantshubCatalogue } from '../data/plantshubCatalogue.js'

// ─── Wizard option lists ────────────────────────────────────────────────────

const SPACE_OPTIONS = [
  { value: 'balcony',      emoji: '🪟', label: 'Balcony'                    },
  { value: 'indoor',       emoji: '🏠', label: 'Indoor (living/bedroom)'   },
  { value: 'office-desk',  emoji: '💼', label: 'Office desk'                },
  { value: 'outdoor',      emoji: '🌳', label: 'Outdoor garden'             },
  { value: 'kitchen',      emoji: '🍳', label: 'Kitchen'                    },
  { value: 'bathroom',     emoji: '🚿', label: 'Bathroom'                   },
]

const LIGHT_OPTIONS = [
  { value: 'direct-sun',     emoji: '☀️', label: 'Direct sunlight (4–6+ hrs)' },
  { value: 'bright-indirect', emoji: '🌤️', label: 'Bright indirect light'      },
  { value: 'medium',         emoji: '⛅', label: 'Medium (near window)'        },
  { value: 'low',            emoji: '🌥️', label: 'Low (away from window)'      },
  { value: 'morning-sun',    emoji: '🪟', label: 'Morning sun only'            },
  { value: 'afternoon-sun',  emoji: '🌅', label: 'Afternoon sun only'          },
]

const MAINTENANCE_OPTIONS = [
  { value: 'low',    emoji: '🪴', label: 'Low — once a week',     desc: 'Forgiving plants that survive neglect' },
  { value: 'medium', emoji: '🌿', label: 'Medium — few times/week', desc: 'Need regular but not daily attention' },
  { value: 'high',   emoji: '🌳', label: 'High — daily care',     desc: 'Plants that thrive with consistent care' },
]

const EXPERIENCE_OPTIONS = [
  { value: 'beginner',  emoji: '🌱',  label: 'Beginner — first plant'             },
  { value: 'some',      emoji: '🌿',  label: 'Some experience — killed a few'      },
  { value: 'pro',       emoji: '🧑‍🌾', label: 'Pro gardener — many years'         },
]

const TOTAL_STEPS = 5
const INITIAL_RESULT_COUNT = 10
const RESULT_PAGE_SIZE     = 15

// Indexed lookup so the results page can hydrate AI ids back to full records.
const PLANT_BY_ID = new Map(plantshubCatalogue.map(p => [p.id, p]))

// ─── Helpers ────────────────────────────────────────────────────────────────

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = e => resolve(e.target.result)
    reader.onerror = () => reject(new Error('Could not read photo'))
    reader.readAsDataURL(file)
  })
}

// Project to the minimum fields the AI needs to pick matches — drops images,
// URLs, prices, etc. so the prompt stays compact even at 100 plants.
function projectCatalogue(limit = 100) {
  return plantshubCatalogue.slice(0, limit).map(p => ({
    id:        p.id,
    name:      p.name,
    locations: p.locations,
    types:     p.types,
    climate:   p.climate,
    family:    p.family,
    inStock:   p.inStock,
  }))
}

function buildPromptText(user, answers, catalogueSlim) {
  const photoLine = answers.photo ? '- Photo provided of their space\n' : ''
  return `You are a plant expert helping Indian users choose plants.

User context:
- Location: ${user.city || 'India'} (Zone ${user.zone || 'unknown'} - ${user.zoneName || 'unknown'})
- Space: ${answers.spaceType}
- Light: ${answers.lightCondition}
- Maintenance commitment: ${answers.maintenance}
- Experience: ${answers.experience}
${photoLine}
Available plants in Plantshub catalogue:
${JSON.stringify(catalogueSlim)}
(showing top ${catalogueSlim.length}, total ${plantshubCatalogue.length} plants)

Task:
1. Pick 20-30 plants from the catalogue that match user's needs
2. Prioritize plants suitable for user's climate zone
3. Match space requirements (indoor/balcony/etc)
4. Consider light needs
5. Match maintenance level to user experience
6. For beginners, prefer hardy plants
7. For experts, can include challenging plants

Return JSON only (no commentary), with this exact shape:
{
  "recommendations": [
    { "plantId": "<id from catalogue>", "matchScore": 95, "whyPerfect": "One sentence." }
  ]
}

Return 20-30 recommendations sorted by matchScore descending.`
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function FindPlants() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { getUser, getFinderSession, saveFinderSession, clearFinderSession } = useStorage()
  const user = getUser()

  const [currentStep, setCurrentStep] = useState(1)
  const [answers, setAnswers] = useState({
    photo:           null,
    spaceType:       '',
    lightCondition: '',
    maintenance:     '',
    experience:      '',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [results, setResults] = useState(null)   // null | array of {plantId, matchScore, whyPerfect}
  const [savedAnswers, setSavedAnswers] = useState(null)  // for "view last session"
  const [stockFilter, setStockFilter]   = useState('all')
  const [visibleCount, setVisibleCount] = useState(INITIAL_RESULT_COUNT)

  const photoInputRef = useRef(null)

  // ─── Load saved session if ?session=last ────────────────────────────────
  useEffect(() => {
    if (searchParams.get('session') !== 'last') return
    const s = getFinderSession()
    if (!s) return
    setSavedAnswers(s.answers)
    setAnswers(s.answers)
    setResults(s.results)
  }, [searchParams])

  // ─── Step navigation ─────────────────────────────────────────────────────
  function back() {
    setError(null)
    if (currentStep === 1) { navigate(-1); return }
    setCurrentStep(s => s - 1)
  }
  function next() {
    setError(null)
    setCurrentStep(s => Math.min(s + 1, TOTAL_STEPS))
  }
  function select(field, value) {
    setAnswers(a => ({ ...a, [field]: value }))
  }

  // ─── Photo handler ───────────────────────────────────────────────────────
  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo too large — max 5 MB.')
      return
    }
    const dataURL = await readAsDataURL(file)
    setAnswers(a => ({ ...a, photo: dataURL }))
  }

  // ─── AI submit ───────────────────────────────────────────────────────────
  async function submit() {
    setLoading(true)
    setError(null)
    setResults(null)
    try {
      const content = []
      if (answers.photo) {
        const [meta, rawData] = answers.photo.split(',')
        const mediaType = meta.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
        content.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: rawData },
        })
      }
      const slim = projectCatalogue(100)
      content.push({ type: 'text', text: buildPromptText(user || {}, answers, slim) })

      const res = await fetch('https://plantsaathi.com/api/claude-proxy.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages:   [{ role: 'user', content }],
        }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error?.message ?? `API error ${res.status}`)
      }
      const apiData   = await res.json()
      const rawText   = apiData.content?.[0]?.text ?? ''
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Could not parse AI response — please try again')
      const parsed = JSON.parse(jsonMatch[0])
      const recs   = (parsed.recommendations || [])
        .filter(r => r.plantId && PLANT_BY_ID.has(String(r.plantId)))
      setResults(recs)
      setVisibleCount(INITIAL_RESULT_COUNT)
      // Strip photo before persisting — base64 blobs can be several MB and
      // localStorage is capped around 5–10 MB across all keys.
      const { photo: _drop, ...answersForStorage } = answers
      saveFinderSession({ answers: { ...answersForStorage, photo: null }, results: recs })
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Auto-fire submit when wizard finishes (step 5 → Continue moves into
  // submit, which sets loading then results). Triggered by `kickOff` flag.
  function finish() {
    submit()
  }

  function startOver() {
    clearFinderSession()
    setSavedAnswers(null)
    setResults(null)
    setAnswers({ photo: null, spaceType: '', lightCondition: '', maintenance: '', experience: '' })
    setCurrentStep(1)
    setError(null)
  }

  // ─── Shared styles ───────────────────────────────────────────────────────
  const page = {
    minHeight:  '100svh',
    background: '#f0ede6',
    fontFamily: 'var(--font-body)',
    color:      'var(--text)',
    paddingBottom: '120px',
  }
  const stickyHeader = {
    position:   'sticky',
    top:        0,
    zIndex:     30,
    background: '#1D9E75',
    padding:    '14px 16px',
    display:    'flex',
    alignItems: 'center',
    gap:        '12px',
  }
  const headerBack = {
    background: 'none',
    border:     'none',
    color:      '#fff',
    fontSize:   '22px',
    lineHeight: 1,
    cursor:     'pointer',
    padding:    '4px 6px',
    fontFamily: 'var(--font-body)',
  }
  const headerTitle = {
    fontFamily: '"DM Serif Display", serif',
    fontSize:   '17px',
    color:      '#fff',
  }
  const questionH = {
    fontFamily: '"DM Serif Display", serif',
    fontSize:   '22px',
    fontWeight: 700,
    color:      '#1a1a1a',
    padding:    '20px 16px 8px',
    margin:     0,
    lineHeight: 1.25,
  }
  const subtitle = {
    fontSize: '13px',
    color:    '#888',
    padding:  '0 16px 20px',
    margin:   0,
  }
  const optionCard = (selected) => ({
    background:   selected ? '#E8F5F0' : '#fff',
    border:       `1.5px solid ${selected ? '#1D9E75' : '#E0E0E0'}`,
    borderRadius: '14px',
    padding:      '20px 12px',
    textAlign:    'center',
    cursor:       'pointer',
    transition:   'all 0.2s',
    boxShadow:    selected ? '0 0 0 3px rgba(29,158,117,0.1)' : 'none',
    fontFamily:   'var(--font-body)',
  })
  const optionEmoji = {
    fontSize:     '32px',
    display:      'block',
    marginBottom: '8px',
    lineHeight:   1,
    fontFamily:   '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif',
  }
  const optionLabel = {
    fontSize:   '13px',
    fontWeight: 600,
    color:      '#1a1a1a',
    lineHeight: 1.25,
  }
  const footer = {
    position:   'fixed',
    bottom:     0,
    left:       0,
    right:      0,
    padding:    '16px',
    background: 'linear-gradient(to top, #f0ede6 80%, rgba(240,237,230,0))',
    display:    'flex',
    gap:        '12px',
    zIndex:     30,
  }
  const btnSecondary = {
    flex:         1,
    background:   '#fff',
    border:       '1.5px solid #1D9E75',
    color:        '#1D9E75',
    borderRadius: '24px',
    padding:      '12px',
    fontSize:     '14px',
    fontWeight:   600,
    cursor:       'pointer',
    fontFamily:   'var(--font-body)',
  }
  const btnPrimary = (enabled = true) => ({
    flex:         2,
    background:   '#1D9E75',
    color:        '#fff',
    border:       'none',
    borderRadius: '24px',
    padding:      '12px',
    fontSize:     '14px',
    fontWeight:   600,
    cursor:       enabled ? 'pointer' : 'not-allowed',
    opacity:      enabled ? 1 : 0.45,
    fontFamily:   'var(--font-body)',
  })

  // ─── Progress dots ───────────────────────────────────────────────────────
  function ProgressDots() {
    return (
      <div style={{
        display:    'flex',
        gap:        '6px',
        padding:    '12px 16px',
        background: '#fff',
        borderBottom: '1px solid #eee',
      }}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => {
          const n = i + 1
          const active   = n === currentStep
          const done     = n <  currentStep
          return (
            <div key={n} style={{
              width:        active ? '30px' : '8px',
              height:       '6px',
              background:   (active || done) ? '#1D9E75' : '#E0E0E0',
              borderRadius: '3px',
              transition:   'width 0.25s ease',
            }} />
          )
        })}
      </div>
    )
  }

  // ─── Option grid (steps 2 & 3) ───────────────────────────────────────────
  function OptionGrid({ field, options, columns = 2 }) {
    return (
      <div style={{
        padding:             '0 16px',
        display:             'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap:                 '12px',
      }}>
        {options.map(o => (
          <button
            key={o.value}
            onClick={() => select(field, o.value)}
            style={optionCard(answers[field] === o.value)}
          >
            <span style={optionEmoji}>{o.emoji}</span>
            <div style={optionLabel}>{o.label}</div>
          </button>
        ))}
      </div>
    )
  }

  // ─── Option list with descriptions (step 4) ──────────────────────────────
  function OptionListDesc({ field, options }) {
    return (
      <div style={{
        padding: '0 16px',
        display: 'flex',
        flexDirection: 'column',
        gap:     '12px',
      }}>
        {options.map(o => (
          <button
            key={o.value}
            onClick={() => select(field, o.value)}
            style={{
              ...optionCard(answers[field] === o.value),
              textAlign: 'left',
              padding:   '16px',
              display:   'flex',
              alignItems: 'center',
              gap:       '14px',
            }}
          >
            <span style={{ ...optionEmoji, marginBottom: 0, fontSize: '28px' }}>{o.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ ...optionLabel, fontSize: '14px' }}>{o.label}</div>
              {o.desc && (
                <div style={{
                  fontSize:   '11px',
                  color:      '#888',
                  marginTop:  '4px',
                  lineHeight: 1.4,
                }}>
                  {o.desc}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    )
  }

  // ─── Step renderers ──────────────────────────────────────────────────────

  function StepPhoto() {
    const hasPhoto = !!answers.photo
    return (
      <>
        <h1 style={questionH}>📸 Show me your space</h1>
        <p style={subtitle}>Upload a photo so AI can analyze light and space (optional)</p>
        <div
          onClick={() => photoInputRef.current?.click()}
          style={{
            margin:       '0 16px',
            padding:      hasPhoto ? '12px' : '40px 20px',
            border:       '2px dashed #1D9E75',
            borderRadius: '16px',
            background:   '#F9FDFB',
            textAlign:    'center',
            cursor:       'pointer',
          }}
        >
          {hasPhoto ? (
            <>
              <img
                src={answers.photo}
                alt="Your space"
                style={{
                  maxHeight:    '300px',
                  width:        '100%',
                  objectFit:    'contain',
                  borderRadius: '12px',
                  display:      'block',
                }}
              />
              <div style={{
                fontSize:  '13px',
                color:     '#1D9E75',
                marginTop: '10px',
                fontWeight: 600,
              }}>
                📷 Change photo
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '48px', lineHeight: 1 }}>📷</div>
              <div style={{
                fontSize:   '14px',
                color:      '#1D9E75',
                marginTop:  '12px',
                fontWeight: 600,
              }}>
                Tap to upload or take photo
              </div>
              <div style={{
                fontSize:  '11px',
                color:     '#888',
                marginTop: '4px',
              }}>
                JPG, PNG, max 5 MB
              </div>
            </>
          )}
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          style={{ display: 'none' }}
        />
        <div style={footer}>
          <button style={btnSecondary} onClick={next}>Skip</button>
          <button style={btnPrimary(true)} onClick={next}>Continue →</button>
        </div>
      </>
    )
  }

  function StepWithGrid(field, title, options, columns = 2) {
    const enabled = !!answers[field]
    return (
      <>
        <h1 style={questionH}>{title}</h1>
        <OptionGrid field={field} options={options} columns={columns} />
        <div style={footer}>
          <button style={btnSecondary} onClick={back}>← Back</button>
          <button
            style={btnPrimary(enabled)}
            disabled={!enabled}
            onClick={currentStep === TOTAL_STEPS ? finish : next}
          >
            {currentStep === TOTAL_STEPS ? '✨ Find my plants' : 'Continue →'}
          </button>
        </div>
      </>
    )
  }

  function StepWithList(field, title, options) {
    const enabled = !!answers[field]
    return (
      <>
        <h1 style={questionH}>{title}</h1>
        <OptionListDesc field={field} options={options} />
        <div style={footer}>
          <button style={btnSecondary} onClick={back}>← Back</button>
          <button
            style={btnPrimary(enabled)}
            disabled={!enabled}
            onClick={currentStep === TOTAL_STEPS ? finish : next}
          >
            {currentStep === TOTAL_STEPS ? '✨ Find my plants' : 'Continue →'}
          </button>
        </div>
      </>
    )
  }

  // ─── Loading screen ──────────────────────────────────────────────────────
  function LoadingScreen() {
    return (
      <div style={{
        minHeight:      '100svh',
        background:     '#F9FDFB',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '24px',
        textAlign:      'center',
      }}>
        <style>{`
          @keyframes findPulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50%      { transform: scale(1.1); opacity: 0.75; }
          }
        `}</style>
        <div style={{
          fontSize:    '64px',
          lineHeight:  1,
          animation:   'findPulse 1.4s ease-in-out infinite',
        }}>
          🔮
        </div>
        <div style={{
          fontSize:   '16px',
          color:      '#1D9E75',
          marginTop:  '20px',
          fontWeight: 600,
        }}>
          Finding perfect plants for you…
        </div>
        <div style={{
          fontSize:  '12px',
          color:     '#888',
          marginTop: '4px',
          lineHeight: 1.5,
          maxWidth:  '260px',
        }}>
          Analyzing your space, light, climate, and care needs
        </div>
      </div>
    )
  }

  // ─── Results page ────────────────────────────────────────────────────────
  function ResultsPage() {
    // Hydrate AI ids → full plant records, drop unknown ids.
    const hydrated = useMemo(() => {
      if (!results) return []
      return results
        .map(r => {
          const plant = PLANT_BY_ID.get(String(r.plantId))
          return plant ? { ...r, plant } : null
        })
        .filter(Boolean)
    }, [results])

    const inStockCount    = hydrated.filter(r => r.plant.inStock).length
    const outOfStockCount = hydrated.length - inStockCount
    const filtered = hydrated.filter(r =>
      stockFilter === 'all'         ? true
    : stockFilter === 'in-stock'    ? r.plant.inStock
    : !r.plant.inStock
    )
    const visible    = filtered.slice(0, visibleCount)
    const hasMore    = visible.length < filtered.length
    const nextChunk  = Math.min(RESULT_PAGE_SIZE, filtered.length - visible.length)

    if (hydrated.length === 0) {
      return (
        <div style={page}>
          <div style={stickyHeader}>
            <button style={headerBack} onClick={() => navigate('/home')} aria-label="Back">←</button>
            <div style={headerTitle}>🌿 Your Perfect Plants</div>
          </div>
          <div style={{
            margin:      '60px 24px',
            padding:     '32px 24px',
            background:  '#fff',
            borderRadius:'16px',
            textAlign:   'center',
          }}>
            <div style={{ fontSize: '64px', lineHeight: 1 }}>🤷</div>
            <div style={{
              fontFamily: '"DM Serif Display", serif',
              fontSize:   '20px',
              marginTop:  '14px',
              color:      '#1a1a1a',
            }}>
              Couldn't find perfect matches
            </div>
            <div style={{
              fontSize:   '13px',
              color:      '#888',
              marginTop:  '6px',
              lineHeight: 1.5,
            }}>
              Try adjusting your preferences
            </div>
            <button
              onClick={startOver}
              style={{
                marginTop:    '20px',
                background:   '#1D9E75',
                color:        '#fff',
                border:       'none',
                borderRadius: '24px',
                padding:      '12px 24px',
                fontSize:     '14px',
                fontWeight:   600,
                cursor:       'pointer',
                fontFamily:   'var(--font-body)',
              }}
            >
              ← Start over
            </button>
          </div>
        </div>
      )
    }

    return (
      <div style={page}>
        {/* Header */}
        <div style={stickyHeader}>
          <button style={headerBack} onClick={() => navigate('/home')} aria-label="Back">←</button>
          <div>
            <div style={headerTitle}>🌿 Your Perfect Plants ({hydrated.length})</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', marginTop: '2px' }}>
              Based on your space and preferences
            </div>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{
          position:   'sticky',
          top:        '60px',  // sits below header
          zIndex:     20,
          background: '#f0ede6',
          padding:    '12px 16px',
          display:    'flex',
          gap:        '8px',
          overflowX:  'auto',
          scrollbarWidth: 'none',
        }}>
          {[
            { id: 'all',          label: `All (${hydrated.length})` },
            { id: 'in-stock',     label: `✅ Available (${inStockCount})` },
            { id: 'out-of-stock', label: `❌ Out of stock (${outOfStockCount})` },
          ].map(opt => {
            const on = stockFilter === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => { setStockFilter(opt.id); setVisibleCount(INITIAL_RESULT_COUNT) }}
                style={{
                  background:   on ? '#1D9E75' : '#fff',
                  color:        on ? '#fff'    : '#1D9E75',
                  border:       `1.5px solid ${on ? '#1D9E75' : '#E0E0E0'}`,
                  borderRadius: '24px',
                  padding:      '6px 12px',
                  fontSize:     '12px',
                  fontWeight:   600,
                  whiteSpace:   'nowrap',
                  flexShrink:   0,
                  cursor:       'pointer',
                  fontFamily:   'var(--font-body)',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* Grid */}
        <div style={{
          padding:             '4px 16px 24px',
          display:             'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap:                 '12px',
        }}>
          {visible.map(r => <ResultCard key={r.plant.id} rec={r} />)}
        </div>

        {hasMore && (
          <div style={{ textAlign: 'center', padding: '4px 16px 24px' }}>
            <button
              onClick={() => setVisibleCount(c => c + RESULT_PAGE_SIZE)}
              style={{
                background:   '#1D9E75',
                color:        '#fff',
                border:       'none',
                borderRadius: '24px',
                padding:      '10px 24px',
                fontSize:     '14px',
                fontWeight:   600,
                cursor:       'pointer',
                fontFamily:   'var(--font-body)',
              }}
            >
              Show more ({nextChunk} more)
            </button>
          </div>
        )}

        {savedAnswers && (
          <div style={{
            margin:     '0 16px 24px',
            padding:    '14px',
            background: '#fff',
            borderRadius: '14px',
            display:    'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap:        '12px',
          }}>
            <div style={{ fontSize: '12px', color: '#666', lineHeight: 1.4 }}>
              Saved from your last session — want fresh recommendations?
            </div>
            <button
              onClick={startOver}
              style={{
                background:   '#fff',
                color:        '#1D9E75',
                border:       '1.5px solid #1D9E75',
                borderRadius: '20px',
                padding:      '6px 14px',
                fontSize:     '12px',
                fontWeight:   600,
                cursor:       'pointer',
                whiteSpace:   'nowrap',
                fontFamily:   'var(--font-body)',
              }}
            >
              Start over
            </button>
          </div>
        )}
      </div>
    )
  }

  // ─── Result card ─────────────────────────────────────────────────────────
  function ResultCard({ rec }) {
    const { plant, matchScore, whyPerfect } = rec
    const [imgErr, setImgErr] = useState(false)
    return (
      <div style={{
        background:   '#fff',
        borderRadius: '16px',
        overflow:     'hidden',
        boxShadow:    '0 2px 8px rgba(0,0,0,0.06)',
        position:     'relative',
        display:      'flex',
        flexDirection: 'column',
      }}>
        <div style={{ height: '140px', position: 'relative', overflow: 'hidden' }}>
          {plant.image && !imgErr ? (
            <img
              src={plant.image}
              alt={plant.name}
              loading="lazy"
              onError={() => setImgErr(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%', background: '#E8F5F0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '48px',
            }}>{plant.emoji}</div>
          )}
          <div style={{
            position:     'absolute',
            top:          '8px',
            left:         '8px',
            fontSize:     '10px',
            fontWeight:   600,
            color:        '#fff',
            padding:      '3px 8px',
            borderRadius: '10px',
            background:   plant.inStock ? '#1D9E75' : '#FF6B6B',
          }}>
            {plant.inStock ? '✓ In Stock' : 'Out of Stock'}
          </div>
          {typeof matchScore === 'number' && (
            <div style={{
              position:     'absolute',
              top:          '8px',
              right:        '8px',
              background:   '#1D9E75',
              color:        '#fff',
              borderRadius: '12px',
              padding:      '3px 8px',
              fontSize:     '10px',
              fontWeight:   700,
            }}>
              {Math.round(matchScore)}% match
            </div>
          )}
        </div>

        <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{
            fontSize:        '13px',
            fontWeight:      600,
            color:           '#1a1a1a',
            lineHeight:      1.3,
            display:         '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow:        'hidden',
            textOverflow:    'ellipsis',
          }}>
            {plant.name}
          </div>

          <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {plant.salePrice != null ? (
              <>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#1D9E75' }}>₹{plant.salePrice}</span>
                <span style={{ fontSize: '12px', color: '#aaa', textDecoration: 'line-through' }}>₹{plant.price}</span>
              </>
            ) : (
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#1D9E75' }}>₹{plant.price}</span>
            )}
          </div>

          <a
            href={plant.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginTop:    '8px',
              borderRadius: '12px',
              padding:      '6px 0',
              fontSize:     '11px',
              fontWeight:   500,
              textAlign:    'center',
              textDecoration: 'none',
              background:   '#1D9E75',
              color:        '#fff',
              fontFamily:   'var(--font-body)',
            }}
          >
            🛒 Buy on Plantshub
          </a>

          {whyPerfect && (
            <div style={{
              background:   '#F9FDFB',
              borderRadius: '8px',
              padding:      '6px 8px',
              marginTop:    '8px',
              fontSize:     '11px',
              color:        '#555',
              fontStyle:    'italic',
              lineHeight:   1.4,
            }}>
              💡 {whyPerfect}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Top-level render dispatcher ─────────────────────────────────────────

  // Results take precedence over wizard once we have them.
  if (results) return <ResultsPage />
  if (loading) return <LoadingScreen />

  // Wizard steps
  return (
    <div style={page}>
      <div style={stickyHeader}>
        <button style={headerBack} onClick={back} aria-label="Back">←</button>
        <div style={headerTitle}>🔮 Find Plants for My Space</div>
      </div>
      <ProgressDots />

      <style>{`
        @keyframes findFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        key={currentStep}
        style={{ animation: 'findFadeIn 0.25s ease-out' }}
      >
        {currentStep === 1 && <StepPhoto />}
        {currentStep === 2 && StepWithGrid('spaceType',      '🏠 Where will you keep the plant?', SPACE_OPTIONS, 2)}
        {currentStep === 3 && StepWithGrid('lightCondition', '☀️ How much light does the space get?', LIGHT_OPTIONS, 2)}
        {currentStep === 4 && StepWithList('maintenance',    '💧 How much time can you give?',    MAINTENANCE_OPTIONS)}
        {currentStep === 5 && StepWithList('experience',     '🌱 How experienced are you?',       EXPERIENCE_OPTIONS)}
      </div>

      {error && (
        <div style={{
          margin:       '0 16px',
          marginBottom: '88px',
          padding:      '12px',
          background:   '#FEE2E2',
          color:        '#B91C1C',
          borderRadius: '12px',
          fontSize:     '13px',
        }}>
          {error}
        </div>
      )}
    </div>
  )
}
