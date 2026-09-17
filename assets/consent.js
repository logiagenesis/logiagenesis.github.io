/**
 * Consent Mode v2, default denied.
 *
 * Nothing analytics-shaped may fire before a choice is made. GTM is injected
 * only after consent is granted, so with the banner untouched the Network tab
 * shows no request to googletagmanager.com at all.
 */
const KEY = 'lc-consent-v2'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null } }
const write = v => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* private mode */ } }

export function initConsent (gtmId) {
  window.dataLayer = window.dataLayer || []
  const gtag = (...args) => window.dataLayer.push(args)

  // Defaults must be pushed before anything else touches the dataLayer.
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500
  })

  const saved = read()
  if (saved?.analytics) { grant(saved) ; return }
  if (saved) return                      // declined, and the choice persists
  showBanner()

  function grant (choice) {
    gtag('consent', 'update', {
      ad_storage: choice.ads ? 'granted' : 'denied',
      ad_user_data: choice.ads ? 'granted' : 'denied',
      ad_personalization: choice.ads ? 'granted' : 'denied',
      analytics_storage: choice.analytics ? 'granted' : 'denied'
    })
    loadGtm()
  }

  function loadGtm () {
    if (!gtmId || document.getElementById('gtm-src')) return
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
    const s = document.createElement('script')
    s.id = 'gtm-src'
    s.async = true
    s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`
    document.head.appendChild(s)
  }

  function showBanner () {
    const el = document.createElement('div')
    el.className = 'consent-banner'
    el.setAttribute('role', 'region')
    el.setAttribute('aria-label', 'Cookie choices')
    el.innerHTML = `
      <p class="consent-banner__copy">We use cookies to see how the site is used and to measure our
        adverts. Nothing is set until you choose. Read our
        <a href="/popia/">POPIA notice</a>.</p>
      <div class="consent-banner__actions">
        <button type="button" class="btn btn--ghost" data-consent="decline">Only what's needed</button>
        <button type="button" class="btn btn--primary" data-consent="accept">Accept all</button>
      </div>`
    document.body.appendChild(el)
    el.addEventListener('click', e => {
      const btn = e.target.closest('[data-consent]')
      if (!btn) return
      const accepted = btn.dataset.consent === 'accept'
      const choice = { analytics: accepted, ads: accepted, at: new Date().toISOString() }
      write(choice)
      if (accepted) grant(choice)
      el.remove()
    })
  }
}
