/**
 * Gallery lightbox. No external library.
 * Keyboard (left/right/Esc), swipe, focus trap, `inert` on the background,
 * preloads one image either side, returns focus to whatever opened it.
 * The "X of Y" counter reads the same array the grid renders from, so it
 * cannot disagree with what is on screen.
 */
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function createLightbox () {
  let items = []
  let index = 0
  let opener = null

  const root = document.createElement('div')
  root.className = 'lightbox'
  root.hidden = true
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-label', 'Photo viewer')
  root.innerHTML = `
    <div class="lightbox__bar">
      <p class="lightbox__count" aria-live="polite"></p>
      <button type="button" class="lightbox__close" aria-label="Close photo viewer">&times;</button>
    </div>
    <button type="button" class="lightbox__nav lightbox__nav--prev" aria-label="Previous photo">&#8249;</button>
    <figure class="lightbox__figure">
      <img class="lightbox__img" alt="" decoding="async">
      <figcaption class="lightbox__caption"></figcaption>
    </figure>
    <button type="button" class="lightbox__nav lightbox__nav--next" aria-label="Next photo">&#8250;</button>`
  document.body.appendChild(root)

  const img = root.querySelector('.lightbox__img')
  const caption = root.querySelector('.lightbox__caption')
  const count = root.querySelector('.lightbox__count')

  function render () {
    const item = items[index]
    if (!item) return
    img.src = item.full
    img.alt = item.alt
    img.width = item.width
    img.height = item.height
    caption.textContent = item.alt
    count.textContent = `${index + 1} of ${items.length}`
    for (const step of [-1, 1]) {
      const near = items[index + step]
      if (near) { const pre = new Image(); pre.src = near.full }
    }
  }

  function open (list, at, trigger) {
    items = list
    index = at
    opener = trigger || document.activeElement
    root.hidden = false
    document.body.classList.add('is-locked')
    for (const el of document.body.children) {
      if (el !== root) el.inert = true
    }
    render()
    root.querySelector('.lightbox__close').focus()
  }

  function close () {
    root.hidden = true
    document.body.classList.remove('is-locked')
    for (const el of document.body.children) el.inert = false
    img.removeAttribute('src')
    opener?.focus()
  }

  const move = step => { index = (index + step + items.length) % items.length; render() }

  root.querySelector('.lightbox__close').addEventListener('click', close)
  root.querySelector('.lightbox__nav--prev').addEventListener('click', () => move(-1))
  root.querySelector('.lightbox__nav--next').addEventListener('click', () => move(1))
  root.addEventListener('click', e => { if (e.target === root) close() })

  root.addEventListener('keydown', e => {
    if (e.key === 'Escape') { close(); return }
    if (e.key === 'ArrowLeft') { move(-1); return }
    if (e.key === 'ArrowRight') { move(1); return }
    if (e.key !== 'Tab') return
    // Trap: the dialog is the only reachable thing while it is open.
    const stops = [...root.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null)
    if (!stops.length) return
    const first = stops[0]
    const lastStop = stops[stops.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastStop.focus() }
    else if (!e.shiftKey && document.activeElement === lastStop) { e.preventDefault(); first.focus() }
  })

  let touchX = null
  root.addEventListener('touchstart', e => { touchX = e.changedTouches[0].clientX }, { passive: true })
  root.addEventListener('touchend', e => {
    if (touchX === null) return
    const dx = e.changedTouches[0].clientX - touchX
    if (Math.abs(dx) > 48) move(dx < 0 ? 1 : -1)
    touchX = null
  }, { passive: true })

  return { open, close }
}
