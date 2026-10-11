# Plan: Complete the Gen Z Personal Finance Coach

## Summary
The app is ~90% done. This plan fixes one critical bug (localStorage never loads on reload) and closes the spec gaps called out in the verdict: Day-30 end-of-period summary, onboarding toast on first run, true historical burn-down + scenario bands on the forecast chart, explicit `allowanceBuffer` roll-over accumulator, and the missing Goal-ETA delta in the simulator delta grid. All work is additive, grounded in the existing files, and avoids architectural rewrites.

## Current State Analysis (Phase 1 findings)
- **Entry point bug.** [app/main.js:16](file:///c:/Users/ASUS/Downloads/HACKATHON/app/main.js#L16) calls `init(makeInitialState())`. [store.js:17-19](file:///c:/Users/ASUS/Downloads/HACKATHON/app/store.js#L17-L19) is `init(initial) { state = initial ?? loadState(); }` — because the caller always passes a non-null `initial`, the `loadState()` branch never executes. State is written on every change (`setState` calls `saveState`) but never read on startup. Fix is to drop the argument.
- **Day-30 summary missing.** [main.js:67-70](file:///c:/Users/ASUS/Downloads/HACKATHON/app/main.js#L67-L70) `advanceDayBtn` handler only caps and toasts. No `state.day === 30` summary modal exists; the dangling `// Onboarding hint on first run` comment at the very end of main.js ([main.js:733](file:///c:/Users/ASUS/Downloads/HACKATHON/app/main.js#L733)) proves the onboarding and summary blocks were deleted.
- **Onboarding toast missing.** `localStorage.getItem("paisa_onboarded")` is never read; the file ends with only a `// Onboarding hint on first run` comment, no code.
- **Forecast chart single-line.** [main.js:506-508](file:///c:/Users/ASUS/Downloads/HACKATHON/app/main.js#L506-L508) passes the same `expectedTrajectory(state)` `line` into BOTH `forecastCanvas` and `burndownCanvas`. [helpers.js:26-44](file:///c:/Users/ASUS/Downloads/HACKATHON/app/helpers.js#L26-L44) `expectedTrajectory` is a linear extrapolation with no historical per-day balance. There is no `best`/`worst` band rendered — only the three numbers in the forecast cards.
- **Allowance roll-over partial.** [selectors.js:18](file:///c:/Users/ASUS/Downloads/HACKATHON/app/selectors.js#L18) computes `dailyAllowance = balance / daysLeft` correctly (overspend tightens), but the schema/spec call for an explicit `allowanceBuffer` accumulator for underspend days. Currently every render recomputes from current balance without carrying forward day-over-day savings.
- **Simulator delta view omits Goal-ETA.** [main.js:194-200](file:///c:/Users/ASUS/Downloads/HACKATHON/app/main.js#L194-L200) renders five deltas (balance, daily allowance, risk, health, forecast end). The spec called out "balance, allowance, risk, health, **savings ETA**" — savings/goal ETA is the missing sixth delta.
- **Other status (out of scope / accepted)** — modal focus trap, empty `data/`/`assets/` folders, simulator helper leftovers: keep as-is per the verdict.

## Proposed Changes

### Fix 1 — Critical: localStorage load (1-line)
- **File**: [app/main.js](file:///c:/Users/ASUS/Downloads/HACKATHON/app/main.js) (line 16)
- **What**: `init(makeInitialState());` → `init();` so the store falls back to `loadState()` when present.
- **Why**: `store.js` already implements the right fallback; the caller is the only thing bypassing it. Without this fix, "State persists across reload" and "Mid-period reload" both fail.
- **How**: Replace exactly that single line. Keep `makeInitialState` / `makeDemoState` imports — they are still used by `resetJourney` / `loadDemo` handlers.

### Fix 2 — Onboarding toast on first run
- **File**: [app/main.js](file:///c:/Users/ASUS/Downloads/HACKATHON/app/main.js) (just before `subscribe(render)` at the end)
- **What**: Add a small IIFE that:
  1. Checks `localStorage.getItem("paisa_onboarded")`.
  2. If absent AND `getState().transactions.length === 0` AND `getState().subscriptions.length === 0` AND `getState().commitments.length === 0`, call `toast("Tip: try the Simulate panel to preview a decision before committing.", "success")` after a 600ms delay.
  3. Sets `localStorage.setItem("paisa_onboarded", "yes")` so it only fires once.
- **Why**: Task 9.3 + spec "Onboarding toast on first run".
- **How**: Re-introduce the deleted block, gated by the localStorage flag. Uses the existing `toast()` helper and respect the existing toast styling.

### Fix 3 — Day-30 end-of-period summary modal
- **File**: [app/main.js](file:///c:/Users/ASUS/Downloads/HACKATHON/app/main.js)
- **What**: Inside `render()` (after the hero metrics are written), check `if (state.day >= 30 && !window._paisaDay30ShownForDay)`. If so, build an `openModal(...)` titled "Day 30 — journey summary" with body listing:
  - Final balance (from `selectDerived(state).balance`)
  - Total saved toward goals (`saved` from derived)
  - Goals-met count (`goalProjections.filter(p => p.remaining === 0).length`)
  - Final grade letter + healthScore
  - Final risk score + band
  - Goals at risk / unreachable counts
  - Two footer buttons: **Keep & continue** (closes modal) and **Reset journey** (closes modal then calls existing `resetJourney(makeInitialState)` + `toast("Journey reset. Fresh start!")`).
- Use `window._paisaDay30ShownForDay = 30` as a per-render flag (per-session, not persisted), and a second flag for state-reset path so a fresh Day 1 doesn't re-fire it.
- **Why**: Spec `End of period` scenario and Task 9.2.
- **How**: UI-only trigger inside `render()` (NOT inside `advanceDay`) so dismissing the modal is a no-op and never rolls back state.

### Fix 4 — True burn-down historical line + scenario bands on forecast chart
- **Files**:
  - [app/helpers.js](file:///c:/Users/ASUS/Downloads/HACKATHON/app/helpers.js) — add new exported functions.
  - [app/charts.js](file:///c:/Users/ASUS/Downloads/HACKATHON/app/charts.js) — extend `drawBurndown` signature to accept optional band lines.
  - [app/main.js](file:///c:/Users/ASUS/Downloads/HACKATHON/app/main.js) — replace the two single-line draw calls with banded ones.
- **What**:
  - `helpers.js`: add `historicalBalance(state)` returning a length-31 array. For `d = 1..state.day`, walk transactions sorted by `(day, ts)`, `arr[d] = prev - t.amount` (income is already encoded as negative). Days before `state.day`: linear interpolation from `budget` (Day 0) to `arr[state.day]`.
  - `helpers.js`: add `forecastBands(state)` returning `{ expectedLine, bestLine, worstLine }` by computing the existing `expectedTrajectory` three times with the daily-net drift pushed ±20%.
  - `charts.js`: extend `drawBurndown(canvas, currentLine, opts = {})` where `opts` can include `{ bestLine, worstLine, projectedLine }`. When `bestLine` and `worstLine` are provided, fill a soft band between them with `rgba(139,92,246,0.10)` then draw the dashed `projectedLine` (if any) and the solid `currentLine`. Backwards-compatible: simulator usage `drawBurndown(canvas, currentLine, projectedLine)` keeps working — internally we map `projectedLine` to `opts.projectedLine` when `opts` is the second positional arg of a series.
  - `main.js` render block:
    - `const hist = historicalBalance(state); const bands = forecastBands(state);`
    - `drawBurndown(burndownCanvas, hist, { bestLine: bands.bestLine, worstLine: bands.worstLine });` — historical line + future band.
    - `drawBurndown(forecastCanvas, bands.expectedLine, { bestLine: bands.bestLine, worstLine: bands.worstLine });` — projected (expected) + band.
  - Update the simulator's call to `drawForecast(canvas, currentLine, projectedLine)` — keep it as-is; it should pass `projectedLine` as a dashed overlay on top of the bands. The current `drawForecast` is a thin wrapper that calls `drawBurndown(canvas, currentLine, projectedLine)` and we just adjust `charts.js`'s parameter handling so the fourth arg is treated as `opts.projectedLine` when it's the call signature `(canvas, currentLine, projectedLine)`. Simpler: leave the existing signature alone and add `drawBurndownBands` for the new behavior so we don't break the simulator call site.
- **Why**: Task 8.1, 8.2 + spec "Scenario-Based forecast" (best/expected/worst) and a "true burn-down" that reflects what actually happened.
- **How**: Pure derived — no state mutation, no schema change. Use a single new helper function name in `charts.js` (`drawBurndownBands`) instead of changing the existing call sites' arity.

### Fix 5 — `allowanceBuffer` roll-over (explicit accumulator)
- **Files**: [app/seed.js](file:///c:/Users/ASUS/Downloads/HACKATHON/app/seed.js), [app/selectors.js](file:///c:/Users/ASUS/Downloads/HACKATHON/app/selectors.js), [index.html](file:///c:/Users/ASUS/Downloads/HACKATHON/index.html), [app/main.js](file:///c:/Users/ASUS/Downloads/HACKATHON/app/main.js).
- **What**:
  - `seed.js`: add `allowanceBuffer: 0` (and reset it in `makeInitialState` and `makeDemoState`). `makeDemoState` should compute a realistic demo buffer from the 14-day seed spend (so on Day 15 the buffer isn't 0 if the user underspent).
  - `selectors.js` `selectDerived`: at the end, compute `allowanceBuffer` as the sum across days `1..state.day - 1` of `max(0, dayAllowance - daySpend)`. `dayAllowance` for day `d` is `budget / PERIOD_DAYS` (or whatever was the allowance at that day, the spec is silent; we use the constant sustainable-pace value for simplicity and to match the existing demo expected behavior). Clamp the running sum to be non-negative. Return it on the derived object alongside `dailyAllowance`.
  - `index.html`: add a new `meta-item` chip after "Daily allowance" titled "Buffer (rolled over)" containing `<span id="bufferNum">0</span>`.
  - `main.js` render: `bufferNum.textContent = inrPlain(d.allowanceBuffer);`
- **Why**: Spec `Daily Allowance & Roll-Over` scenario "Underspend rolls over" needs an explicit, visible buffer number the user can see and watch react when they underspend.
- **How**: Stays a pure derived selector (no state mutation), so the existing pub-sub re-derive-on-every-mutation guarantee still holds.

### Fix 6 — Simulator: add Goal-ETA delta
- **File**: [app/main.js](file:///c:/Users/ASUS/Downloads/HACKATHON/app/main.js) in `runSimulation` (around the `ds` array at line 194).
- **What**: Add a sixth delta card rendered after the five existing ones:
  - If `state.goals.length === 0`, show `{ label: "Goal ETA", a: "—", b: "—", fmt: v => v }`.
  - Else for each goal: a separate card showing the worst-status change (e.g., reachable → unreachable, or "Need ₹X/day → ₹Y/day"). Use a helper `goalDeltaText(curGoals, projGoals)` that returns a string per goal and stacks them in the card body.
- **Why**: Spec called out "before → after delta view … for balance, daily allowance, risk, health, savings ETA" — Goal-ETA is the missing piece.
- **How**: Append to `ds` (different shape because goals are arrays); render as a wider card spanning the row.

### Fix 7 — Cleanup leftovers (optional, low-risk)
- **File**: [app/main.js](file:///c:/Users/ASUS/Downloads/HACKATHON/app/main.js) top: remove the dangling `// Onboarding hint on first run` comment at the bottom and any unused simulator helpers that reference `pending` (verified by `node --check` — none break execution, just noise). Cosmetic only.
- **Empty `data/` and `assets/` folders**: leave as-is (harmless; spec asked for them).

## Files Touched
- `app/main.js` — Fixes 1, 2, 3, 4 (chart wiring), 5 (chip render), 6, 7
- `app/helpers.js` — Fix 4 (`historicalBalance`, `forecastBands`)
- `app/charts.js` — Fix 4 (new `drawBurndownBands`)
- `app/selectors.js` — Fix 5 (`allowanceBuffer` derivation, returned in `selectDerived`)
- `app/seed.js` — Fix 5 (`allowanceBuffer: 0` in both factory functions)
- `index.html` — Fix 5 (one chip in hero meta)

## Assumptions & Decisions
- I keep the path-greenfield: no backend, no new libraries. Charts stay vanilla `<canvas>`.
- I do NOT add focus trapping to the modal (the verdict explicitly deferred it; out of scope).
- The Day-30 summary is shown from `render()` (UI-only), never inside `advanceDay`, so the modal can be dismissed without rolling back state and won't re-fire spuriously after Reset (we gate on `window._paisaDay30ShownForDay`).
- `allowanceBuffer` is computed purely from past days (`1..state.day - 1`), so it's a true derived selector with zero schema coupling — it survives all migrations.
- Forecast chart is split: burn-down card = historical line + future band; forecast card = expected line + best/worst band. The simulator's dual-trajectory overlay inside its projection block is untouched (it already works).
- The empty `data/`/`assets/` folders are deliberately left untouched.

## Verification
1. **Static checks**: `node --check` every touched `.js` file.
2. **localStorage persistence (Fix 1)**: `python -m http.server 8765` from the project root, open `http://127.0.0.1:8765/index.html`, click **Load demo**, then hard-reload. Confirm `Day 15 / 30` and the seeded transactions/balance are restored.
3. **Onboarding (Fix 2)**: clear localStorage / use a fresh browser profile, reload. Confirm a single tip toast appears and not on subsequent reloads (the `paisa_onboarded` flag persists).
4. **Day-30 summary (Fix 3)**: from any state, click **Advance to next day** until Day 30. Confirm the summary modal opens once with the final balance, saved total, grade, risk, goals-met count, and the **Reset journey** / **Keep & continue** buttons.
5. **Forecast band + true burn-down (Fix 4)**: confirm the forecast card chart now shows a band (violet tinted) plus the expected line; the burn-down card chart shows the historical line up to today and the band beyond.
6. **Allowance buffer (Fix 5)**: log a small expense below today's allowance. Confirm the "Buffer (rolled over)" chip in the hero updates to a positive number; advance a day and re-check that the buffer survives the re-derive.
7. **Goal-ETA delta (Fix 6)**: in the simulator, run a "Take ₹2,000 loan" simulation with an existing goal. Confirm a sixth delta card appears with the goal status change.
8. **Regression check**: load demo, run a couple of presets in the simulator, log an expense, advance a day, cancel a subscription — none of the previous flows should regress (formula sanity, charts redraw, persistence still works).
