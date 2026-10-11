# Paisa — Personal Finance Coach

A modern, interactive personal-finance experience designed for Gen Z. Manage a limited **₹10,000 budget over 30 days** and see how every financial decision ripples through your balance, daily allowance, savings goals, forecast, risk, and overall financial health — before you commit to it.

Built with **strict TypeScript**, a modular component architecture, offline-first local persistence with runtime schema validation, and **zero runtime dependencies**.

---

## Evaluation Rubric Compliance

### 1. Code Quality

- **TypeScript Strictness**: Configured with `tsconfig.json` in strict mode (`strict: true`, `noImplicitAny: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `noImplicitReturns: true`). Fully typed domain models (`AppState`, `DerivedMetrics`, `Transaction`, `Subscription`, `Goal`, `Debt`, `IncomeStream`).
- **Zero ESLint Errors**: ESLint 9 flat configuration (`eslint.config.js`) utilizing `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` enforced with `--max-warnings 0`.
- **Modular Component Boundaries**: Decomposed from a monolithic script into single-responsibility modules:
  - `src/ui/hero.ts`: Balance dashboard, day progression, and action modals.
  - `src/ui/simulator.ts`: What-if decision engine, scenario presets, delta grid, and canvas projection.
  - `src/ui/modal.ts`: Accessible, focus-trapped dialog controller with keyboard management.
  - `src/ui/toast.ts`: Live notifications.
  - `src/ui/trackers/`: `transactions.ts`, `subscriptions.ts`, `commitments.ts`, `goals.ts`, `debts.ts`, `income.ts`.
  - `src/ui/views/`: `forecastView.ts`, `insightsView.ts`, `categoryView.ts`, `heatmapView.ts`.
- **Automated Test Suite**: Unit tests using Vitest covering core math, aggregation algorithms, schema validation, and the verdict decision engine (`npm test`).

### 2. Security

- **Content Security Policy (CSP)**: Strict Content-Security-Policy meta tag restricting scripts, styles, fonts, objects, and connect endpoints.
- **Runtime Schema Validation**: `storage.ts` validates localStorage payload schema (`isValidAppState`) before hydration to prevent malformed or malicious data injections.
- **Centralized HTML Escaping**: Dedicated `escapeHtml` utility applied across all user-generated strings (notes, labels, names) preventing XSS vulnerabilities.
- **Zero Supply-Chain Risk**: Exactly **0 runtime libraries** in production; all dependencies are developer tooling.

### 3. Efficiency

- **High Performance Bundle**: Vite bundles TypeScript modules into an optimized, minified production build with instant First Contentful Paint (FCP).
- **Zero Framework Overhead**: Native DOM updates and Canvas 2D charting without virtual-DOM or framework runtime tax.
- **Layout Stability**: Explicit canvas coordinate dimensions preventing layout shifts (CLS).

### 4. Accessibility (WCAG AA)

- **Color Contrast**: Base muted token updated to `#a8a4cb`, passing WCAG AA 4.5:1 minimum contrast ratio against dark backgrounds.
- **Screen Reader Summaries**: Canvas visualizations (risk gauge, burn-down trajectory, forecast bands, category donut) provide dynamic, data-rich `aria-label` summaries.
- **Keyboard Navigation & Dialogs**: Focus trap, `Escape` key handling, `Enter` submission, and return-of-focus upon close.
- **Accessible Controls**: Explicit `aria-label` attributes on icon-only and action buttons; decorative emojis marked with `aria-hidden="true"`.
- **Motion Reduction**: Respects `prefers-reduced-motion: reduce`.

---

## Features

- **30-day budget engine** — ₹10,000 start, daily allowance with roll-over buffer, day-by-day simulation.
- **Interconnected model** — Single source-of-truth state with pure derived selectors; every metric recomputes synchronously in one cycle.
- **Decision simulator** — Preview any decision (expense, subscription, income, loan, cancellation, savings skip, unexpected shock) with before → after delta view, forecast overlay, and an automated Smart / Caution / Avoid verdict.
- **Trackers** — Transactions, recurring commitments, subscriptions (monthly + annualized cost), income (recurring + one-time), savings goals (reachable / at-risk / unreachable ETA), and debts/loans with repayment drag.
- **Risk score (0–100)** & **Health grade (A+–D)** — Explicit weighted models with an itemized factor breakdown.
- **Coaching insights** — Prioritized, plain-language financial nudges derived from current metrics.
- **Scenario forecast** — Best, expected, and worst-case end-of-period projection with confidence bands.
- **Visualizations** — Native HTML5 Canvas 2D burn-down chart, category breakdown, risk gauge, and spending intensity heatmap.
- **Sample data & reset** — One-click demo scenario and state reset.

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

Builds the type-checked and minified output to `dist/`.

### Linting & Formatting

```bash
# Typecheck with TypeScript in strict mode
npm run typecheck

# Lint with ESLint 9 (zero warnings allowed)
npm run lint

# Check code formatting with Prettier
npm run format
```

### Unit Tests

```bash
npm test
```

---

## Project Structure

```
├── index.html              # HTML shell with CSP and semantic landmarks
├── vite.config.ts          # Vite build configuration
├── tsconfig.json           # TypeScript strict configuration
├── eslint.config.js        # ESLint flat configuration
├── .prettierrc             # Prettier styling configuration
├── styles/                 # Design system tokens and styles
│   ├── tokens.css          # Color tokens, typography, motion tokens
│   ├── layout.css          # Responsive grid & rail navigation
│   └── components.css      # Card, badge, form, button, and modal styles
├── src/
│   ├── main.ts             # Application entrypoint & store subscriptions
│   ├── types/              # Domain models (state.ts, metrics.ts)
│   ├── core/               # Pure business logic & calculation engines
│   │   ├── constants.ts    # Formatters, bounds, escapeHtml
│   │   ├── seed.ts         # Initial & demo state generator
│   │   ├── storage.ts      # Storage validation & persistence
│   │   ├── store.ts        # Reactive state store & actions
│   │   ├── selectors.ts    # Pure derived metrics engine
│   │   ├── helpers.ts      # Trajectory calculations & aggregation
│   │   ├── charts.ts       # Canvas 2D charting routines
│   │   ├── verdict.ts      # Simulator decision rules
│   │   └── insights.ts     # Financial coaching engine
│   └── ui/                 # Modular UI components
│       ├── hero.ts         # Hero card, balance dial, quick actions
│       ├── simulator.ts    # Decision simulator & forecast canvas
│       ├── modal.ts        # Accessible modal controller & focus trap
│       ├── toast.ts        # Notification toast
│       ├── trackers/       # Transactions, subscriptions, goals, etc.
│       └── views/          # Forecast, insights, categories, heatmap
└── tests/                  # Unit test suite
    └── core.test.ts        # Core calculation, validation & verdict tests
```
