import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {
  trackPWAInstallPrompted,
  trackPWAInstalled,
  trackPWALaunchedStandalone,
} from './utils/analytics'

function detectStandaloneMode() {
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true // iOS

  if (isStandalone) {
    trackPWALaunchedStandalone()
  }
}

function setupPWAListeners() {
  window.addEventListener('beforeinstallprompt', () => {
    trackPWAInstallPrompted()
  })

  window.addEventListener('appinstalled', () => {
    trackPWAInstalled()
  })
}

detectStandaloneMode()
setupPWAListeners()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
