import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '../utils/analytics'

export default function RouteTracker() {
  const location = useLocation()

  useEffect(() => {
    // Small delay so document.title is updated by route component
    const timer = setTimeout(() => {
      trackPageView(location.pathname, document.title)
    }, 50)
    return () => clearTimeout(timer)
  }, [location.pathname])

  return null
}
