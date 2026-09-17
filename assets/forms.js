/**
 * Forms.
 *
 * Every form on this site posts to a real endpoint and works without this file
 * — the enhancement here is inline error messaging, the multi-step wrapper and
 * sessionStorage persistence. With JS off the multi-step form degrades to the
 * plain single-page version at ?simple=1 (linked in the markup, not injected).
 */
const ERR = 'is-invalid'

export function initForms () {
  // A stepped form is wired by steps() at the end of its own setup. Wiring it
  // here as well would attach two submit listeners and double-count the lead.
  for (const form of document.querySelectorAll('form[data-validate]:not([data-steps])')) wire(form)
  for (const form of document.querySelectorAll('form[data-steps]')) steps(form)
}

function wire (form) {
  const summary = form.querySelector('[data-error-summary]')

  form.addEventListener('submit', event => {
    clear(form)
    const bad = [...form.elements].filter(el => el.willValidate && !el.checkValidity())
    if (!bad.length) {
      // Time-to-submit check: a human cannot complete this in under 3 seconds.
      const started = Number(form.dataset.started || 0)
      if (started && Date.now() - started < 3000) {
        event.preventDefault()
        say(summary, 'That was very quick — please check the form and submit again.')
        return
      }
      window.dataLayer?.push({ event: 'generate_lead', form_name: form.name || form.id })
      return
    }
    event.preventDefault()
    for (const el of bad) mark(el)
    say(summary, `Please check ${bad.length} ${bad.length === 1 ? 'field' : 'fields'} below.`)
    bad[0].focus()
  })

  form.dataset.started = String(Date.now())
  form.addEventListener('input', e => e.target.classList.contains(ERR) && unmark(e.target))
}

function mark (el) {
  el.classList.add(ERR)
  el.setAttribute('aria-invalid', 'true')
  const hint = document.getElementById(`${el.id}-error`)
  if (hint) hint.textContent = el.validationMessage
}

function unmark (el) {
  el.classList.remove(ERR)
  el.removeAttribute('aria-invalid')
  const hint = document.getElementById(`${el.id}-error`)
  if (hint) hint.textContent = ''
}

function clear (form) {
  for (const el of form.elements) el.classList?.contains(ERR) && unmark(el)
  const s = form.querySelector('[data-error-summary]')
  if (s) s.textContent = ''
}

function say (summary, message) {
  if (!summary) return
  summary.textContent = message
}

/**
 * Five-step enrolment wrapper. State lives in sessionStorage so a refresh or an
 * accidental back does not cost a parent twenty minutes of typing.
 */
function steps (form) {
  const panels = [...form.querySelectorAll('[data-step]')]
  const dots = form.querySelector('[data-step-dots]')
  const key = `lc-form-${form.id}`
  let at = 0

  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || '{}')
    for (const [name, value] of Object.entries(saved)) {
      const field = form.elements[name]
      if (field && typeof value === 'string') field.value = value
    }
  } catch { /* storage unavailable; the form still works */ }

  form.addEventListener('input', () => {
    try {
      const data = {}
      for (const el of form.elements) if (el.name && el.type !== 'file') data[el.name] = el.value
      sessionStorage.setItem(key, JSON.stringify(data))
    } catch { /* ignore */ }
  })

  form.addEventListener('submit', () => { try { sessionStorage.removeItem(key) } catch { /* ignore */ } })

  function show (next) {
    const panel = panels[at]
    if (next > at) {
      const bad = [...panel.querySelectorAll('input, select, textarea')].filter(el => el.willValidate && !el.checkValidity())
      if (bad.length) { for (const el of bad) mark(el); bad[0].focus(); return }
    }
    at = Math.max(0, Math.min(panels.length - 1, next))
    panels.forEach((p, i) => { p.hidden = i !== at })
    if (dots) {
      dots.textContent = `Step ${at + 1} of ${panels.length}`
      dots.style.setProperty('--progress', `${((at + 1) / panels.length) * 100}%`)
    }
    panels[at].querySelector('h2, h3')?.focus?.()
    history.replaceState(null, '', `#step-${at + 1}`)
  }

  form.addEventListener('click', e => {
    const btn = e.target.closest('[data-step-go]')
    if (!btn) return
    e.preventDefault()
    show(at + Number(btn.dataset.stepGo))
  })

  const fromHash = Number(location.hash.replace('#step-', ''))
  show(Number.isFinite(fromHash) && fromHash > 0 ? fromHash - 1 : 0)
  wire(form)
}
