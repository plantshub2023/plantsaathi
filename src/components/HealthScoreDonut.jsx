import { useEffect, useRef } from 'react'
import {
  Chart,
  ArcElement,
  DoughnutController,
  Tooltip,
} from 'chart.js'
import { calculateHealthScore } from '../utils/healthScore.js'

// Doughnut needs the controller registered alongside the arc element. Skipping
// DoughnutController throws "doughnut is not a registered controller" and the
// half-failed construction leaves the canvas claimed (next call: "canvas is
// already in use").
Chart.register(ArcElement, DoughnutController, Tooltip)

// ─── Per-factor styling (full mode breakdown) ────────────────────────────────

const FACTOR_ROWS = [
  { key: 'watering',  label: '💧 Watering',  color: '#1D9E75' },
  { key: 'diagnosis', label: '🔬 Diagnosis', color: '#74B9FF' },
  { key: 'tasks',     label: '✅ Tasks',     color: '#F59E0B' },
  { key: 'lastCare',  label: '📅 Last care', color: '#A29BFE' },
]

const cardStyle = {
  background:   '#fff',
  borderRadius: '16px',
  padding:      '16px',
  margin:       '12px 0',
  boxShadow:    '0 2px 8px rgba(0,0,0,0.06)',
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function HealthScoreDonut({ plant, tasks, compact = false }) {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)

  const health = calculateHealthScore(plant, tasks)
  const score  = Math.max(0, Math.min(100, Math.round(health.score)))

  // ── Build / rebuild the doughnut whenever the score changes ───────────────
  useEffect(() => {
    if (!canvasRef.current) return

    if (chartRef.current) {
      chartRef.current.destroy()
      chartRef.current = null
    }

    chartRef.current = new Chart(canvasRef.current.getContext('2d'), {
      type: 'doughnut',
      data: {
        datasets: [{
          data:            [score, 100 - score],
          backgroundColor: [health.color, '#E8F5F0'],
          borderWidth:     0,
        }],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        cutout:              '75%',
        plugins: {
          legend:  { display: false },
          tooltip: { enabled: false },
        },
        animation: {
          animateRotate: true,
          duration:      800,
        },
      },
    })

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [score, health.color])

  // ── Compact mode (Garden plant cards) ────────────────────────────────────
  if (compact) {
    return (
      <div style={{ width: '56px', height: '56px', position: 'relative' }}>
        <canvas ref={canvasRef} />
        <div style={{
          position:      'absolute',
          top:           '50%',
          left:          '50%',
          transform:     'translate(-50%, -50%)',
          fontSize:      '16px',
          fontWeight:    600,
          color:         health.color,
          fontFamily:    'var(--font-body)',
          pointerEvents: 'none',
          lineHeight:    1,
        }}>
          {score}
        </div>
      </div>
    )
  }

  // ── Full mode (Plant Detail) ──────────────────────────────────────────────
  return (
    <div style={cardStyle}>

      {/* Title row */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        marginBottom:   '12px',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          fontSize:   '17px',
          color:      '#1a1a1a',
        }}>
          💚 Plant Health
        </span>
        <span style={{ fontSize: '11px', color: '#aaa' }}>
          Live score
        </span>
      </div>

      {/* Donut */}
      <div style={{
        width:    '180px',
        height:   '180px',
        position: 'relative',
        margin:   '0 auto 20px',
      }}>
        <canvas ref={canvasRef} />
        <div style={{
          position:      'absolute',
          top:           '50%',
          left:          '50%',
          transform:     'translate(-50%, -50%)',
          textAlign:     'center',
          fontFamily:    'var(--font-body)',
          pointerEvents: 'none',
          lineHeight:    1.1,
        }}>
          <div style={{
            fontSize:   '30px',
            fontWeight: 600,
            color:      health.color,
          }}>
            {score}
          </div>
          <div style={{ fontSize: '11px', color: '#aaa' }}>
            /100
          </div>
          <div style={{
            fontSize:   '12px',
            fontWeight: 500,
            color:      health.color,
            marginTop:  '4px',
          }}>
            {health.emoji} {health.label}
          </div>
        </div>
      </div>

      {/* Factor breakdown */}
      <div style={{
        borderTop:  '1px solid #F0F0F0',
        paddingTop: '14px',
      }}>
        {FACTOR_ROWS.map(row => {
          const f     = health.factors[row.key]
          const ratio = f.max > 0 ? Math.max(0, Math.min(1, f.earned / f.max)) : 0
          return (
            <div
              key={row.key}
              style={{
                display:             'grid',
                gridTemplateColumns: '90px 1fr 36px',
                alignItems:          'center',
                gap:                 '8px',
                marginBottom:        '10px',
              }}
            >
              <span style={{
                fontSize:   '12px',
                color:      '#888',
                fontFamily: 'var(--font-body)',
                whiteSpace: 'nowrap',
              }}>
                {row.label}
              </span>
              <div style={{
                background:   '#E8F5F0',
                borderRadius: '4px',
                height:       '6px',
                overflow:     'hidden',
              }}>
                <div style={{
                  width:        `${ratio * 100}%`,
                  height:       '100%',
                  background:   row.color,
                  borderRadius: '4px',
                  transition:   'width 0.6s ease',
                }} />
              </div>
              <span style={{
                fontSize:           '11px',
                color:              '#aaa',
                textAlign:          'right',
                fontFamily:         'var(--font-body)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {f.earned}/{f.max}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
