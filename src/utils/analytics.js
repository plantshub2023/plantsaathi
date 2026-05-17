// ═══════════════════════════════════════════════════════════
// PlantSaathi Analytics (Google Analytics 4)
// Privacy-first. NO PII sent. Ever.
//
// NEVER passed to GA4:
//   - user.name, user.city, user.lat, user.lon
//   - plant.notes, plant.photo (base64), plant.diagnoses content
//   - wishlist items, free-text inputs
//   - AI prompt/response content
//
// Safe metadata only: event names, plant names from public catalog,
// enum values (e.g. detectedSpace='indoor'), booleans, page paths.
//
// Behavior:
//   - Disabled in dev (import.meta.env.DEV) — no events fired locally
//   - All calls wrapped in try-catch — analytics never breaks the app
//   - Silent no-op if window.gtag is not loaded (e.g. ad blockers)
// ═══════════════════════════════════════════════════════════

const isDev = import.meta.env.DEV;
const GA_ID = 'G-FN3LSBY10L';

// Generic safe event sender
export function trackEvent(eventName, params = {}) {
  if (isDev) return; // No analytics in dev
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
  } catch (err) {
    // Silent fail — analytics never breaks the app
    console.error('[analytics] trackEvent failed:', err);
  }
}

// Page view tracking (for SPA route changes)
export function trackPageView(path, title) {
  if (isDev) return;
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: path,
        page_title: title || document.title,
      });
    }
  } catch (err) {
    console.error('[analytics] trackPageView failed:', err);
  }
}

// PWA events
export function trackPWAInstallPrompted() {
  trackEvent('pwa_install_prompted');
}

export function trackPWAInstalled() {
  trackEvent('pwa_installed');
}

export function trackPWALaunchedStandalone() {
  trackEvent('pwa_launched_standalone');
}

// Feature usage events (safe metadata only)
export function trackPlantAdded(plantName, source) {
  // plantName: from public catalog (safe). source: 'catalog' | 'free_text' (enum)
  trackEvent('plant_added', {
    plant_name: plantName || 'unknown',
    source: source || 'unknown',
  });
}

export function trackDiagnosisRun(plantName) {
  trackEvent('diagnosis_run', {
    plant_name: plantName || 'unknown',
  });
}

export function trackPlantIdentified(success) {
  trackEvent('plant_identified', {
    success: !!success,
  });
}

export function trackFinderCompleted(detectedSpace, photoUsed) {
  // detectedSpace: enum ('indoor'/'balcony'/'window'/'outdoor'/null)
  // photoUsed: boolean
  trackEvent('finder_completed', {
    detected_space: detectedSpace || 'manual',
    photo_used: !!photoUsed,
  });
}

export function trackReminderSet(reminderType) {
  // reminderType: enum ('water'/'mist'/'fertilize'/'rotate'/'prune'/'repot')
  trackEvent('reminder_set', {
    reminder_type: reminderType || 'unknown',
  });
}
