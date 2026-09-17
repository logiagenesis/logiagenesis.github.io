# SECOND AUDIT — rescue/liquid-glass-rebuild

Recorded after the liquid-glass rebuild. First-pass screenshot failures only.

## Visual failures 1–10

| # | First pass | Second pass |
|---|---|---|
| 1 | Flat white cards | **Fixed.** `<lc-tile>` uses transparent border + `background-clip: padding-box, border-box` + translucent fill + `backdrop-filter: blur(24px) saturate(180%)` over `lc-glass-stage` lime/teal fields. Rim is the second background layer. |
| 2 | Plain badge dials | **Fixed.** `<lc-dial>` is a 168px circular lens: same material, meniscus, conic rim, pointer bearing, radial shadow. |
| 3 | Invisible rim | **Fixed.** Conic rim on the border only. Idle drift + pointer lock. Face has a vertical inner highlight, not a diagonal glare. Feature-card lime face fill removed. |
| 4 | Class cards truncated | **Fixed.** Home and `/classes` tiles render the full archive body. |
| 5 | “To confirm:” rewrite | **Fixed.** `Todo` renders the literal `{{TODO_CONFIRM: …}}` token. `audit:content` fails if `To confirm:` returns. |
| 6 | Gallery 84 not 102 | **Held.** 84 source stems, 0 published. Page shows only the two required tokens. Not faked. `audit:gallery` still fails (sourceTotal 84, empty consentRef). |
| 7 | 102 grid law | **Held.** Cannot satisfy a 102-image legal grid without 102 consented files. Gated. |
| 8 | Cheap cookie slab | **Fixed.** Compact glass `<lc-tile>` dock, bottom-right. Body padding so it does not cover CTAs. |
| 9 | Hero child, no consentRef | **Fixed.** Photo removed. Abstract cream + lime/teal fields + glass dials + wave. |
| 10 | Daycare template | **Fixed.** 3-up icon stats removed. One material everywhere. Dials carry the three sourced facts. |

## Machine checks

| Check | Result |
|---|---|
| `audit:content` | PASS |
| `audit:gallery` | FAIL — sourceTotal 84 ≠ 102; empty consentRef. Correct: do not publish. |
| `audit:seo` | PASS |
| `audit:a11y` | PASS |
| `audit:perf` | PASS |
| `audit:motion` | PASS |
| `tsc --noEmit` | PASS |
| Dev smoke 1280 and 390 | PASS |
