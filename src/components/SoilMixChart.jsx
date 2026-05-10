import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController,
} from 'chart.js'

// Chart.js v4 requires registering the controller for the chart type, not just
// the visual elements. Skipping DoughnutController throws "doughnut is not a
// registered controller" — and the half-failed construction leaves the canvas
// claimed, which then surfaces as "Canvas is already in use" on the next try.
Chart.register(ArcElement, Tooltip, Legend, DoughnutController)

// ─── Palette ─────────────────────────────────────────────────────────────────
// Assigned in order so the same ingredient at the same index always gets the
// same colour, both in the donut and in the legend below it.
const PALETTE = [
  '#1D9E75', '#2ECC71', '#8B6914', '#74B9FF', '#A29BFE',
  '#FD79A8', '#FDCB6E', '#E17055', '#00CEC9', '#6C5CE7',
]

// ─── Card style — shared by populated + null states ──────────────────────────
const cardStyle = {
  background:   '#fff',
  borderRadius: '16px',
  padding:      '16px',
  margin:       '12px 0',
  boxShadow:    '0 2px 8px rgba(0,0,0,0.06)',
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SoilMixChart({ soilMix }) {
  const navigate    = useNavigate()
  const { plantId } = useParams()
  const canvasRef   = useRef(null)
  const chartRef    = useRef(null)

  const hasMix = Array.isArray(soilMix) && soilMix.length > 0

  // ── Build / rebuild the chart whenever soilMix changes ────────────────────
  useEffect(() => {
    if (!hasMix || !canvasRef.current) return

    // Tear down the previous chart so the canvas is reusable (Chart.js throws
    // "Canvas is already in use" otherwise).
    if (chartRef.current) {
      chartRef.current.destroy()
      chartRef.current = null
    }

    const colors = soilMix.map((_, idx) => PALETTE[idx % PALETTE.length])
    chartRef.current = new Chart(canvasRef.current.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels:   soilMix.map(i => i.ingredient),
        datasets: [{
          data:            soilMix.map(i => i.percent),
          backgroundColor: colors,
          borderColor:     '#fff',
          borderWidth:     2,
          hoverOffset:     6,
        }],
      },
      options: {
        responsive:           true,
        maintainAspectRatio:  false,
        cutout:               '62%',
        plugins: {
          legend:  { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.label}: ${ctx.parsed}%`,
            },
          },
        },
      },
    })

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [soilMix, hasMix])

  // ── Null state ────────────────────────────────────────────────────────────
  if (!hasMix) {
    return (
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <span style={{ fontSize: '32px', display: 'block' }}>🪣</span>
          <p style={{
            fontSize:  '14px',
            color:     '#888',
            margin:    '8px 0 0',
            textAlign: 'center',
          }}>
            Soil mix recipe not available
          </p>
          <p style={{
            fontSize:  '12px',
            color:     '#aaa',
            margin:    '4px 0 0',
            textAlign: 'center',
          }}>
            Regenerate your Care Plan to get a custom mix
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
          🪣 Soil Mix Recipe
        </span>
        <span style={{ fontSize: '11px', color: '#aaa' }}>
          AI recommended
        </span>
      </div>

      {/* Donut */}
      <div style={{
        width:    '200px',
        height:   '200px',
        position: 'relative',
        margin:   '0 auto 24px',
      }}>
        <canvas ref={canvasRef} />
        <div style={{
          position:      'absolute',
          top:           '50%',
          left:          '50%',
          transform:     'translate(-50%, -50%)',
          textAlign:     'center',
          fontSize:      '11px',
          color:         '#888',
          lineHeight:    1.3,
          pointerEvents: 'none',
        }}>
          Soil<br />Mix
        </div>
      </div>

      {/* Legend */}
      <div>
        {soilMix.map((item, idx) => {
          const color = PALETTE[idx % PALETTE.length]
          return (
            <div key={`${item.ingredient}-${idx}`} style={{
              display:      'flex',
              alignItems:   'center',
              gap:          '10px',
              marginBottom: '8px',
            }}>
              <span style={{
                width:        '10px',
                height:       '10px',
                borderRadius: '2px',
                background:   color,
                flexShrink:   0,
              }} />
              <span style={{
                fontSize: '13px',
                color:    'var(--text)',
                flex:     1,
              }}>
                {item.ingredient}
              </span>
              <span style={{
                fontSize:   '13px',
                fontWeight: 500,
                color,
              }}>
                {item.percent}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
