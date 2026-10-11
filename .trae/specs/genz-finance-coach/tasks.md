# Tasks

- [x] Task 1: Project scaffolding & UI shell
  - [x] SubTask 1.1: Create `index.html` with semantic layout (hero, sidebar nav, main grid, insights feed, what-if panel, forecast drawer)
  - [x] SubTask 1.2: Create `styles/` (tokens.css, layout.css, components.css) with Gen-Z palette, glassmorphism, gradients, motion, and `prefers-reduced-motion` support
  - [x] SubTask 1.3: Create `app/` module skeleton (store, selectors, engine, insights, ui, charts, storage)
  - [x] SubTask 1.4: Seed `data/seed.js` with sample income, commitments, subscriptions, goals, and a demo Day-15 scenario

- [x] Task 2: Reactive store & data model
  - [x] SubTask 2.1: Implement single source-of-truth `state` object matching the spec schema
  - [x] SubTask 2.2: Implement store with subscribe/notify (pub-sub) so any mutation triggers full re-derive
  - [x] SubTask 2.3: Implement actions (addExpense, addIncome, addSubscription, cancelSubscription, addCommitment, addGoal, takeLoan, addUnexpected, advanceDay, reset, loadDemo)
  - [x] SubTask 2.4: Implement `localStorage` persistence (versioned load, save, reset)

- [x] Task 3: Budget engine, income & day-rollover
  - [x] SubTask 3.1: Implement pure selectors (spent, balance, remainingBudget, daysLeft, dailyAllowance, allowanceBuffer)
  - [x] SubTask 3.2: Implement income model (recurring + one-time) feeding balance, savings rate, forecast
  - [x] SubTask 3.3: Implement day-advance + recurring-debit engine (commitments, subscriptions, income, debt repayments)
  - [x] SubTask 3.4: Implement roll-over math (underspend → buffer, overspend → tighten remaining days)

- [x] Task 4: Core trackers UI
  - [x] SubTask 4.1: Transactions list with category icons, add/expense modal
  - [x] SubTask 4.2: Commitments manager (add/edit/delete recurring bills)
  - [x] SubTask 4.3: Subscriptions manager (list, monthly & annualized cost, cancel action)
  - [x] SubTask 4.4: Goals manager (target, ETA projection with reachable/at-risk/unreachable, progress ring)
  - [x] SubTask 4.5: Debts manager (take/repay loan, show principal, APR, remaining, per-day drag)

- [x] Task 5: Risk & Health scoring (explicit models)
  - [x] SubTask 5.1: Implement normalized, weighted Risk formula + per-factor breakdown + gauge component (Green/Amber/Red)
  - [x] SubTask 5.2: Implement normalized, weighted Health formula + letter grade + contributing-factor breakdown (radar/bars)
  - [x] SubTask 5.3: Wire both scores to re-derive on every state change

- [x] Task 6: Decision simulator (What-If)
  - [x] SubTask 6.1: Clone-state projection engine (no mutation of real state)
  - [x] SubTask 6.2: What-if panel with action picker + value input; projected metrics labelled PROJECTED
  - [x] SubTask 6.3: Before → after delta view (signed deltas, direction, color) for balance, allowance, risk, health, goal ETA
  - [x] SubTask 6.4: "Do nothing vs do X" dual-trajectory overlay on the forecast chart
  - [x] SubTask 6.5: Decision verdict (Smart / Caution / Avoid) with one-line reason
  - [x] SubTask 6.6: Confirm (apply + persist + animate) / discard (drop projection)
  - [x] SubTask 6.7: Presets (Buy ₹1,499 subscription, Cancel Spotify, Skip dinner out, Freelance +₹3,000, Unexpected ₹2,000, Take ₹2,000 loan)

- [x] Task 7: Insights / coaching engine
  - [x] SubTask 7.1: Rule set generating prioritized, data-driven insights (overspend pace, subscription savings, goal risk, debt load, buffer shortfall)
  - [x] SubTask 7.2: Insights feed UI with severity styling
  - [x] SubTask 7.3: Reuse insight rules to produce the simulator verdict + reason

- [x] Task 8: Forecast & charts
  - [x] SubTask 8.1: Scenario forecast engine (best / expected / worst)
  - [x] SubTask 8.2: 30-day burn-down line/area chart (supports dual-trajectory overlay)
  - [x] SubTask 8.3: Spending-by-category donut
  - [x] SubTask 8.4: Calendar heatmap of daily spending
  - [x] SubTask 8.5: Monthly forecast card with projected end balance & surplus/deficit for all three cases

- [x] Task 9: Flows, edge cases & polish
  - [x] SubTask 9.1: One-click "Unexpected expense" with pre-confirm impact preview
  - [x] SubTask 9.2: Edge-case handling (overdrawn balance, unreachable goal, Day-30 summary + continue/reset)
  - [x] SubTask 9.3: Onboarding toast + "Load demo" scenario
  - [x] SubTask 9.4: Empty-states, confirm modals, toasts, animated number transitions (respecting reduced-motion)
  - [x] SubTask 9.5: Mobile responsive pass & accessibility (focus rings, WCAG AA contrast, aria labels/roles)

- [x] Task 10: Verification
  - [x] SubTask 10.1: Walk through every checklist checkpoint manually
  - [x] SubTask 10.2: Verify persistence across reload, reset, demo-load, day-rollover
  - [x] SubTask 10.3: Verify simulator does not mutate until confirmed and discard is clean
  - [x] SubTask 10.4: Verify a single mutation re-derives ALL metrics consistently (no stale/duplicated values)
  - [x] SubTask 10.5: Spot-check risk/health formulas against hand-computed values on the demo scenario

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 3
- Task 5 depends on Task 3
- Task 6 depends on Tasks 4 and 5
- Task 7 depends on Task 5
- Task 8 depends on Tasks 3 and 5
- Task 9 depends on Tasks 6, 7, and 8
- Task 10 depends on Task 9
