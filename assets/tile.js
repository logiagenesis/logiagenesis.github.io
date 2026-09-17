/**
 * lc-tile — 3D tilt with spring physics.
 *
 * Design constraints this file exists to honour:
 *   - ONE requestAnimationFrame loop for the whole page, driven from a registry.
 *     Never one loop or one listener per tile.
 *   - pointermove is delegated to the grid container; tiles off screen are
 *     unregistered by an IntersectionObserver and cost nothing.
 *   - The only things written per frame are custom properties. No layout
 *     properties are touched, so hover produces zero forced reflow.
 *   - Tilt caps at 7 degrees however fast the pointer moves.
 *   - Returning to rest overshoots exactly once (under-damped), then settles.
 */

const MAX_TILT = 7            // degrees, hard cap
const HOVER_SCALE = 1.015
const STIFFNESS = 170
const DAMPING_FOLLOW = 22     // near-critical: tracks the pointer without wobble
const DAMPING_RETURN = 14     // under-damped: one overshoot on the way home
const SETTLE_POS = 0.02       // degrees
const SETTLE_VEL = 0.05

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
const coarsePointer = window.matchMedia('(hover: none)')

/** @type {Set<Tile>} */
const active = new Set()
let frame = 0
let last = 0

class Tile {
  constructor (el) {
    this.el = el
    this.rx = 0; this.ry = 0; this.sc = 1
    this.vrx = 0; this.vry = 0; this.vsc = 0
    this.txRx = 0; this.txRy = 0; this.txSc = 1
    this.engaged = false
    this.onScreen = false
  }

  /** Map a pointer position inside the tile's rect to a capped tilt. */
  aim (clientX, clientY) {
    const r = this.el.getBoundingClientRect()
    if (!r.width || !r.height) return
    const px = (clientX - r.left) / r.width          // 0..1
    const py = (clientY - r.top) / r.height          // 0..1
    this.txRy = clamp((px - 0.5) * 2, -1, 1) * MAX_TILT
    this.txRx = clamp((0.5 - py) * 2, -1, 1) * MAX_TILT
    this.txSc = HOVER_SCALE
    this.engaged = true

    // Lock the rim highlight to the pointer's bearing from the tile centre.
    const angle = Math.atan2(clientY - (r.top + r.height / 2), clientX - (r.left + r.width / 2))
    this.el.style.setProperty('--lc-edge-angle', `${(angle * 180 / Math.PI + 450) % 360}deg`)
    this.el.classList.add('is-locked')
    wake(this)
  }

  release () {
    this.txRx = 0; this.txRy = 0; this.txSc = 1
    this.engaged = false
    this.el.classList.remove('is-locked')
    wake(this)
  }

  step (dt) {
    const c = this.engaged ? DAMPING_FOLLOW : DAMPING_RETURN
    ;[this.rx, this.vrx] = spring(this.rx, this.vrx, this.txRx, dt, c)
    ;[this.ry, this.vry] = spring(this.ry, this.vry, this.txRy, dt, c)
    ;[this.sc, this.vsc] = spring(this.sc, this.vsc, this.txSc, dt, DAMPING_FOLLOW)

    const s = this.el.style
    s.setProperty('--lc-rx', `${this.rx.toFixed(3)}deg`)
    s.setProperty('--lc-ry', `${this.ry.toFixed(3)}deg`)
    s.setProperty('--lc-scale', this.sc.toFixed(4))

    const atRest = !this.engaged &&
      Math.abs(this.rx - this.txRx) < SETTLE_POS && Math.abs(this.vrx) < SETTLE_VEL &&
      Math.abs(this.ry - this.txRy) < SETTLE_POS && Math.abs(this.vry) < SETTLE_VEL

    if (atRest) {
      s.removeProperty('--lc-rx'); s.removeProperty('--lc-ry'); s.removeProperty('--lc-scale')
      s.removeProperty('will-change')
      this.rx = this.ry = this.vrx = this.vry = this.vsc = 0
      this.sc = 1
      active.delete(this)
    }
  }
}

function spring (x, v, target, dt, damping) {
  // Semi-implicit Euler. dt is clamped by the caller, so this stays stable.
  v += (-STIFFNESS * (x - target) - damping * v) * dt
  return [x + v * dt, v]
}

const clamp = (n, lo, hi) => n < lo ? lo : n > hi ? hi : n

function wake (tile) {
  tile.el.style.setProperty('will-change', 'transform')
  active.add(tile)
  if (!frame) { last = performance.now(); frame = requestAnimationFrame(tick) }
}

function tick (now) {
  const dt = Math.min((now - last) / 1000, 1 / 30)   // never integrate a long stall
  last = now
  for (const tile of active) tile.step(dt)
  frame = active.size ? requestAnimationFrame(tick) : 0
}

export function initTiles (root = document) {
  if (reduceMotion.matches || coarsePointer.matches) return

  const observer = new IntersectionObserver(entries => {
    for (const e of entries) {
      const tile = e.target.__lcTile
      if (!tile) continue
      tile.onScreen = e.isIntersecting
      if (!e.isIntersecting && active.has(tile)) tile.release()
    }
  }, { rootMargin: '120px' })

  for (const grid of root.querySelectorAll('.tile-grid')) {
    const tiles = grid.querySelectorAll('lc-tile')
    if (!tiles.length) continue

    for (const el of tiles) {
      el.__lcTile = new Tile(el)
      el.classList.add('has-edge')
      observer.observe(el)
    }

    // One delegated listener per grid, not one per tile.
    grid.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse') return
      const el = event.target.closest('lc-tile')
      if (!el || !el.__lcTile || !el.__lcTile.onScreen) return
      el.__lcTile.aim(event.clientX, event.clientY)
    }, { passive: true })

    grid.addEventListener('pointerleave', () => {
      for (const el of tiles) el.__lcTile?.engaged && el.__lcTile.release()
    }, { passive: true })

    grid.addEventListener('pointerout', event => {
      const el = event.target.closest('lc-tile')
      if (el && el.__lcTile && !el.contains(event.relatedTarget)) el.__lcTile.release()
    }, { passive: true })
  }

  // Honour a mid-session change of the motion preference.
  reduceMotion.addEventListener('change', e => {
    if (!e.matches) return
    for (const tile of active) tile.release()
  })
}
