/**
 * Gallery grid. Renders from the same array the lightbox counts, filters by
 * category with a FLIP transition, and refuses to render a short final row.
 *
 * The dev guard is the runtime half of the grid law: the build asserts that
 * every category length is divisible by 6, and this checks that what actually
 * laid out has a full last row at the current breakpoint.
 */
import { createLightbox } from './lightbox.js'

export function initGallery (root) {
  const payload = document.getElementById('gallery-data')
  const grid = root?.querySelector('.gallery-grid')
  if (!root || !payload || !grid) return
  const data = JSON.parse(payload.textContent)
  const lightbox = createLightbox()
  let current = root.dataset.category || data.categories[0].slug

  const itemsFor = slug => data.categories.find(c => c.slug === slug)?.images ?? []

  function paint (slug, animate) {
    const before = animate ? snapshot() : null
    const items = itemsFor(slug)
    grid.innerHTML = items.map((im, i) => cell(im, i)).join('')
    grid.setAttribute('aria-label', `${data.categories.find(c => c.slug === slug).title} — ${items.length} photos`)
    if (before) flip(before)
    guardLastRow(items.length)
  }

  const SIZES = '(min-width:64em) 33vw, (min-width:40em) 50vw, 100vw'
  const cell = (im, i) => `
    <li class="gallery-cell">
      <button type="button" class="gallery-cell__btn" data-index="${i}">
        <picture>
          <source type="image/avif" srcset="${im.avif}" sizes="${SIZES}">
          <source type="image/webp" srcset="${im.webp}" sizes="${SIZES}">
          <img src="${im.src}" srcset="${im.srcset}" sizes="${SIZES}"
               width="${im.width}" height="${im.height}" alt="${escapeAttr(im.alt)}"
               loading="${i < 3 ? 'eager' : 'lazy'}" decoding="async"
               style="background-image:url('${im.lqip}');background-size:cover">
        </picture>
        <span class="visually-hidden">View photo ${i + 1} at a larger size</span>
      </button>
    </li>`

  const escapeAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

  function snapshot () {
    const map = new Map()
    for (const el of grid.children) map.set(el.querySelector('img')?.src, el.getBoundingClientRect())
    return map
  }

  function flip (before) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    for (const el of grid.children) {
      const key = el.querySelector('img')?.src
      const old = before.get(key)
      if (!old) continue
      const now = el.getBoundingClientRect()
      const dx = old.left - now.left
      const dy = old.top - now.top
      if (!dx && !dy) continue
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: 320, easing: 'cubic-bezier(0.22,0.61,0.36,1)' }
      )
    }
  }

  /** Dev-only: shout on localhost if a rendered grid ends on a short row. */
  function guardLastRow (n) {
    const dev = ['localhost', '127.0.0.1'].includes(location.hostname)
    if (!dev || !n) return
    requestAnimationFrame(() => {
      const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length
      if (n % cols === 0) { root.querySelector('.grid-alarm')?.remove(); return }
      let alarm = root.querySelector('.grid-alarm')
      if (!alarm) {
        alarm = document.createElement('p')
        alarm.className = 'grid-alarm'
        root.prepend(alarm)
      }
      alarm.textContent = `GRID LAW BROKEN: ${n} images in ${cols} columns leaves a short final row of ${n % cols}.`
    })
  }

  grid.addEventListener('click', e => {
    const btn = e.target.closest('.gallery-cell__btn')
    if (!btn) return
    lightbox.open(itemsFor(current), Number(btn.dataset.index), btn)
    window.dataLayer?.push({ event: 'gallery_open', gallery_category: current })
  })

  for (const tab of root.querySelectorAll('[data-category-tab]')) {
    tab.addEventListener('click', () => {
      current = tab.dataset.categoryTab
      for (const other of root.querySelectorAll('[data-category-tab]')) {
        other.setAttribute('aria-selected', String(other === tab))
      }
      paint(current, true)
      history.replaceState(null, '', `#${current}`)
    })
  }

  const fromHash = location.hash.slice(1)
  if (fromHash && itemsFor(fromHash).length) current = fromHash
  paint(current, false)
  window.addEventListener('resize', () => guardLastRow(itemsFor(current).length), { passive: true })
}
