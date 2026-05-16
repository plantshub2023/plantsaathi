import { useNavigate, useLocation } from 'react-router-dom'
import { useStorage } from '../hooks/useStorage.js'

const TABS = [
  {
    label: 'Home',
    path: '/home',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: 'Garden',
    path: '/garden',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22V12" />
        <path d="M12 12c-3-3-3-7 0-10 3 3 3 7 0 10z" />
        <path d="M12 12c3 0 6 2 8 5-2 3-5 5-8 5-3 0-6-2-8-5 2-3 5-5 8-5z" />
      </svg>
    ),
  },
  {
    label: 'Diagnose',
    path: '/diagnosis',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    label: 'Identify',
    path: '/identify',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="11" y1="8" x2="11" y2="14" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    ),
  },
  {
    label: 'Profile',
    path: '/profile',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const navigate      = useNavigate()
  const { pathname }  = useLocation()
  const { getWishlist } = useStorage()
  const wishlistCount = getWishlist().length

  return (
    <nav style={{
      position:   'fixed',
      bottom:     0,
      left:       '50%',
      transform:  'translateX(-50%)',
      width:      '100%',
      maxWidth:   '390px',
      background: '#fff',
      borderTop:  '1px solid var(--border)',
      display:    'flex',
      zIndex:     202,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {TABS.map(tab => {
        const active     = pathname === tab.path || pathname.startsWith(tab.path + '/')
        const showBadge  = tab.path === '/home' && wishlistCount > 0
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              flex:           1,
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              gap:            '4px',
              padding:        '12px 0 10px',
              background:     'none',
              border:         'none',
              cursor:         'pointer',
              color:          active ? 'var(--green)' : 'var(--muted)',
              fontFamily:     'var(--font-body)',
              fontSize:       '10px',
              fontWeight:     active ? 600 : 400,
              letterSpacing:  '0.2px',
              transition:     'color 0.15s',
              position:       'relative',
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {showBadge && (
              <span style={{
                position:       'absolute',
                top:            '4px',
                right:          '50%',
                transform:      'translateX(20px)',
                background:     '#FF6B6B',
                color:          '#fff',
                borderRadius:   '10px',
                minWidth:       '18px',
                height:         '18px',
                fontSize:       '10px',
                fontWeight:     700,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                padding:        '0 5px',
                pointerEvents:  'none',
                lineHeight:     1,
                boxSizing:      'border-box',
              }}>
                {wishlistCount}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
