import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStorage } from '../hooks/useStorage.js'
import BottomNav from '../components/BottomNav.jsx'

// ─── Constants ────────────────────────────────────────────────────────────────

const SYMPTOMS = [
  'Yellow leaves', 'Brown spots', 'Wilting', 'Dropping leaves',
  'White powder', 'Sticky residue', 'Root rot', 'Leggy growth',
  'Pest damage', 'No growth',
]

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const SEVERITY_STYLE = {
  high:   { background: '#FEE2E2', color: '#DC2626' },
  medium: { background: '#FEF3C7', color: '#D97706' },
  low:    { background: '#DCFCE7', color: '#16A34A' },
}

// ─── FileReader helper ────────────────────────────────────────────────────────

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = e => resolve(e.target.result)
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Diagnosis() {
  const navigate = useNavigate()
  const { getPlants, getUser, saveDiagnosis } = useStorage()

  const plants = getPlants()
  const user   = getUser()

  const [selectedPlantId, setSelectedPlantId] = useState(plants[0]?.id ?? null)
  const [photo,           setPhoto]           = useState(null)   // data URL
  const [symptoms,        setSymptoms]        = useState([])
  const [loading,         setLoading]         = useState(false)
  const [result,          setResult]          = useState(null)
  const [error,           setError]           = useState(null)

  const cameraRef      = useRef(null)
  const galleryRef     = useRef(null)
  const resultRef      = useRef(null)
  const selectedPlant  = plants.find(p => p.id === selectedPlantId)
  const canDiagnose    = !loading && (!!photo || symptoms.length > 0)
  const currentMonth   = MONTHS[new Date().getMonth()]

  // ─── Handlers ──────────────────────────────────────────────────────────────

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setResult(null)
    setError(null)
    const dataURL = await readAsDataURL(file)
    setPhoto(dataURL)
  }

  function toggleSymptom(s) {
    setSymptoms(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    )
  }

  async function diagnoseWithAI() {
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      // Build vision content — image first (if present), then text prompt
      const content = []

      if (photo) {
        const [meta, rawData] = photo.split(',')
        const mediaType = meta.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
        content.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: rawData },
        })
      }

      const plantName    = selectedPlant?.name ?? 'Unknown plant'
      const symptomsText = symptoms.length > 0 ? symptoms.join(', ') : 'None specified'

      content.push({
        type: 'text',
        text: `You are an expert Indian horticulturist.
Plant: ${plantName}${selectedPlant?.category ? `\nCategory: ${selectedPlant.category}` : ''}
City: ${user?.city ?? 'India'}
Zone: ${user?.zone ?? 'Z16'} - ${user?.zoneName ?? 'Subtropical'}
Month: ${currentMonth}
Symptoms reported: ${symptomsText}

Diagnose this plant problem for Indian conditions.
Respond in this exact JSON format only, no other text:
{
  "problem": "problem name",
  "severity": "high/medium/low",
  "cause": "2-3 sentences explaining cause",
  "fixes": ["fix 1", "fix 2", "fix 3"],
  "zone_note": "specific tip for this zone and season",
  "product": "one product available in India"
}`,
      })

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':                          'application/json',
          'x-api-key':                             import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version':                     '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 1000,
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

      const diagnosis = JSON.parse(jsonMatch[0])
      setResult(diagnosis)

      // Persist to plant history
      if (selectedPlantId) {
        saveDiagnosis(selectedPlantId, { ...diagnosis, photo, symptoms })
      }

      // Scroll result into view
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)

    } catch (err) {
      setError(err.message ?? 'Diagnosis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Shared style tokens ────────────────────────────────────────────────────

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
    padding:      '20px',
    ...extra,
  })

  const labelStyle = {
    display:       'block',
    fontSize:      '12px',
    fontWeight:    500,
    color:         'var(--muted)',
    marginBottom:  '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
  }

  const btnPrimary = {
    width:        '100%',
    padding:      '16px',
    fontSize:     '16px',
    fontWeight:   500,
    fontFamily:   'var(--font-body)',
    color:        '#fff',
    background:   'var(--green)',
    border:       'none',
    borderRadius: 'var(--radius)',
    cursor:       'pointer',
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={page}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={card({ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px' })}>
        <button
          onClick={() => navigate('/garden')}
          style={{
            background: 'none', border: 'none', fontSize: '22px',
            cursor: 'pointer', color: 'var(--text)', padding: '4px', lineHeight: 1, flexShrink: 0,
          }}
        >
          ←
        </button>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          fontSize:   '22px',
          margin:     0,
          color:      'var(--text)',
        }}>
          Diagnose a problem
        </h1>
      </div>

      {/* ── Plant selector ─────────────────────────────────────────────────── */}
      <div style={card({ padding: '16px 20px' })}>
        <span style={labelStyle}>Select plant</span>

        {plants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <p style={{ color: 'var(--muted)', fontSize: '14px', margin: '0 0 14px' }}>
              Add a plant first to diagnose it
            </p>
            <button
              onClick={() => navigate('/add-plant')}
              style={{ ...btnPrimary, width: 'auto', padding: '12px 28px', fontSize: '14px' }}
            >
              Add a plant
            </button>
          </div>
        ) : (
          <div style={{
            display:    'flex',
            gap:        '8px',
            overflowX:  'auto',
            paddingBottom: '2px',
            msOverflowStyle: 'none',
            scrollbarWidth:  'none',
          }}>
            {plants.map(p => {
              const active = p.id === selectedPlantId
              return (
                <button
                  key={p.id}
                  onClick={() => { setSelectedPlantId(p.id); setResult(null); setError(null) }}
                  style={{
                    flexShrink:   0,
                    padding:      '8px 16px',
                    borderRadius: '100px',
                    border:       `1.5px solid ${active ? 'var(--green)' : 'var(--border)'}`,
                    background:   active ? 'var(--green-light)' : '#fff',
                    color:        active ? 'var(--green-dark)'  : 'var(--text)',
                    fontFamily:   'var(--font-body)',
                    fontSize:     '14px',
                    fontWeight:   active ? 600 : 400,
                    cursor:       'pointer',
                    whiteSpace:   'nowrap',
                    transition:   'all 0.15s',
                  }}
                >
                  {p.emoji}  {p.name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Upload zone ────────────────────────────────────────────────────── */}
      <div style={card({ padding: '16px 20px' })}>
        <span style={labelStyle}>Plant photo</span>

        <div
          style={{
            border:         photo ? 'none' : '2px dashed var(--border)',
            borderRadius:   'var(--radius)',
            height:         '200px',
            background:     photo ? '#111' : 'var(--green-light)',
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            cursor:         'default',
            overflow:       'hidden',
            transition:     'background 0.2s',
          }}
        >
          {photo ? (
            <img
              src={photo}
              alt="Sick plant"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <>
              <span style={{ fontSize: '40px', marginBottom: '10px' }}>🔬</span>
              <p style={{ margin: '0 0 4px', fontWeight: 500, fontSize: '15px', color: 'var(--green-dark)' }}>
                Upload a photo of the sick plant
              </p>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--muted)' }}>
                Take a clear photo in good light
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => cameraRef.current?.click()}
                  style={{
                    background: 'var(--green)', color: '#fff', border: 'none',
                    borderRadius: '99px', padding: '9px 16px', fontSize: '13px',
                    fontFamily: 'var(--font-body)', fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  📷 Take Photo
                </button>
                <button
                  onClick={() => galleryRef.current?.click()}
                  style={{
                    background: '#fff', color: 'var(--green-dark)',
                    border: '1.5px solid var(--green)', borderRadius: '99px',
                    padding: '9px 16px', fontSize: '13px',
                    fontFamily: 'var(--font-body)', fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  🖼️ Gallery
                </button>
              </div>
            </>
          )}
        </div>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFile}
        />

        {photo && (
          <button
            onClick={() => { setPhoto(null); setResult(null); setError(null) }}
            style={{
              display:        'block',
              margin:         '10px auto 0',
              background:     'none',
              border:         'none',
              color:          'var(--muted)',
              fontSize:       '13px',
              cursor:         'pointer',
              textDecoration: 'underline',
              fontFamily:     'var(--font-body)',
            }}
          >
            Retake
          </button>
        )}
      </div>

      {/* ── Symptom chips (show after photo or always) ──────────────────────── */}
      <div style={card({ padding: '16px 20px' })}>
        <span style={labelStyle}>What are you seeing?</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {SYMPTOMS.map(s => {
            const sel = symptoms.includes(s)
            return (
              <button
                key={s}
                onClick={() => toggleSymptom(s)}
                style={{
                  padding:      '8px 14px',
                  borderRadius: '100px',
                  border:       `1.5px solid ${sel ? '#DC2626' : 'var(--border)'}`,
                  background:   sel ? '#FEE2E2' : '#fff',
                  color:        sel ? '#DC2626' : 'var(--text)',
                  fontFamily:   'var(--font-body)',
                  fontSize:     '13px',
                  fontWeight:   sel ? 600 : 400,
                  cursor:       'pointer',
                  transition:   'all 0.15s',
                }}
              >
                {s}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Diagnose button ─────────────────────────────────────────────────── */}
      <div style={{ margin: '0 16px 12px' }}>
        <button
          style={{
            ...btnPrimary,
            opacity: canDiagnose ? 1 : 0.35,
            cursor:  canDiagnose ? 'pointer' : 'not-allowed',
          }}
          disabled={!canDiagnose}
          onClick={diagnoseWithAI}
        >
          {loading ? '🔄  Analysing your plant…' : '🔬  Diagnose with AI'}
        </button>
      </div>

      {/* ── Error state ─────────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          margin:       '0 16px 12px',
          padding:      '14px 18px',
          background:   '#FEE2E2',
          borderRadius: 'var(--radius)',
          color:        '#DC2626',
          fontSize:     '14px',
          lineHeight:   1.5,
        }}>
          ⚠️  {error}
        </div>
      )}

      {/* ── Result display ──────────────────────────────────────────────────── */}
      {result && (
        <div ref={resultRef} style={{ margin: '0 16px 12px' }}>

          {/* Problem + severity */}
          <div style={{
            background:   'var(--cream)',
            borderRadius: 'var(--radius)',
            padding:      '20px',
            marginBottom: '10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                fontSize:   '22px',
                margin:     0,
                color:      'var(--text)',
                lineHeight: 1.2,
              }}>
                {result.problem}
              </h2>
              {result.severity && (
                <span style={{
                  flexShrink:   0,
                  padding:      '4px 12px',
                  borderRadius: '100px',
                  fontSize:     '12px',
                  fontWeight:   700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  ...(SEVERITY_STYLE[result.severity] ?? SEVERITY_STYLE.medium),
                }}>
                  {result.severity}
                </span>
              )}
            </div>
          </div>

          {/* What is happening */}
          <div style={{
            background:   'var(--cream)',
            borderRadius: 'var(--radius)',
            padding:      '18px 20px',
            marginBottom: '10px',
          }}>
            <p style={{ ...labelStyle, marginBottom: '8px' }}>What is happening</p>
            <p style={{ fontSize: '14px', lineHeight: 1.65, margin: 0, color: 'var(--text)' }}>
              {result.cause}
            </p>
          </div>

          {/* How to fix */}
          <div style={{
            background:   'var(--cream)',
            borderRadius: 'var(--radius)',
            padding:      '18px 20px',
            marginBottom: '10px',
          }}>
            <p style={{ ...labelStyle, marginBottom: '12px' }}>How to fix</p>
            <ol style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {result.fixes?.map((fix, i) => (
                <li key={i} style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text)' }}>
                  {fix}
                </li>
              ))}
            </ol>
          </div>

          {/* Zone note */}
          {result.zone_note && (
            <div style={{
              background:   '#FEF3C7',
              borderRadius: 'var(--radius)',
              padding:      '16px 18px',
              marginBottom: '10px',
              display:      'flex',
              gap:          '10px',
            }}>
              <span style={{ fontSize: '18px', flexShrink: 0 }}>📍</span>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 600, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Zone tip · {user?.zone}
                </p>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: '#78350F' }}>
                  {result.zone_note}
                </p>
              </div>
            </div>
          )}

          {/* Product recommendation */}
          {result.product && (
            <div style={{
              background:   'var(--green-light)',
              borderRadius: 'var(--radius)',
              padding:      '16px 18px',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'space-between',
              gap:          '12px',
            }}>
              <div>
                <p style={{ margin: '0 0 3px', fontSize: '12px', fontWeight: 600, color: 'var(--green-dark)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Recommended product
                </p>
                <p style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 500, color: 'var(--text)' }}>
                  {result.product}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--green-dark)' }}>
                  Available on PlantsHub
                </p>
              </div>
              <a
                href={`https://plantshub.in/search?q=${encodeURIComponent(result.product)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flexShrink:   0,
                  padding:      '10px 16px',
                  background:   'var(--green)',
                  color:        '#fff',
                  borderRadius: '10px',
                  fontSize:     '13px',
                  fontWeight:   500,
                  textDecoration: 'none',
                  fontFamily:   'var(--font-body)',
                }}
              >
                Shop →
              </a>
            </div>
          )}

        </div>
      )}

      <BottomNav />
    </div>
  )
}
