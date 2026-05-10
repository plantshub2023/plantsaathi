import { useNavigate, useParams } from 'react-router-dom'

// Left-border accent colour by fertilizer type.
const TYPE_BORDER = {
  'synthetic':      '#1D9E75',
  'liquid-organic': '#74B9FF',
  'solid-organic':  '#8B6914',
  'home-organic':   '#FDCB6E',
}

// Role badges. The first two are the regular care-plan roles; the second pair
// are used in condition-based "treatment plan" mode (filled colour swatches
// instead of soft tints, to read as warnings).
const ROLE_BADGE = {
  primary:    { bg: '#E8F5F0', fg: '#1D9E75', label: 'Primary'    },
  supplement: { bg: '#FFF3E0', fg: '#F57C00', label: 'Supplement' },
  treatment:  { bg: '#EF4444', fg: '#fff',    label: 'Treatment'  },
  recovery:   { bg: '#F59E0B', fg: '#fff',    label: 'Recovery'   },
}

const cardStyle = {
  background:   '#fff',
  borderRadius: '16px',
  padding:      '16px',
  margin:       '12px 0',
  boxShadow:    '0 2px 8px rgba(0,0,0,0.06)',
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function FertilizerSchedule({
  fertilizerSchedule,
  isConditionBased = false,
  conditionLoading = false,
}) {
  const navigate    = useNavigate()
  const { plantId } = useParams()

  const hasSchedule = Array.isArray(fertilizerSchedule) && fertilizerSchedule.length > 0

  // ── Title varies by mode ──────────────────────────────────────────────────
  const titleText        = isConditionBased ? '🚨 Treatment Plan' : '🧪 Fertilizer Schedule'
  const subtitleText     = isConditionBased ? 'Health-based'      : 'AI recommended'
  const subtitleColor    = isConditionBased ? '#EF4444'           : '#aaa'

  // ── Loading state ─────────────────────────────────────────────────────────
  // Skeleton placeholder shown while the condition-based AI call is in flight.
  if (conditionLoading) {
    return (
      <div style={cardStyle}>
        <style>{`@keyframes ps-pulse { 0%, 100% { opacity: 0.45 } 50% { opacity: 0.85 } }`}</style>

        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          marginBottom:   '16px',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize:   '17px',
            color:      '#1a1a1a',
          }}>
            {titleText}
          </span>
          <span style={{ fontSize: '11px', color: subtitleColor }}>
            {subtitleText}
          </span>
        </div>

        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              height:        '52px',
              background:    '#F0F0F0',
              borderRadius:  '8px',
              marginBottom:  '12px',
              animation:     'ps-pulse 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}

        <p style={{
          fontSize:   '13px',
          color:      '#888',
          textAlign:  'center',
          margin:     '8px 0 0',
          fontFamily: 'var(--font-body)',
        }}>
          🔍 Analysing plant health…
        </p>
      </div>
    )
  }

  // ── Null state ────────────────────────────────────────────────────────────
  if (!hasSchedule) {
    return (
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🧪</span>
          <p style={{
            fontSize:  '14px',
            color:     '#888',
            margin:    0,
            textAlign: 'center',
          }}>
            Fertilizer schedule not available
          </p>
          <p style={{
            fontSize:  '12px',
            color:     '#aaa',
            margin:    '4px 0 0',
            textAlign: 'center',
          }}>
            Regenerate your Care Plan to get a custom schedule
          </p>
          <button
            onClick={() => navigate(`/recommended-plan/${plantId}`)}
            style={{
              background:   '#1D9E75',
              color:        '#fff',
              border:       'none',
              borderRadius: '20px',
              padding:      '8px 20px',
              fontSize:     '13px',
              fontFamily:   'var(--font-body)',
              cursor:       'pointer',
              marginTop:    '12px',
              display:      'block',
              marginLeft:   'auto',
              marginRight:  'auto',
            }}
          >
            Regenerate Care Plan
          </button>
        </div>
      </div>
    )
  }

  // ── Populated state ───────────────────────────────────────────────────────
  return (
    <div style={cardStyle}>

      {/* Title row */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        marginBottom:   '16px',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          fontSize:   '17px',
          color:      '#1a1a1a',
        }}>
          {titleText}
        </span>
        <span style={{
          fontSize:   '11px',
          color:      subtitleColor,
          fontWeight: isConditionBased ? 600 : 400,
        }}>
          {subtitleText}
        </span>
      </div>

      {/* Sub-cards */}
      {fertilizerSchedule.map((f, idx) => {
        const borderColor = TYPE_BORDER[f.type] || '#1D9E75'
        const badge       = ROLE_BADGE[f.role] || ROLE_BADGE.supplement
        return (
          <div
            key={`${f.name}-${idx}`}
            style={{
              borderRadius: '12px',
              padding:      '14px',
              marginBottom: '12px',
              background:   '#F9FDFB',
              borderLeft:   `3px solid ${borderColor}`,
            }}
          >
            {/* Row 1 — header */}
            <div style={{
              display:        'flex',
              justifyContent: 'space-between',
              alignItems:     'center',
              gap:            '8px',
            }}>
              <span style={{
                fontSize:   '15px',
                fontWeight: 600,
                color:      '#1a1a1a',
                lineHeight: 1.3,
                flex:       1,
                minWidth:   0,
              }}>
                {f.name}
              </span>
              <span style={{
                background:   badge.bg,
                color:        badge.fg,
                fontSize:     '10px',
                fontWeight:   600,
                borderRadius: '10px',
                padding:      '2px 10px',
                flexShrink:   0,
              }}>
                {badge.label}
              </span>
            </div>

            {/* Row 2 — dose pill (hero) */}
            <div style={{ margin: '10px 0' }}>
              <span style={{
                background:   '#1D9E75',
                color:        '#fff',
                borderRadius: '20px',
                padding:      '8px 20px',
                display:      'inline-block',
                fontSize:     '16px',
                fontWeight:   600,
              }}>
                💧 {f.dose}
              </span>
            </div>

            {/* Row 3 — frequency + method */}
            <div style={{
              display:  'flex',
              flexWrap: 'wrap',
              gap:      '16px',
              marginTop: '8px',
              fontSize: '12px',
              color:    '#555',
            }}>
              <span>📅 {f.frequency}</span>
              <span>🌿 {f.method}</span>
            </div>

            {/* Row 4 — season */}
            <div style={{
              fontSize:  '12px',
              color:     '#888',
              fontStyle: 'italic',
              marginTop: '4px',
            }}>
              🗓 {f.season}
            </div>

            {/* Row 5 — tip */}
            {f.tip && (
              <div style={{
                fontSize:    '12px',
                color:       '#666',
                marginTop:   '8px',
                paddingTop:  '8px',
                borderTop:   '1px solid #EEE',
                lineHeight:  1.5,
              }}>
                💡 {f.tip}
              </div>
            )}

            {/* Row 6 — treats (condition-based mode only) */}
            {isConditionBased && f.treats && (
              <div style={{
                fontSize:   '12px',
                color:      '#EF4444',
                fontStyle:  'italic',
                marginTop:  '4px',
                lineHeight: 1.5,
              }}>
                💊 {f.treats}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
