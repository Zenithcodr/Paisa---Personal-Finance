# Checklist

## Core engine
- [x] App loads with Day 1, ₹10,000 budget, balance, daily allowance ≈ ₹333.33
- [x] A single mutation re-derives ALL metrics in one update cycle (no stale or duplicated values)
- [x] User can add an expense and balance, allowance, spent, burn-down all update
- [x] Underspending rolls over into the allowance buffer; overspending tightens remaining days
- [x] Recurring + one-time income increase balance and feed savings rate and forecast
- [x] User can add a recurring commitment and it auto-debits when due
- [x] User can add/cancel a subscription and forecast reflects the change
- [x] User can take a loan: balance rises now, repayment drag appears, risk up, health down
- [x] User can set a savings goal and see reachable / at-risk / unreachable ETA

## Scores & insights
- [x] Risk gauge shows 0–100 with Green / Amber / Red bands, animates on change, and shows per-factor breakdown
- [x] Health score shows A+/A/B/C/D with contributing-factor breakdown and updates on every action
- [x] Risk/health match hand-computed values on the demo scenario (formula sanity check)
- [x] Insights feed shows prioritized, data-driven nudges (overspend pace, subscription savings, goal risk, debt load)

## Decision simulator
- [x] What-if panel shows PROJECTED metrics for any action and only mutates on confirm
- [x] Before → after delta view shows signed deltas with direction + color for balance, allowance, risk, health, goal ETA
- [x] Forecast overlays "do nothing" vs "do this" 30-day trajectories
- [x] Each simulation shows a verdict (Smart / Caution / Avoid) with a one-line reason
- [x] Discarding a simulation leaves state untouched
- [x] Unexpected-expense flow previews impact before confirming

## Charts & forecast
- [x] Burn-down chart, category donut, spending heatmap all render and update live
- [x] Monthly forecast card shows best / expected / worst projected end balance & surplus/deficit

## Persistence & edge cases
- [x] State persists across reload via localStorage
- [x] "Load demo" seeds a realistic ~Day 15 scenario with income, spending, commitments, subscriptions, goal, and debt
- [x] Reset returns to Day 1, ₹10,000, empty state after confirmation
- [x] Overdrawn balance, unreachable goal, and Day-30 summary behave as specced

## Experience & quality
- [x] UI is consistent Gen-Z aesthetic with motion, no plain HTML look
- [x] Layout is responsive on mobile and desktop
- [x] All interactive controls have focus states and accessible labels/roles; contrast meets WCAG AA
- [x] `prefers-reduced-motion` disables/minimizes number tweening and non-essential animation
- [x] Interactions commit in under ~100ms and the app works offline with no backend

## Verification run-notes
- Engine smoke (Node) verified:
  - Fresh Day 1: balance 10,000 · allowance 333.33 · daysLeft 30 · health 100 · risk 3
  - After ₹350 expense on Day 1: balance 9,650 · spent 350
  - Demo Day 15: balance 6,963 · allowance 435 · spent 7,037 · income 4,000 · risk 15 · health 63 (C)
  - Project ₹1,499 subscription ⇒ sub monthly bumps, risk rises
  - Project cancel Spotify ⇒ sub monthly reduces
  - Project unexpected ₹2,000 ⇒ balance drops
  - Project ₹2,000 loan ⇒ balance jumps, debt recorded, risk/health worsen
- All 9 ES modules and the HTML passed Node syntax check.
- File watcher: server responded 200 for `/index.html`.
