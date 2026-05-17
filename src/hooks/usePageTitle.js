import { useEffect } from 'react'

// Sets document.title to "{title} · PlantSaathi" while mounted, restoring the
// previous title on unmount. Pass a falsy value to fall back to the brand name.
// RouteTracker reads document.title 50ms after a route change for GA4 page_view.
export default function usePageTitle(title) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title ? `${title} · PlantSaathi` : 'PlantSaathi'
    return () => {
      document.title = previousTitle
    }
  }, [title])
}
