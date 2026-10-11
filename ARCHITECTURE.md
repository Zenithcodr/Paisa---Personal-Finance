# Architecture

Paisa is a dependency-free, offline-first single-page app built with **TypeScript + Vite**. It is organized around a single reactive source of truth with pure derived selectors, so any action recomputes every metric in one cycle.

## Layers

```
src/
  types/        # AppState + DerivedMetrics type definitions (strict TS)
  core/         # framework-free domain logic
    store.ts        # single source of truth + actions + pub/sub
    selectors.ts    # pure derived metrics (balance, allowance, risk, health, forecast)
    seed.ts         # initial + demo (Day-15) state
    storage.ts      # versioned, schema-validated localStorage persistence
    insights.ts     # coaching engine
    verdict.ts      # decision-simulator verdict (Smart / Caution / Avoid)
    charts.ts       # canvas charts (burn-down, bands, donut, gauge)
    helpers.ts      # trajectory + aggregation helpers
    constants.ts    # money formatting, clamp, escapeHtml, uid
  ui/           # view layer (one module per feature)
    hero.ts, simulator.ts, modal.ts, toast.ts
    trackers/   # transactions, subscriptions, commitments, income, goals, debts
    views/      # forecast, category, heatmap, insights
  main.ts       # composition root: wires components to the store render loop
```

## Data flow

1. `store` holds one `AppState`. Every mutation goes through an action that clones state, applies the change, persists it, and notifies subscribers.
2. `main.ts` subscribes a master `render(state)` that calls each component's `render(state, derived)`.
3. `selectDerived(state)` is pure: given state it returns balance, daily allowance, roll-over buffer, savings rate, risk (0–100 with weighted factors), health (A+–D with weighted factors), goal projections, and best/expected/worst forecast. Displayed numbers are never stored twice.
4. The decision simulator clones state, applies a synthetic action, and derives metrics on the clone — never mutating saved data until the user confirms.

## Scoring models

- **Risk (0–100):** weighted sum of burn rate, balance-vs-expected, subscription burden, commitment pressure, debt load, and buffer shortfall.
- **Health (A+–D):** weighted sum of savings rate (retained share of inflows), subscription discipline, commitment coverage, forecast surplus, and goal progress, with a debt/high-risk penalty.

## Quality gates

`npm run typecheck` (strict), `npm run lint` (ESLint, zero warnings), `npm test` (Vitest), `npm run format`, and `npm run build` all pass. Security: strict CSP + security headers, schema-validated persistence, escaped user input, zero runtime dependencies.
