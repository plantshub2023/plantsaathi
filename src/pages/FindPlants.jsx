import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStorage } from '../hooks/useStorage.js'
import { plantshubCatalogue } from '../data/plantshubCatalogue.js'
import { trackFinderCompleted } from '../utils/analytics.js'
import usePageTitle from '../hooks/usePageTitle.js'

// ─── Wizard option lists ────────────────────────────────────────────────────

// Internal space values are deliberately coarse — 4 buckets. The label can
// be richer (e.g. "Indoor (living/bedroom)") for display, but matching and
// per-space option filtering keys off the slug.
const SPACE_OPTIONS = [
  { value: 'indoor',  emoji: '🏠', label: 'Indoor (living/bedroom)' },
  { value: 'balcony', emoji: '🪴', label: 'Balcony'                  },
  { value: 'window',  emoji: '🪟', label: 'Window sill'              },
  { value: 'outdoor', emoji: '🌳', label: 'Outdoor garden'           },
]
const SPACE_VALUES = new Set(SPACE_OPTIONS.map(o => o.value))

const LIGHT_OPTIONS = [
  { value: 'direct-sun',     emoji: '☀️', label: 'Direct sunlight (4–6+ hrs)' },
  { value: 'bright-indirect', emoji: '🌤️', label: 'Bright indirect light'      },
  { value: 'medium',         emoji: '⛅', label: 'Medium (near window)'        },
  { value: 'low',            emoji: '🌥️', label: 'Low (away from window)'      },
  { value: 'morning-sun',    emoji: '🌄', label: 'Morning sun only'            },
  { value: 'afternoon-sun',  emoji: '🌅', label: 'Afternoon sun only'          },
  { value: 'filtered',       emoji: '🪟', label: 'Filtered light (through curtain)' },
  { value: 'partial-shade',  emoji: '🍃', label: 'Partial shade'               },
  { value: 'mostly-shaded',  emoji: '🌑', label: 'Mostly shaded'               },
]

// Per-space subsets shown in Q3. Order = on-screen order. Any space not
// listed (or null) falls through to the full LIGHT_OPTIONS list.
const LIGHT_BY_SPACE = {
  indoor:  ['bright-indirect', 'medium', 'low', 'filtered'],
  balcony: ['direct-sun', 'bright-indirect', 'morning-sun', 'afternoon-sun', 'mostly-shaded'],
  window:  ['bright-indirect', 'morning-sun', 'afternoon-sun', 'medium'],
  outdoor: ['direct-sun', 'morning-sun', 'afternoon-sun', 'bright-indirect', 'partial-shade'],
}

// The plant matching prompt only knows about the original 6 light terms.
// New values get a parenthetical hint appended so the AI can score them.
const LIGHT_SYNONYMS = {
  'filtered':      'similar to medium or bright-indirect',
  'mostly-shaded': 'similar to low',
  'partial-shade': 'similar to bright-indirect',
}
const KNOWN_LIGHT_VALUES = new Set(LIGHT_OPTIONS.map(o => o.value))

function getLightOptions(spaceType) {
  const subset = LIGHT_BY_SPACE[spaceType]
  if (!subset) return LIGHT_OPTIONS
  const byValue = new Map(LIGHT_OPTIONS.map(o => [o.value, o]))
  return subset.map(v => byValue.get(v)).filter(Boolean)
}

function describeLight(value) {
  if (!value) return value
  return LIGHT_SYNONYMS[value] ? `${value} (${LIGHT_SYNONYMS[value]})` : value
}

const MAINTENANCE_OPTIONS = [
  { value: 'low',    emoji: '🪴', label: 'Low — once a week',     desc: 'Forgiving plants that survive neglect' },
  { value: 'medium', emoji: '🌿', label: 'Medium — few times/week', desc: 'Need regular but not daily attention' },
  { value: 'high',   emoji: '🌳', label: 'High — daily care',     desc: 'Plants that thrive with consistent care' },
]

const EXPERIENCE_OPTIONS = [
  { value: 'beginner', emoji: '🌱',  label: 'Beginner — first plant'         },
  { value: 'some',     emoji: '🌿',  label: 'Some experience — killed a few' },
  { value: 'pro',      emoji: '🧑‍🌾', label: 'Pro gardener — many years'      },
]

const INITIAL_RESULT_COUNT = 10
const RESULT_PAGE_SIZE     = 15
const DETECT_TIMEOUT_MS    = 30_000   // spec says 3s but vision calls need ~5–15s
const MIN_CONFIDENCE       = 70

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

function splitDataURL(dataURL) {
  const [meta, rawData] = dataURL.split(',')
  const mediaType = meta.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  return { mediaType, rawData }
}

// Project to the minimum fields the AI needs to pick matches — drops images,
// URLs, prices, etc. so the prompt stays compact at 100 plants.
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

function buildMatchPrompt(user, answers, catalogueSlim) {
  return `You are a plant expert helping Indian users choose plants.

User context:
- Location: ${user.city || 'India'} (Zone ${user.zone || 'unknown'} - ${user.zoneName || 'unknown'})
- Space: ${answers.spaceType}
- Light: ${describeLight(answers.lightCondition)}
- Maintenance commitment: ${answers.maintenance}
- Experience: ${answers.experience}

Available plants from Plantshub catalogue:
${JSON.stringify(catalogueSlim)}
(showing top ${catalogueSlim.length}, total ${plantshubCatalogue.length} plants)

Task:
1. Pick 20-30 best matching plants for this user
2. Prioritize plants suitable for user's climate zone
3. Match space + light requirements
4. Match maintenance level to user experience
5. For beginners, prefer hardy plants; for experts, can suggest challenging ones

Return JSON only (no commentary), with this exact shape:
{
  "recommendations": [
    { "plantId": "<id from catalogue>", "matchScore": 95, "whyPerfect": "One sentence." }
  ]
}

Sort by matchScore descending. Return 20-30 plants.`
}

const DETECT_PROMPT = `Look at this photo and identify the SPACE TYPE.
Choose ONE from: indoor, balcony, window, outdoor.
- indoor: any interior room (living, bedroom, kitchen, bathroom, office)
- balcony: open balcony with sky access
- window: window sill (bright but still inside)
- outdoor: terrace, garden, rooftop, courtyard

Return JSON only:
{ "spaceType": "indoor", "confidence": 95 }`

// TODO: Migrate Claude API calls to relative path '/api/claude-proxy.php'
// + add a Vite dev proxy once a staging environment exists. 6 files
// currently hardcode the absolute plantsaathi.com URL (this one, plus
// Diagnosis, CareTips x2, PlantIdentifier, utils/carePlan).
async function callProxy(body, signal) {
  const res = await fetch('https://plantsaathi.com/api/claude-proxy.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody.error?.message ?? `API error ${res.status}`)
  }
  return res.json()
}

function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in AI response')
  return JSON.parse(match[0])
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function FindPlants() {
  usePageTitle('Find Plants for My Space')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { getUser, getFinderSession, saveFinderSession, clearFinderSession } = useStorage()
  const user = getUser()

  const [currentStep,       setCurrentStep]       = useState(1)
  const [photoSkipped,      setPhotoSkipped]      = useState(false)
  const [spaceAutoDetected, setSpaceAutoDetected] = useState(false)
  const [detectingSpace,    setDetectingSpace]    = useState(false)
  const [loadingResults,    setLoadingResults]    = useState(false)
  const [error,             setError]             = useState(null)
  const [toast,             setToast]             = useState(null)
  const [results,           setResults]           = useState(null)
  const [fromSavedSession,  setFromSavedSession]  = useState(false)
  const [stockFilter,       setStockFilter]       = useState('all')
  const [visibleCount,      setVisibleCount]      = useState(INITIAL_RESULT_COUNT)

  const [answers, setAnswers] = useState({
    photo:           null,
    spaceType:       '',
    lightCondition: '',
    maintenance:     '',
    experience:      '',
  })

  const photoInputRef = useRef(null)
  const toastTimerRef = useRef(null)

  // ─── Saved session ───────────────────────────────────────────────────────
  useEffect(() => {
    if (searchParams.get('session') !== 'last') return
    const s = getFinderSession()
    if (!s) return
    setAnswers(s.answers || {})
    setResults(s.results || [])
    setFromSavedSession(true)
    setCurrentStep(6)
  }, [searchParams])

  // ─── Q3 (light) option-set diagnostic ────────────────────────────────────
  // Fires whenever the user lands on Q3 or the resolved space changes, so we
  // can trace whether the filtered light subset matches the detected space.
  // Dev-only — Vite strips the whole effect body in production builds.
  useEffect(() => {
    if (currentStep !== 3) return
    if (!import.meta.env.DEV) return
    const opts = getLightOptions(answers.spaceType)
    console.log('🎯 [Q2] Light options shown for space:', {
      detectedSpace: answers.spaceType || null,
      optionsShown:  opts.map(o => o.value),
    })
    if (!answers.spaceType) {
      console.warn('⚠️ [Q3] No spaceType set — showing all light options')
    }
  }, [currentStep, answers.spaceType])

  // ─── Toast helper ────────────────────────────────────────────────────────
  function showToast(msg, ms = 4000) {
    setToast(msg)
    clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), ms)
  }

  // ─── Step navigation ─────────────────────────────────────────────────────
  function back() {
    setError(null)
    if (currentStep === 1) { navigate(-1); return }
    if (currentStep === 2) { setCurrentStep(1); return }
    if (currentStep === 3 && spaceAutoDetected) { setCurrentStep(1); return }
    setCurrentStep(s => s - 1)
  }
  function select(field, value) {
    // Changing spaceType invalidates the previously picked lightCondition,
    // because Q3 shows a different subset of options per space. Clear and
    // tell the user — but only when an actual change happens and there
    // was something to invalidate.
    if (
      field === 'spaceType' &&
      answers.spaceType &&
      answers.spaceType !== value &&
      answers.lightCondition
    ) {
      const newLabel = SPACE_OPTIONS.find(o => o.value === value)?.label || value
      showToast(`Light options updated for ${newLabel}`, 2000)
      setAnswers(a => ({ ...a, spaceType: value, lightCondition: '' }))
      return
    }
    setAnswers(a => ({ ...a, [field]: value }))
  }

  // ─── Photo handlers ──────────────────────────────────────────────────────
  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (import.meta.env.DEV) {
      console.log('📸 [1/6] Photo uploaded', { name: file.name, size: file.size, type: file.type })
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo too large — max 5 MB.')
      return
    }
    setError(null)
    const dataURL = await readAsDataURL(file).catch(err => {
      console.error('📸 [2/6] Base64 conversion FAILED', err)
      throw err
    })
    if (import.meta.env.DEV) {
      console.log('📸 [2/6] Base64 conversion', { length: dataURL.length, preview: dataURL.slice(0, 100) })
    }
    setAnswers(a => ({ ...a, photo: dataURL }))
    setSpaceAutoDetected(false)   // any previous detection no longer applies
  }

  function skipPhoto() {
    setPhotoSkipped(true)
    setSpaceAutoDetected(false)
    setAnswers(a => ({ ...a, photo: null }))
    setCurrentStep(2)
  }

  // ─── Space detection ─────────────────────────────────────────────────────
  async function continueWithPhoto() {
    if (!answers.photo) return
    setDetectingSpace(true)
    setError(null)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), DETECT_TIMEOUT_MS)

    try {
      const { mediaType, rawData } = splitDataURL(answers.photo)
      if (import.meta.env.DEV) {
        console.log('🤖 [3/6] Sending to AI', {
          model:      'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data_length: rawData.length } },
              { type: 'text',  text_length: DETECT_PROMPT.length, text_preview: DETECT_PROMPT.slice(0, 80) },
            ],
          }],
        })
      }
      const apiData = await callProxy({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: rawData } },
            { type: 'text',  text: DETECT_PROMPT },
          ],
        }],
      }, controller.signal)

      if (import.meta.env.DEV) {
        console.log('🤖 [4/6] AI raw response', apiData)
      }

      const text   = apiData.content?.[0]?.text ?? ''
      const parsed = extractJSON(text)
      const space  = String(parsed.spaceType || '').trim().toLowerCase()
      const conf   = Number(parsed.confidence)

      if (import.meta.env.DEV) {
        console.log('🤖 [5/6] Parsed space detection', {
          rawText:    text,
          parsed,
          space,
          confidence: conf,
          validSpace: SPACE_VALUES.has(space),
          meetsConf:  conf >= MIN_CONFIDENCE,
        })
      }

      if (!SPACE_VALUES.has(space) || !(conf >= MIN_CONFIDENCE)) {
        throw new Error('low-confidence')
      }
      setAnswers(a => ({ ...a, spaceType: space }))
      setSpaceAutoDetected(true)
      setPhotoSkipped(false)
      setCurrentStep(3)
    } catch (_err) {
      if (import.meta.env.DEV) {
        console.warn('🤖 [5/6] Space detection FAILED — falling back to manual', _err)
      }
      setSpaceAutoDetected(false)
      setCurrentStep(2)
      showToast('Couldn’t detect space — please select manually.')
    } finally {
      clearTimeout(timer)
      setDetectingSpace(false)
    }
  }

  // ─── Plant matching ──────────────────────────────────────────────────────
  async function submit() {
    setLoadingResults(true)
    setCurrentStep(6)
    setError(null)
    setResults(null)
    setVisibleCount(INITIAL_RESULT_COUNT)
    try {
      const slim = projectCatalogue(100)
      if (import.meta.env.DEV) {
        console.log('🎯 [6/6] Filter input', {
          detectedSpace:           answers.spaceType,
          wizardAnswers:           { ...answers, photo: answers.photo ? '<base64 stripped>' : null },
          spaceAutoDetected,
          photoSkipped,
          totalPlantsBeforeFilter: slim.length,
        })
      }
      if (import.meta.env.DEV && !answers.spaceType) {
        console.warn('⚠️ SPACE LOST — answers.spaceType is empty when matching runs', {
          answers,
          spaceAutoDetected,
          photoSkipped,
          currentStep,
        })
      }
      if (import.meta.env.DEV && answers.lightCondition && !KNOWN_LIGHT_VALUES.has(answers.lightCondition)) {
        console.warn('⚠️ Unknown lightCondition — no matching rule in LIGHT_OPTIONS:', answers.lightCondition)
      }
      const apiData = await callProxy({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role:    'user',
          content: buildMatchPrompt(user || {}, answers, slim),
        }],
      })
      const text   = apiData.content?.[0]?.text ?? ''
      const parsed = extractJSON(text)
      const recs   = (parsed.recommendations || [])
        .filter(r => r.plantId && PLANT_BY_ID.has(String(r.plantId)))
      if (import.meta.env.DEV) {
        console.log('🎯 [6/6] Filter output', {
          totalRecs:  recs.length,
          firstFive:  recs.slice(0, 5).map(r => {
            const plant = PLANT_BY_ID.get(String(r.plantId))
            return {
              plantId:    r.plantId,
              name:       plant?.name,
              locations:  plant?.locations,
              types:      plant?.types,
              climate:    plant?.climate,
              matchScore: r.matchScore,
              whyPerfect: r.whyPerfect,
            }
          }),
        })
      }
      setResults(recs)
      // Strip photo before persisting — base64 blobs can be several MB.
      const { photo: _drop, ...answersForStorage } = answers
      saveFinderSession({
        answers:   { ...answersForStorage, photo: null },
        results:   recs,
        photoUsed: !!answers.photo,
      })
      // Analytics: spaceType is an enum from SPACE_OPTIONS; photoUsed is boolean.
      trackFinderCompleted(answers.spaceType, !!answers.photo)
      if (import.meta.env.DEV) {
        try {
          console.log('💾 lastFinderSession', JSON.parse(localStorage.getItem('finderSession')))
        } catch (logErr) {
          console.warn('💾 lastFinderSession — could not read back', logErr)
        }
      }
    } catch (err) {
      console.error('🎯 [6/6] Matching call FAILED', err)
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoadingResults(false)
    }
  }

  function startOver() {
    clearFinderSession()
    setAnswers({ photo: null, spaceType: '', lightCondition: '', maintenance: '', experience: '' })
    setPhotoSkipped(false)
    setSpaceAutoDetected(false)
    setResults(null)
    setFromSavedSession(false)
    setError(null)
    setCurrentStep(1)
  }

  // ─── Shared style tokens ─────────────────────────────────────────────────
  const page = {
    minHeight:     '100svh',
    background:    '#f0ede6',
    fontFamily:    'var(--font-body)',
    color:         'var(--text)',
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
  // 4 dots when AI detected the space (Photo → Light → Maintenance → Experience).
  // 5 dots when the user must pick a space manually.
  const condensedFlow = spaceAutoDetected && !photoSkipped
  const dotsCount     = condensedFlow ? 4 : 5
  const displayStep   = condensedFlow
    ? (currentStep <= 1 ? 1 : currentStep - 1)
    : currentStep

  function ProgressDots() {
    return (
      <div style={{
        display:        'flex',
        gap:            '6px',
        padding:        '12px 16px',
        background:     '#fff',
        borderBottom:   '1px solid #eee',
        justifyContent: 'center',
      }}>
        {Array.from({ length: dotsCount }, (_, i) => {
          const n      = i + 1
          const active = n === displayStep
          const done   = n <  displayStep
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

  // ─── Option grids ────────────────────────────────────────────────────────
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
                <div style={{ fontSize: '11px', color: '#888', marginTop: '4px', lineHeight: 1.4 }}>
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
        <p style={subtitle}>Upload a photo to auto-detect your space type (optional)</p>
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
              <div style={{ fontSize: '13px', color: '#1D9E75', marginTop: '10px', fontWeight: 600 }}>
                📷 Change photo
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '48px', lineHeight: 1 }}>📷</div>
              <div style={{ fontSize: '14px', color: '#1D9E75', marginTop: '12px', fontWeight: 600 }}>
                Tap to upload or take photo
              </div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
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
          <button style={btnSecondary} onClick={skipPhoto}>Skip</button>
          <button
            style={btnPrimary(hasPhoto)}
            disabled={!hasPhoto}
            onClick={continueWithPhoto}
          >
            Continue →
          </button>
        </div>
      </>
    )
  }

  function DetectionChip() {
    if (!spaceAutoDetected) return null
    const label = SPACE_OPTIONS.find(o => o.value === answers.spaceType)?.label
                  || answers.spaceType
    return (
      <div
        onClick={() => { setSpaceAutoDetected(false); setCurrentStep(2) }}
        style={{
          display:      'inline-block',
          background:   '#E8F5F0',
          color:        '#1D9E75',
          borderRadius: '16px',
          padding:      '6px 12px',
          fontSize:     '12px',
          fontWeight:   600,
          cursor:       'pointer',
          margin:       '12px 0 0 16px',
        }}
      >
        📍 Detected: {label} ✏️
      </div>
    )
  }

  function StepWithGrid(field, title, options, columns = 2, showChip = false) {
    const enabled = !!answers[field]
    return (
      <>
        {showChip && <DetectionChip />}
        <h1 style={questionH}>{title}</h1>
        <OptionGrid field={field} options={options} columns={columns} />
        <div style={footer}>
          <button style={btnSecondary} onClick={back}>← Back</button>
          <button
            style={btnPrimary(enabled)}
            disabled={!enabled}
            onClick={currentStep === 5 ? submit : () => setCurrentStep(s => s + 1)}
          >
            {currentStep === 5 ? '✨ Find my plants' : 'Continue →'}
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
            onClick={currentStep === 5 ? submit : () => setCurrentStep(s => s + 1)}
          >
            {currentStep === 5 ? '✨ Find my plants' : 'Continue →'}
          </button>
        </div>
      </>
    )
  }

  // ─── Loading screens ─────────────────────────────────────────────────────
  function FullScreenLoader({ emoji, title, sub }) {
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
          {emoji}
        </div>
        <div style={{ fontSize: '16px', color: '#1D9E75', marginTop: '20px', fontWeight: 600 }}>
          {title}
        </div>
        <div style={{
          fontSize:  '12px',
          color:     '#888',
          marginTop: '4px',
          lineHeight: 1.5,
          maxWidth:  '280px',
        }}>
          {sub}
        </div>
      </div>
    )
  }

  // ─── Results page ────────────────────────────────────────────────────────
  function ResultsPage() {
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
    :                                 !r.plant.inStock
    )
    const visible   = filtered.slice(0, visibleCount)
    const hasMore   = visible.length < filtered.length
    const nextChunk = Math.min(RESULT_PAGE_SIZE, filtered.length - visible.length)

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
            <div style={{ fontSize: '13px', color: '#888', marginTop: '6px', lineHeight: 1.5 }}>
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
        <div style={stickyHeader}>
          <button style={headerBack} onClick={() => navigate('/home')} aria-label="Back">←</button>
          <div>
            <div style={headerTitle}>🌿 Your Perfect Plants ({hydrated.length})</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', marginTop: '2px' }}>
              Based on your space and preferences
            </div>
          </div>
        </div>

        <div style={{
          position:   'sticky',
          top:        '60px',
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
                display:      'block',
                margin:       '0 auto',
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

        {fromSavedSession && (
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

  // ─── Top-level render ────────────────────────────────────────────────────

  if (currentStep === 6) {
    return loadingResults
      ? <FullScreenLoader emoji="🔮" title="Finding perfect plants for you…" sub="Analyzing your space, light, climate, and care needs" />
      : <ResultsPage />
  }

  if (detectingSpace) {
    return <FullScreenLoader emoji="🔍" title="Identifying your space…" sub="AI is analyzing your photo" />
  }

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
      <div key={currentStep} style={{ animation: 'findFadeIn 0.25s ease-out' }}>
        {currentStep === 1 && <StepPhoto />}
        {currentStep === 2 && StepWithGrid('spaceType',      '🏠 Where will you keep the plant?', SPACE_OPTIONS, 2)}
        {currentStep === 3 && StepWithGrid('lightCondition', '☀️ How much light does the space get?', getLightOptions(answers.spaceType), 2, true)}
        {currentStep === 4 && StepWithList('maintenance',    '💧 How much time can you give?',    MAINTENANCE_OPTIONS)}
        {currentStep === 5 && StepWithList('experience',     '🌱 How experienced are you?',       EXPERIENCE_OPTIONS)}
      </div>

      {toast && (
        <div style={{
          position:     'fixed',
          top:          '76px',
          left:         '50%',
          transform:    'translateX(-50%)',
          background:   '#1a1a1a',
          color:        '#fff',
          padding:      '10px 14px',
          borderRadius: '12px',
          fontSize:     '12px',
          fontWeight:   500,
          zIndex:       40,
          maxWidth:     '320px',
          textAlign:    'center',
          boxShadow:    '0 4px 16px rgba(0,0,0,0.18)',
        }}>
          {toast}
        </div>
      )}

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
