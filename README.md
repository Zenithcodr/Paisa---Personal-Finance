# Paisa — Personal Finance Coach

A modern, interactive personal-finance experience for Gen Z. Manage a limited **₹10,000 budget over 30 days** and see how every financial decision ripples through your balance, daily allowance, savings goals, forecast, risk, and overall financial health — before you commit to it.

Built as a dependency-free, offline-first single-page web app. No backend, no build step, no tracking. Your journey lives in `localStorage`.

## Features

- **30-day budget engine** — ₹10,000 start, daily allowance with roll-over buffer, day-by-day simulation.
- **Interconnected model** — a single source-of-truth state with pure derived selectors, so any action recomputes every metric in one cycle.
- **Decision simulator** — preview any decision (expense, subscription, income, loan, cancel, skip, unexpected) with a before → after delta view, a "do nothing vs do this" forecast overlay, and a Smart / Caution / Avoid verdict. Nothing is saved until you confirm.
- **Trackers** — transactions, recurring commitments, subscriptions (monthly + annualized cost), income (recurring + one-time), savings goals (reachable / at-risk / unreachable ETA), and debts/loans with repayment drag.
- **Risk score (0–100)** and **Health grade (A+–D)** — explicit weighted models with a visible per-factor breakdown.
- **Coaching insights** — plain-language, prioritized nudges derived from your numbers.
- **Scenario forecast** — best / expected / worst end-of-period projection with a banded chart.
- **Dashboards** — balance dial, risk gauge, health factors, burn-down chart, category donut, spending heatmap.
- **Day-30 summary**, one-click **demo scenario**, and full **reset**.

## Run it

No install needed. Because it uses ES modules, serve it over HTTP (opening the file directly won't load modules):

```bash
# Python
python -m http.server 8000

# or Node
npx serve .
```

Then open `http://localhost:8000`.

## Project structure

```
index.html          # app shell / layout
styles/             # tokens, layout, components (Gen-Z aesthetic, reduced-motion aware)
app/
  store.js          # single source of truth + actions (pub/sub)
  selectors.js      # pure derived metrics (balance, allowance, risk, health, forecast)
  seed.js           # initial + demo state
  storage.js        # localStorage persistence
  insights.js       # coaching engine
  verdict.js        # simulator verdict
  charts.js         # canvas charts (burn-down, bands, donut, gauge)
  helpers.js        # trajectory + aggregation helpers
  main.js           # wiring, rendering, modals, simulator UI
.trae/              # product spec, tasks, and checklist
```

## Tech

Vanilla JavaScript (ES modules), HTML, CSS, and the Canvas 2D API. No frameworks or external runtime dependencies.
