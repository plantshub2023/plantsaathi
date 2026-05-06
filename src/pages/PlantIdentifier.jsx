import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStorage } from '../hooks/useStorage'
import BottomNav from '../components/BottomNav'

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

// ─── Resize uploaded photo before sending ─────────────────────────────────────
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = e => resolve(e.target.result)
    reader.onerror = () => reject(new Error('FileReader failed'))
    reader.readAsDataURL(file)
  })
}

async function toBase64(file, maxPx = 800) {
  const raw = await readFileAsBase64(file)
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image()
      i.onload  = () => res(i)
      i.onerror = rej
      i.src = raw
    })
    const ratio  = Math.min(maxPx / img.width, maxPx / img.height, 1)
    const canvas = document.createElement('canvas')
    canvas.width  = Math.round(img.width  * ratio)
    canvas.height = Math.round(img.height * ratio)
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.8)
  } catch {
    return raw
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PlantIdentifier() {
  const navigate             = useNavigate()
  const { getUser, addPlant } = useStorage()

  const [photo,   setPhoto]   = useState(null)   // data URL
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [result,  setResult]  = useState(null)
  const [added,   setAdded]   = useState(false)

  const fileRef = useRef(null)

  // ─── File pick ─────────────────────────────────────────────────────────────
  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setResult(null)
    setError(null)
    setAdded(false)
    const b64 = await toBase64(file)
    setPhoto(b64)
  }

  // ─── Identify ──────────────────────────────────────────────────────────────
  async function identifyPlant() {
    if (!photo) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const user = getUser() || {}
      const [meta, rawData] = photo.split(',')
      const mediaType = meta.match(/:(.*?);/)?.[1] ?? 'image/jpeg'

      const prompt = `You are an expert botanist and Indian horticulturist.
User zone: ${user.zone ?? 'unknown'} - ${user.zoneName ?? ''}
User city: ${user.city ?? 'India'}

Identify this plant from the photo.
Respond in this exact JSON format only, no other text:
{
  "commonName": "common name in English",
  "hindiName": "common Hindi/Indian name if known",
  "botanicalName": "scientific name",
  "confidence": "high/medium/low",
  "description": "2-3 sentences about this plant",
  "careLevel": "easy/moderate/difficult",
  "suitableForZone": true,
  "zoneNote": "specific note about growing in user zone",
  "watering": "watering advice",
  "sunlight": "sunlight needs",
  "commonUses": "medicinal, ornamental, edible etc"
}`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':                              'application/json',
          'x-api-key':                                 API_KEY,
          'anthropic-version':                         '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              {
                type:   'image',
                source: { type: 'base64', media_type: mediaType, data: rawData },
              },
              { type: 'text', text: prompt },
            ],
          }],
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

      setResult(JSON.parse(jsonMatch[0]))
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Add to garden ─────────────────────────────────────────────────────────
  function handleAdd() {
    if (!result) return
    addPlant({
      name:  result.commonName,
      emoji: '🌿',
      notes: result.botanicalName ? `${result.botanicalName}` : '',
      photo,
    })
    setAdded(true)
    setTimeout(() => navigate('/garden'), 1000)
  }

  // ─── Style tokens ──────────────────────────────────────────────────────────
  const page = {
    minHeight:     '100svh',
    paddingBottom: '88px',
    background:    'var(--cream)',
    fontFamily:    'var(--font-body)',
    color:         'var(--text)',
  }

  const card = {
    background:   '#fff',
    border:       '1px solid var(--border)',
    borderRadius: 'var(--radius)',
  }

  function pill(bg, text) {
    return {
      display:      'inline-flex',
      alignItems:   'center',
      padding:      '3px 10px',
      borderRadius: '99px',
      fontSize:     '12px',
      fontWeight:   500,
      background:   bg,
      color:        text,
    }
  }

  // ─── Confidence colours ────────────────────────────────────────────────────
  const confColour = {
    high:   { bg: '#D1FAE5', text: '#065F46' },
    medium: { bg: '#FEF3C7', text: '#92400E' },
    low:    { bg: '#FEE2E2', text: '#991B1B' },
  }

  const careColour = {
    easy:     { dot: '🟢', bg: '#D1FAE5', text: '#065F46' },
    moderate: { dot: '🟡', bg: '#FEF3C7', text: '#92400E' },
    difficult:{ dot: '🔴', bg: '#FEE2E2', text: '#991B1B' },
  }

  const conf  = confColour[result?.confidence?.toLowerCase()]  || confColour.medium
  const care  = careColour[result?.careLevel?.toLowerCase()]   || careColour.moderate

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={page}>

      {/* Spinner keyframes */}
      <style>{`@keyframes ps-spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{
        padding:      '52px 20px 18px',
        borderBottom: '1px solid var(--border)',
        background:   'var(--cream)',
      }}>
        <button
          onClick={() => navigate('/garden')}
          style={{
            background: 'none',
            border:     'none',
            fontSize:   '22px',
            cursor:     'pointer',
            padding:    '0 0 14px',
            display:    'block',
            color:      'var(--text)',
          }}
        >
          ←
        </button>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          fontSize:   '26px',
          margin:     '0 0 6px',
          color:      'var(--text)',
        }}>
          Identify a plant
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>
          Take a photo and AI will tell you what it is
        </p>
      </div>

      <div style={{ padding: '24px 20px 0' }}>

        {/* ── Upload zone ──────────────────────────────────────────────────── */}
        <div
          onClick={() => !loading && fileRef.current?.click()}
          style={{
            height:         '220px',
            borderRadius:   'var(--radius)',
            border:         photo ? 'none' : '2px dashed var(--border)',
            background:     photo ? 'transparent' : 'var(--green-light)',
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            cursor:         loading ? 'default' : 'pointer',
            overflow:       'hidden',
            marginBottom:   '16px',
            position:       'relative',
          }}
        >
          {photo ? (
            <>
              <img
                src={photo}
                alt="Plant to identify"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {/* Retake overlay button */}
              {!loading && (
                <button
                  onClick={e => { e.stopPropagation(); setPhoto(null); setResult(null); setError(null) }}
                  style={{
                    position:     'absolute',
                    bottom:       '12px',
                    right:        '12px',
                    background:   'rgba(0,0,0,0.55)',
                    color:        '#fff',
                    border:       'none',
                    borderRadius: '99px',
                    padding:      '6px 14px',
                    fontSize:     '13px',
                    fontFamily:   'var(--font-body)',
                    fontWeight:   500,
                    cursor:       'pointer',
                  }}
                >
                  Retake
                </button>
              )}
            </>
          ) : (
            <>
              <span style={{ fontSize: '44px', marginBottom: '12px' }}>🔍</span>
              <p style={{ margin: '0 0 4px', fontWeight: 500, fontSize: '15px', color: 'var(--green-dark)' }}>
                Upload a plant photo
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', textAlign: 'center', padding: '0 24px' }}>
                Clear photo of leaves, flowers or full plant
              </p>
            </>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFile}
        />

        {/* ── Identify button ──────────────────────────────────────────────── */}
        <button
          onClick={identifyPlant}
          disabled={!photo || loading}
          style={{
            width:        '100%',
            padding:      '16px',
            fontSize:     '16px',
            fontWeight:   500,
            fontFamily:   'var(--font-body)',
            color:        '#fff',
            background:   !photo || loading ? '#a0c9ba' : 'var(--green)',
            border:       'none',
            borderRadius: 'var(--radius)',
            cursor:       !photo || loading ? 'not-allowed' : 'pointer',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            gap:          '10px',
            marginBottom: '24px',
            transition:   'background 0.2s',
          }}
        >
          {loading && (
            <span style={{
              width:         '18px',
              height:        '18px',
              border:        '2.5px solid rgba(255,255,255,0.35)',
              borderTopColor:'#fff',
              borderRadius:  '50%',
              display:       'inline-block',
              animation:     'ps-spin 0.75s linear infinite',
            }} />
          )}
          {loading ? 'Identifying your plant…' : 'Identify with AI'}
        </button>

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {error && (
          <div style={{
            background:   '#FEE2E2',
            border:       '1px solid #FECACA',
            borderRadius: 'var(--radius)',
            padding:      '16px',
            color:        '#991B1B',
            fontSize:     '14px',
            lineHeight:   1.5,
            marginBottom: '24px',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Result ───────────────────────────────────────────────────────── */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '12px' }}>

            {/* Identity card */}
            <div style={{ ...card, overflow: 'hidden' }}>
              {/* Green accent bar */}
              <div style={{ height: '4px', background: 'var(--green)' }} />
              <div style={{ padding: '20px' }}>
                <h2 style={{
                  fontFamily:  'var(--font-display)',
                  fontWeight:  500,
                  fontSize:    '24px',
                  margin:      '0 0 4px',
                  color:       'var(--text)',
                }}>
                  {result.commonName}
                </h2>
                {result.hindiName && (
                  <p style={{ margin: '0 0 6px', fontSize: '15px', color: 'var(--muted)' }}>
                    {result.hindiName}
                  </p>
                )}
                <p style={{
                  margin:     '0 0 16px',
                  fontSize:   '13px',
                  color:      'var(--muted)',
                  fontStyle:  'italic',
                }}>
                  {result.botanicalName}
                </p>

                {/* Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {result.confidence && (
                    <span style={pill(conf.bg, conf.text)}>
                      {result.confidence.charAt(0).toUpperCase() + result.confidence.slice(1)} confidence
                    </span>
                  )}
                  {result.careLevel && (
                    <span style={pill(care.bg, care.text)}>
                      {care.dot} {result.careLevel.charAt(0).toUpperCase() + result.careLevel.slice(1)} care
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Zone suitability */}
            {result.zoneNote && (
              <div style={{
                ...card,
                padding:    '16px',
                background: result.suitableForZone ? '#D1FAE5' : '#FEE2E2',
                border:     `1px solid ${result.suitableForZone ? '#6EE7B7' : '#FECACA'}`,
              }}>
                <p style={{
                  margin:     '0 0 6px',
                  fontWeight: 500,
                  fontSize:   '14px',
                  color:      result.suitableForZone ? '#065F46' : '#991B1B',
                }}>
                  {result.suitableForZone ? '✅ Grows well in your zone' : '⚠️ Challenging in your zone'}
                </p>
                <p style={{
                  margin:     0,
                  fontSize:   '13px',
                  lineHeight: 1.55,
                  color:      result.suitableForZone ? '#065F46' : '#991B1B',
                }}>
                  {result.zoneNote}
                </p>
              </div>
            )}

            {/* Info cards */}
            {[
              { icon: '📖', title: 'About',        body: result.description  },
              { icon: '💧', title: 'Watering',     body: result.watering     },
              { icon: '☀️', title: 'Sunlight',     body: result.sunlight     },
              { icon: '🌿', title: 'Common uses',  body: result.commonUses   },
            ].filter(c => c.body).map(({ icon, title, body }) => (
              <div key={title} style={{ ...card, padding: '18px' }}>
                <p style={{
                  margin:        '0 0 8px',
                  fontWeight:    500,
                  fontSize:      '14px',
                  color:         'var(--text)',
                  display:       'flex',
                  alignItems:    'center',
                  gap:           '6px',
                }}>
                  <span>{icon}</span> {title}
                </p>
                <p style={{
                  margin:     0,
                  fontSize:   '14px',
                  color:      'var(--muted)',
                  lineHeight: 1.6,
                }}>
                  {body}
                </p>
              </div>
            ))}

            {/* Add to garden */}
            <button
              onClick={handleAdd}
              disabled={added}
              style={{
                width:        '100%',
                padding:      '16px',
                fontSize:     '16px',
                fontWeight:   500,
                fontFamily:   'var(--font-body)',
                color:        '#fff',
                background:   added ? '#6EE7B7' : 'var(--green)',
                border:       'none',
                borderRadius: 'var(--radius)',
                cursor:       added ? 'default' : 'pointer',
                transition:   'background 0.3s',
                marginBottom: '8px',
              }}
            >
              {added ? 'Added! Taking you to the garden… 🌱' : 'Add this plant to my garden'}
            </button>

          </div>
        )}

      </div>

      <BottomNav />
    </div>
  )
}
