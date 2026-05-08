import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { toDateKey } from '../utils/reminders.js'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']

const navBtn = {
  width:          '32px',
  height:         '32px',
  borderRadius:   '50%',
  border:         '1.5px solid var(--border)',
  background:     '#fff',
  fontSize:       '20px',
  cursor:         'pointer',
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'center',
  color:          'var(--text)',
  fontFamily:     'var(--font-body)',
  lineHeight:     1,
  padding:        0,
}

export default function CareCalendar({ plants, onClose }) {
  const today = new Date()
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  // Collect every lastCompleted date across all plants + reminder types
  const careDays = useMemo(() => {
    const s = new Set()
    for (const plant of plants) {
      if (!plant.reminders) continue
      for (const rem of Object.values(plant.reminders)) {
        if (rem?.lastCompleted) s.add(rem.lastCompleted)
      }
    }
    return s
  }, [plants])

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const todayKey    = toDateKey(today)
  const firstDow    = new Date(viewYear, viewMonth, 1).getDay()  // 0 = Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const monthPfx    = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-`
  const careCount   = [...careDays].filter(d => d.startsWith(monthPfx)).length

  // Leading empty cells + one cell per day
  const cells = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1
      return { day: d, dateKey: `${monthPfx}${String(d).padStart(2, '0')}` }
    }),
  ]

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:   'fixed',
          top:        0,
          left:       0,
          width:      '100vw',
          height:     '100vh',
          background: 'rgba(0,0,0,0.45)',
          zIndex:     9999,
        }}
      />

      {/* Sheet */}
      <div style={{
        position:      'fixed',
        bottom:        0,
        left:          '50%',
        transform:     'translateX(-50%)',
        width:         '100%',
        maxWidth:      '390px',
        maxHeight:     '85vh',
        overflowY:     'auto',
        background:    'var(--cream)',
        borderRadius:  '20px 20px 0 0',
        zIndex:        10000,
        animation:     'slideUp 0.25s ease',
        paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
      }}>

        {/* Header row */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '20px 20px 0',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize:   '20px',
            margin:     0,
            color:      'var(--text)',
          }}>
            Care calendar
          </h2>
          <button onClick={onClose} style={navBtn} aria-label="Close">×</button>
        </div>

        {/* Month navigation */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '14px 20px 10px',
        }}>
          <button onClick={prevMonth} style={navBtn} aria-label="Previous month">‹</button>
          <span style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
            fontSize:   '15px',
            color:      'var(--text)',
          }}>
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} style={navBtn} aria-label="Next month">›</button>
        </div>

        {/* Day-of-week headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 16px' }}>
          {DAYS.map(d => (
            <div key={d} style={{
              textAlign:     'center',
              fontSize:      '11px',
              fontWeight:    500,
              color:         'var(--muted)',
              paddingBottom: '6px',
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          padding:             '0 16px',
          rowGap:              '2px',
        }}>
          {cells.map((cell, i) => {
            if (!cell) return <div key={`e-${i}`} style={{ height: '44px' }} />
            const isToday = cell.dateKey === todayKey
            const hasCare = careDays.has(cell.dateKey)
            return (
              <div key={cell.dateKey} style={{
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                justifyContent: 'flex-start',
                height:         '44px',
                paddingTop:     '2px',
                gap:            '3px',
              }}>
                <div style={{
                  width:          '32px',
                  height:         '32px',
                  borderRadius:   '50%',
                  background:     isToday ? '#1D9E75' : 'transparent',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  fontSize:       '14px',
                  fontWeight:     isToday ? 600 : 400,
                  color:          isToday ? '#fff' : 'var(--text)',
                  fontFamily:     'var(--font-body)',
                }}>
                  {cell.day}
                </div>
                {hasCare && (
                  <div style={{
                    width:        '5px',
                    height:       '5px',
                    borderRadius: '50%',
                    background:   '#1D9E75',
                  }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Monthly summary */}
        <div style={{
          margin:     '16px 20px 4px',
          padding:    '14px 16px',
          background: 'var(--green-light)',
          borderRadius: '12px',
          textAlign:  'center',
          fontSize:   '14px',
          color:      'var(--green-dark)',
          fontWeight: 500,
          fontFamily: 'var(--font-body)',
        }}>
          {careCount === 0
            ? 'No plant care recorded this month'
            : `${careCount} ${careCount === 1 ? 'day' : 'days'} of plant care this month`}
        </div>

      </div>
    </>,
    document.body
  )
}
