import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { PLANTS } from '../data/plants.js'
import { useStorage } from '../hooks/useStorage.js'

// ─── Photo → base64 helper ────────────────────────────────────────────────────
// Stage 1: FileReader reads the raw file into a base64 data URL.
// Stage 2: canvas resizes it to ≤800px JPEG 80% to fit localStorage.
// If canvas fails for any reason, the raw FileReader base64 is returned.

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = e => resolve(e.target.result)
    reader.onerror = () => reject(new Error('FileReader failed'))
    reader.readAsDataURL(file)
  })
}

async function toBase64(file, maxPx = 800) {
  const raw = await readFileAsBase64(file)          // FileReader → data URL
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image()
      i.onload  = () => res(i)
      i.onerror = rej
      i.src = raw
    })
    const ratio  = Math.min(maxPx / img.width, maxPx / img.height, 1)
    const w      = Math.round(img.width  * ratio)
    const h      = Math.round(img.height * ratio)
    const canvas = document.createElement('canvas')
    canvas.width  = w
    canvas.height = h
    canvas.getContext('2d').drawImage(img, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', 0.8)      // compressed base64
  } catch {
    return raw                                       // fallback: raw base64
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddPlant() {
  const [step,         setStep]         = useState(1)
  const [photo,        setPhoto]        = useState(null)   // base64 | null
  const [name,         setName]         = useState('')
  const [emoji,        setEmoji]        = useState('🌿')
  const [notes,        setNotes]        = useState('')
  const [nameFocused,  setNameFocused]  = useState(false)
  const [notesFocused, setNotesFocused] = useState(false)

  const fileRef = useRef(null)
  const navigate = useNavigate()
  const { addPlant } = useStorage()

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const b64 = await toBase64(file)
    setPhoto(b64)
  }

  function handlePlantPick(e) {
    const plant = PLANTS.find(p => p.id === e.target.value)
    if (plant) { setName(plant.name); setEmoji(plant.emoji) }
  }

  function goBack() {
    if (step === 1) navigate('/garden')
    else setStep(s => s - 1)
  }

  function handleComplete() {
    addPlant({ name: name.trim(), emoji, notes: notes.trim(), photo })
    navigate('/garden')
  }

  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  // ─── Shared style tokens ──────────────────────────────────────────────────

  const page = {
    height:         '100svh',
    display:        'flex',
    flexDirection:  'column',
    overflow:       'hidden',
    background:     'var(--cream)',
    fontFamily:     'var(--font-body)',
    color:          'var(--text)',
  }

  const scrollArea = {
    flex:                    1,
    overflowY:               'auto',
    padding:                 '16px 24px 8px',
    WebkitOverflowScrolling: 'touch',
  }

  const footer = {
    padding:     '16px 24px 36px',
    background:  'var(--cream)',
    borderTop:   '1px solid var(--border)',
    flexShrink:  0,
  }

  const backBtn = {
    display:      'block',
    background:   'none',
    border:       'none',
    padding:      '8px 0',
    marginBottom: '20px',
    fontSize:     '22px',
    lineHeight:   1,
    cursor:       'pointer',
    color:        'var(--text)',
  }

  const h1 = {
    fontFamily: 'var(--font-display)',
    fontWeight: 500,
    fontSize:   '26px',
    margin:     '0 0 8px',
    color:      'var(--text)',
  }

  const sub = {
    fontSize:    '15px',
    color:       'var(--muted)',
    lineHeight:  1.5,
    margin:      '0 0 28px',
  }

  const labelStyle = {
    display:       'block',
    fontSize:      '12px',
    fontWeight:    500,
    color:         'var(--muted)',
    marginBottom:  '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
  }

  function inputStyle(focused) {
    return {
      width:       '100%',
      padding:     '14px 16px',
      fontSize:    '16px',
      fontFamily:  'var(--font-body)',
      color:       'var(--text)',
      background:  '#fff',
      border:      `1.5px solid ${focused ? 'var(--green)' : 'var(--border)'}`,
      borderRadius: '12px',
      outline:     'none',
      boxSizing:   'border-box',
      transition:  'border-color 0.2s',
    }
  }

  const btnPrimary = {
    width:       '100%',
    padding:     '16px',
    fontSize:    '16px',
    fontWeight:  500,
    fontFamily:  'var(--font-body)',
    color:       '#fff',
    background:  'var(--green)',
    border:      'none',
    borderRadius: 'var(--radius)',
    cursor:      'pointer',
  }

  const progressDots = (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
      {[1, 2, 3].map(n => (
        <div key={n} style={{
          width:        '8px',
          height:       '8px',
          borderRadius: '50%',
          background:   n === step ? 'var(--green)' : 'var(--border)',
          transform:    n === step ? 'scale(1.3)' : 'scale(1)',
          transition:   'all 0.25s ease',
        }} />
      ))}
    </div>
  )

  // ─── Step 1 — Photo ───────────────────────────────────────────────────────

  if (step === 1) return (
    <div style={page}>
      <div style={scrollArea}>

        <button style={backBtn} onClick={goBack}>←</button>

        <h1 style={h1}>Add a plant</h1>
        <p style={sub}>Start with a photo — or skip straight to naming it</p>

        {/* Upload zone */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            height:         '240px',
            borderRadius:   'var(--radius)',
            border:         photo ? 'none' : '2px dashed var(--border)',
            background:     photo ? 'transparent' : 'var(--green-light)',
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            cursor:         'pointer',
            overflow:       'hidden',
            transition:     'background 0.2s',
          }}
        >
          {photo ? (
            <img
              src={photo}
              alt="Plant preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <>
              <span style={{ fontSize: '48px', marginBottom: '12px' }}>📷</span>
              <p style={{ margin: '0 0 4px', fontWeight: 500, fontSize: '15px', color: 'var(--green-dark)' }}>
                Tap to add a photo
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                Optional
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

        {photo && (
          <button
            onClick={() => setPhoto(null)}
            style={{
              display:         'block',
              margin:          '12px auto 0',
              background:      'none',
              border:          'none',
              color:           'var(--muted)',
              fontSize:        '13px',
              cursor:          'pointer',
              textDecoration:  'underline',
              fontFamily:      'var(--font-body)',
            }}
          >
            Remove photo
          </button>
        )}

      </div>

      <div style={footer}>
        <button style={btnPrimary} onClick={() => setStep(2)}>
          Next →
        </button>
        {progressDots}
      </div>
    </div>
  )

  // ─── Step 2 — Details ─────────────────────────────────────────────────────

  if (step === 2) return (
    <div style={page}>
      <div style={scrollArea}>

        <button style={backBtn} onClick={goBack}>←</button>

        <h1 style={h1}>Name your plant</h1>
        <p style={sub}>Give it a name — we'll build its watering schedule</p>

        {/* Free-text name */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Plant name</label>
          <input
            style={inputStyle(nameFocused)}
            type="text"
            placeholder="e.g. My Monstera"
            value={name}
            onChange={e => setName(e.target.value)}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            autoFocus
          />
        </div>

        {/* Common plant picker */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Or choose a common plant</label>
          <div style={{
            position:     'relative',
            background:   '#fff',
            border:       '1.5px solid var(--border)',
            borderRadius: '12px',
            overflow:     'hidden',
          }}>
            <select
              defaultValue=""
              onChange={handlePlantPick}
              style={{
                width:              '100%',
                padding:            '14px 40px 14px 16px',
                fontSize:           '15px',
                fontFamily:         'var(--font-body)',
                color:              'var(--text)',
                background:         'transparent',
                border:             'none',
                outline:            'none',
                appearance:         'none',
                WebkitAppearance:   'none',
                cursor:             'pointer',
              }}
            >
              <option value="" disabled>Choose a plant…</option>
              {PLANTS.map(p => (
                <option key={p.id} value={p.id}>{p.emoji}  {p.name}</option>
              ))}
            </select>
            <span style={{
              position:       'absolute',
              right:          '16px',
              top:            '50%',
              transform:      'translateY(-50%)',
              pointerEvents:  'none',
              color:          'var(--muted)',
              fontSize:       '11px',
            }}>
              ▼
            </span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label style={labelStyle}>
            Notes{' '}
            <span style={{ textTransform: 'none', fontWeight: 400, opacity: 0.65 }}>
              (optional)
            </span>
          </label>
          <textarea
            style={{
              ...inputStyle(notesFocused),
              height:     '96px',
              resize:     'none',
              lineHeight: 1.5,
            }}
            placeholder="Any notes about this plant?"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onFocus={() => setNotesFocused(true)}
            onBlur={() => setNotesFocused(false)}
          />
        </div>

      </div>

      <div style={footer}>
        <button
          style={{ ...btnPrimary, ...(name.trim() === '' ? { opacity: 0.35, cursor: 'not-allowed' } : {}) }}
          disabled={name.trim() === ''}
          onClick={() => setStep(3)}
        >
          Next →
        </button>
        {progressDots}
      </div>
    </div>
  )

  // ─── Step 3 — Confirm ─────────────────────────────────────────────────────

  return (
    <div style={page}>
      <div style={scrollArea}>

        <button style={backBtn} onClick={goBack}>←</button>

        <h1 style={{ ...h1, marginBottom: '24px' }}>Looks good!</h1>

        {/* Preview card */}
        <div style={{
          background:   '#fff',
          border:       '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          overflow:     'hidden',
        }}>
          {/* Photo or emoji placeholder */}
          <div style={{
            height:         '200px',
            background:     photo ? '#111' : 'var(--green-light)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            overflow:       'hidden',
          }}>
            {photo ? (
              <img
                src={photo}
                alt={name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '72px' }}>{emoji}</span>
            )}
          </div>

          {/* Plant info */}
          <div style={{ padding: '18px 20px' }}>
            <p style={{
              fontFamily:  'var(--font-display)',
              fontWeight:  500,
              fontSize:    '22px',
              margin:      '0 0 6px',
              color:       'var(--text)',
            }}>
              {name}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
              Added today · {today}
            </p>
            {notes.trim() && (
              <p style={{
                fontSize:   '14px',
                color:      'var(--muted)',
                margin:     '12px 0 0',
                lineHeight: 1.55,
                fontStyle:  'italic',
              }}>
                "{notes.trim()}"
              </p>
            )}
          </div>
        </div>

      </div>

      <div style={footer}>
        <button style={btnPrimary} onClick={handleComplete}>
          Add to my garden 🌱
        </button>
        {progressDots}
      </div>
    </div>
  )
}
