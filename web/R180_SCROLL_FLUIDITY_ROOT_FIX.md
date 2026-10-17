# R180 — Scroll Fluidity Root Fix

Base: R179.

## Root cause removed
R179 added same-origin document prefetch on pointerover/focus. During vertical scrolling a stationary pointer can cross anchors, causing speculative document fetches while the browser is compositing the page. This optimization has been removed entirely.

## Preserved
- R179 image WebP optimization.
- Authoritative Neith identity through neith_web_account_state.
- Admin/Supabase performance work.
- Existing visual design and responsive behavior.

## Invariant
No new scroll, wheel, pointerover or pointerout workload was added in R180. js/performance.js is restored byte-for-byte to the R178 stable implementation.
