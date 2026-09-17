import { initTiles } from './tile.js'
import { initGallery } from './gallery.js'
import { initConsent } from './consent.js'
import { initForms } from './forms.js'

document.documentElement.classList.remove('no-js')

const GTM_ID = document.documentElement.dataset.gtm || ''
initConsent(GTM_ID)
initTiles()
initGallery(document.querySelector('[data-gallery]'))
initForms()

/* Scroll reveal: opacity + 12px rise, staggered, ONCE. Never re-triggers, and
   never applied above the fold — the hero has no .reveal on it. */
const reveals = document.querySelectorAll('.reveal')
if (reveals.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const io = new IntersectionObserver((entries, obs) => {
    let i = 0
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      entry.target.style.setProperty('--reveal-delay', `${i++ * 60}ms`)
      entry.target.classList.add('is-in')
      obs.unobserve(entry.target)
    }
  }, { rootMargin: '0px 0px -10% 0px' })
  for (const el of reveals) io.observe(el)
} else {
  for (const el of reveals) el.classList.add('is-in')
}

/* Hero parallax: 40px of travel, and will-change only while it is on screen. */
const hero = document.querySelector('[data-parallax]')
if (hero && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let visible = false
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting
    hero.style.willChange = visible ? 'transform' : 'auto'
  }).observe(hero)
  addEventListener('scroll', () => {
    if (!visible) return
    hero.style.setProperty('--parallax', `${Math.min(scrollY * 0.12, 40)}px`)
  }, { passive: true })
}

/* Outbound intent tracking. Pushes only; GTM decides what to do with them. */
const track = (event, params) => window.dataLayer?.push({ event, ...params })
document.addEventListener('click', e => {
  const a = e.target.closest('a')
  if (!a) return
  if (a.dataset.track === 'whatsapp') track('whatsapp_click', { link_url: a.href })
  else if (a.protocol === 'tel:') track('phone_click', { link_url: a.href })
  else if (a.protocol === 'mailto:') track('email_click', { link_url: a.href })
  else if (a.hasAttribute('download')) track('brochure_download', { file_name: a.getAttribute('download') || a.pathname })
})

/* The caterpillar → butterfly line-draw. One accent moment, About page only,
   plays once when scrolled into view. The whole brand in one gesture. */
const metamorphosis = document.querySelector('[data-metamorphosis]')
if (metamorphosis && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting) return
    metamorphosis.classList.add('is-drawing')
    obs.disconnect()
  }, { threshold: 0.4 }).observe(metamorphosis)
}

/* Mobile menu. The list is only hidden once we know the toggle can reveal it
   again — with JS off it stays a plain, visible list of links. */
const navToggle = document.querySelector('.site-nav__toggle')
const navList = document.getElementById('site-menu')
if (navToggle && navList) {
  const small = window.matchMedia('(max-width: 66em)')
  const sync = () => { navList.hidden = small.matches && navToggle.getAttribute('aria-expanded') !== 'true' }
  navToggle.addEventListener('click', () => {
    navToggle.setAttribute('aria-expanded', String(navToggle.getAttribute('aria-expanded') !== 'true'))
    sync()
  })
  small.addEventListener('change', sync)
  navList.addEventListener('click', e => {
    if (e.target.tagName === 'A' && small.matches) { navToggle.setAttribute('aria-expanded', 'false'); sync() }
  })
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
      navToggle.setAttribute('aria-expanded', 'false'); sync(); navToggle.focus()
    }
  })
  sync()
}
