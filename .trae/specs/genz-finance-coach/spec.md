# Gen Z Personal Finance Coach Spec

## Why
Gen Z users managing a tight ₹10,000/30-day budget need more than a tracker — they need a consumer-grade financial product that shows how a single decision (e.g., buying a ₹1,499 subscription) ripples through remaining balance, daily allowance, savings goals, monthly forecast, risk, and overall financial health. The opportunity is to deliver a feel-good, interactive, decision-simulation experience that makes the consequences of financial choices instantly visible — and to *coach* the user toward informed decisions, not just record them.

## What Changes
- Build a single-page, modern, interactive web app (responsive, Gen-Z aesthetic: bold typography, glassmorphism, gradient accents, smooth micro-animations).
- Implement a 30-day budget engine with ₹10,000 starting budget, an income model, daily-allowance roll-over, and a decision simulator ("What-if I spend ₹X?").
- Track interconnected domains: Income, Balance, Daily Allowance, Spending, Commitments (recurring bills), Subscriptions, Unexpected Expenses, Debt/Loans, Savings Goals, Monthly Forecast, Financial Risk Score, Financial Health Score.
- Model the system as a **single reactive source of truth** with pure derived selectors so that ANY mutation recomputes ALL downstream metrics — the "interconnected consequences" are guaranteed by architecture, not convention.
- Define Risk and Health as **explicit, normalized, weighted formulas** with a visible per-factor breakdown for both.
- Provide a **coaching/insights engine** that turns the numbers into plain-language nudges and gives every simulated decision a verdict (Smart / Caution / Avoid) with a one-line reason.
- Provide a unified decision-impact panel with a **before → after delta view** and a **"do nothing vs do X over 30 days"** comparison.
- Project a **scenario forecast** (best / expected / worst case), not a single straight line.
- Persist state in `localStorage` so the user's 30-day journey survives reloads, plus a one-click demo scenario (jump to a realistic Day 15).
- Visual dashboards: balance dial, 30-day burn-down chart, risk gauge, health radar, savings goal progress, calendar heatmap of spending.

## Impact
- Affected specs: `budget-engine`, `financial-model`, `income-model`, `decision-simulator`, `financial-health-model`, `risk-model`, `subscriptions-tracker`, `goals-tracker`, `debt-model`, `forecast-engine`, `insights-engine`, `persistence`, `ui-shell`.
- Affected code: New project (greenfield under `c:\Users\ASUS\Downloads\HACKATHON`) — `index.html`, `styles/`, `app/` (vanilla JS modules or single bundle), `data/seed.js`.

## Architecture Principle: Single Source of Truth
The entire app state lives in one `state` object. All displayed numbers are **pure derived selectors** of that state (never stored twice). Mutations go through a small set of actions; after any action the store notifies subscribers and the UI re-derives every metric. This is what makes consequences interconnected and consistent by construction.

## Data Model / Schema
```
state = {
  version: "1",
  startedAt: ISODate,
  day: 1..30,                       // current simulated day
  budget: 10000,                    // starting budget (₹)
  income: {
    recurring: [ { id, label, amount, cadence: "weekly"|"monthly", startDay } ],
    oneTime:   [ { id, label, amount, day, applied: bool } ]
  },
  transactions: [ { id, day, amount, category, note, ts, source: "manual"|"commitment"|"subscription"|"unexpected"|"loan" } ],
  commitments:  [ { id, label, amount, frequency: "weekly"|"monthly", nextDueDay, active } ],
  subscriptions:[ { id, name, amount, cycle: "monthly"|"annual", renewalDay, active } ],
  goals:        [ { id, label, target, targetDay, saved } ],
  unexpected:   [ { id, label, amount, day } ],
  debts:        [ { id, label, principal, apr, remaining, repayPerDay, takenDay } ],
  settings:     { reducedMotion: bool }
}

// Derived selectors (never stored):
spent, balance, remainingBudget, daysLeft, dailyAllowance, allowanceBuffer,
savingsRate, subscriptionMonthlyCost, subscriptionAnnualCost, commitmentLoad,
upcomingOutflow, riskScore, riskFactors[], healthScore, healthGrade, healthFactors[],
forecast { best, expected, worst }, goalProjections[], insights[]
```

## ADDED Requirements

### Requirement: Reactive Financial Model
The system SHALL maintain a single source-of-truth state object and compute all displayed metrics as pure derived selectors, recomputing every metric after any mutation.

#### Scenario: One change propagates everywhere
- **WHEN** the user commits any mutation (expense, income, subscription, goal, debt, day-advance)
- **THEN** the store notifies subscribers and balance, daily allowance, savings rate, goal ETAs, forecast, risk, and health are ALL recomputed from the new state in the same update cycle.

#### Scenario: No duplicated truth
- **WHEN** a metric such as `balance` is displayed in multiple places
- **THEN** every display reads the same derived selector so values can never disagree.

### Requirement: 30-Day Budget Engine
The system SHALL model a budget period of 30 days starting with ₹10,000 and track every transaction, commitment, subscription, debt, and unexpected expense against it.

#### Scenario: Fresh start
- **WHEN** the user opens the app for the first time
- **THEN** the system initializes Day 1 with `budget = ₹10,000`, `balance = ₹10,000`, `dailyAllowance = ₹10,000 / 30 ≈ ₹333.33`, `spent = ₹0`, `risk = Low`, `health = A+`.

#### Scenario: Mid-period reload
- **WHEN** the user reloads the page on Day 12
- **THEN** the system restores balance, transactions, days elapsed, and all derived metrics from `localStorage`.

### Requirement: Income Model
The system SHALL model income beyond the starting budget: recurring income (weekly/monthly, e.g., pocket money, stipend, part-time pay) and one-time income (e.g., freelance gig, gift), each with a day/cadence. Income increases balance and feeds savings rate and forecast.

#### Scenario: Recurring income arrives
- **WHEN** the simulated day reaches a recurring income's due day
- **THEN** balance increases by the amount, a transaction is logged, and savings rate, forecast, risk, and health recompute.

#### Scenario: One-time income
- **WHEN** the user receives a one-time ₹3,000 freelance payment on Day 10
- **THEN** balance increases once, the payment is marked applied, and daily allowance for remaining days recomputes upward.

### Requirement: Daily Allowance & Roll-Over
The system SHALL compute daily allowance as `remainingBudget / daysLeft` and manage roll-over: unspent allowance accumulates into an `allowanceBuffer`; overspending on a day reduces the allowance available to remaining days.

#### Scenario: Underspend rolls over
- **WHEN** the user spends ₹200 on a day whose allowance was ₹333.33
- **THEN** ₹133.33 is added to `allowanceBuffer` and tomorrow's allowance reflects the healthier remaining-budget / days-left ratio.

#### Scenario: Overspend tightens future days
- **WHEN** the user spends ₹900 on a ₹333.33-allowance day
- **THEN** remaining budget drops, daily allowance for remaining days recomputes lower, and risk increases.

### Requirement: Spending Tracker
The system SHALL let users log expenses with amount, category (Food, Transport, Shopping, Entertainment, Bills, Health, Misc), note, and timestamp on Day N.

#### Scenario: Log an expense
- **WHEN** the user submits an expense of ₹350 for "Food" on Day 5
- **THEN** balance decreases by ₹350, daily allowance recomputes (remaining budget / days left), spent total updates, and the burn-down chart reflects the new point.

### Requirement: Commitments (Recurring Bills)
The system SHALL allow users to define recurring commitments (rent, EMIs, utilities) with frequency (weekly / monthly) and next due date.

#### Scenario: Recurring bill hits
- **WHEN** the simulated day passes a commitment's due date
- **THEN** the system auto-debits the amount from balance and logs it in the transaction history with `source: "commitment"`.

### Requirement: Subscriptions Tracker
The system SHALL let users list active subscriptions (name, amount, billing cycle, renewal date) and show the annualized and monthly subscription cost.

#### Scenario: Add a subscription
- **WHEN** the user adds "Spotify ₹119/month"
- **THEN** monthly outflow includes ₹119, health score reduces slightly if subscriptions exceed a share-of-budget threshold, and forecast reflects the recurring drag.

#### Scenario: Cancel a subscription
- **WHEN** the user cancels a subscription
- **THEN** the recurring debit is removed from forecast and risk improves if it was straining the budget.

### Requirement: Debt / Loan Model
The system SHALL model loans with principal, APR, remaining balance, and a per-day repayment drag. Taking a loan increases balance now but adds a recurring repayment outflow, raises risk, and lowers health; repaying reduces remaining debt.

#### Scenario: Take a loan
- **WHEN** the user takes a ₹2,000 loan at 24% APR on Day 8
- **THEN** balance increases by ₹2,000, a debt record is created with a per-day repayment, forecast reflects the repayment drag, risk increases, and health drops.

#### Scenario: Loan fully repaid
- **WHEN** repayments reduce a debt's remaining balance to ₹0
- **THEN** the repayment drag stops and risk/health recover accordingly.

### Requirement: Savings Goals
The system SHALL let users define goals (target amount, target date) and display progress as a ring/bar with ETA projection based on current daily allowance and savings rate.

#### Scenario: Set a goal
- **WHEN** the user adds "Save ₹3,000 by Day 30"
- **THEN** progress shows current savings vs. ₹3,000, and the ETA classifies the goal as **reachable**, **at-risk**, or **unreachable** given current trajectory.

### Requirement: Unexpected Expenses
The system SHALL provide a one-click "unexpected expense" flow (e.g., medical, repair) with a suggested-impact preview before confirmation.

#### Scenario: Simulate an unexpected ₹2,000 hit
- **WHEN** the user previews an unexpected ₹2,000 expense on Day 14
- **THEN** the impact panel shows new balance, new daily allowance, revised savings ETA, revised health & risk — without committing until the user confirms.

### Requirement: Financial Risk Score
The system SHALL compute a Risk Score (0–100, higher = riskier) from normalized, weighted factors, each clamped to [0,1], and SHALL expose the per-factor contribution.

Reference model (weights sum to 1.0; tune during build):
- `burnRate` (0.30): actual spend pace vs. sustainable pace (`spent/daysElapsed` vs `budget/30`).
- `balanceRatio` (0.20): inverse of `balance / expectedBalanceForDay`.
- `subscriptionBurden` (0.15): monthly subscription cost as share of monthly disposable.
- `commitmentPressure` (0.15): upcoming commitment outflow vs. remaining balance.
- `debtLoad` (0.10): total remaining debt + repayment drag vs. remaining budget.
- `bufferShortfall` (0.10): lack of an emergency buffer for an unexpected hit.
`riskScore = round(100 * Σ(weightᵢ · factorᵢ))`, bands Green 0–33 / Amber 34–66 / Red 67–100.

#### Scenario: Risk recompute with breakdown
- **WHEN** any metric in the formula changes
- **THEN** the risk gauge animates to the new value with its color band AND the per-factor breakdown updates showing each factor's contribution.

### Requirement: Financial Health Score
The system SHALL compute a Health Score mapped to a letter grade (A+/A/B/C/D) from a weighted model, each factor normalized to [0,1], with a visible contributing-factor breakdown.

Reference model (weights sum to 1.0; tune during build):
- `savingsRate` (0.30): saved / income-to-date.
- `subscriptionDiscipline` (0.20): inverse of subscription burden.
- `commitmentCoverage` (0.20): ability to cover upcoming commitments from balance.
- `forecastSurplus` (0.20): projected end-of-period surplus vs. deficit.
- `goalProgress` (0.10): weighted progress across active goals vs. expected pace.
Grade bands: A+ ≥ 90, A ≥ 80, B ≥ 65, C ≥ 50, D < 50.

#### Scenario: Health updates after action
- **WHEN** the user commits any action
- **THEN** the health letter and contributing-factor breakdown refresh in real time.

### Requirement: Decision Simulator (What-If)
The system SHALL provide a "Simulate Decision" panel where the user picks an action (Add expense, Add subscription, Add income, Skip an expense, Cancel subscription, One-time income, Take a loan) and a value, and the system computes the *projected* future-state of all metrics on a cloned state WITHOUT mutating saved data until the user confirms.

#### Scenario: Simulate ₹1,499 subscription
- **WHEN** the user simulates adding a ₹1,499/month subscription on Day 10
- **THEN** the panel shows projected balance, daily allowance, risk, health, savings ETA, and 30-day forecast — clearly labelled "PROJECTED".

#### Scenario: Before → after delta view
- **WHEN** a simulation is active
- **THEN** each affected metric shows current value, projected value, and the signed delta with a direction indicator and color (e.g., balance −₹1,499, allowance −₹94/day, risk +12, health B→C, goal ETA +6 days).

#### Scenario: Do-nothing vs do-X comparison
- **WHEN** a simulation is active
- **THEN** the forecast chart overlays two 30-day trajectories: "if you do nothing" vs "if you do this", so the long-term consequence is visible.

#### Scenario: Decision verdict
- **WHEN** a simulation is computed
- **THEN** the system shows a verdict (Smart / Caution / Avoid) with a one-line, data-driven reason derived from the projected risk/health/forecast deltas.

#### Scenario: Confirm simulation
- **WHEN** the user confirms the simulated action
- **THEN** the system applies the mutation to real state, persists to `localStorage`, and animates the dashboard from the old to the new state.

#### Scenario: Reject simulation
- **WHEN** the user discards the simulation
- **THEN** no state change occurs and the cloned projection is dropped.

### Requirement: Insights / Coaching Engine
The system SHALL generate plain-language, data-driven insights and nudges from the current state, prioritized by severity, to help the user make informed decisions.

#### Scenario: Overspend nudge
- **WHEN** spend pace exceeds the sustainable pace by a threshold
- **THEN** an insight appears, e.g., "You're spending ~38% faster than sustainable — at this rate you run out by Day 24."

#### Scenario: Subscription savings insight
- **WHEN** an active subscription is a meaningful share of disposable budget
- **THEN** an insight quantifies the opportunity, e.g., "Canceling this saves ₹1,428/year and moves your goal from at-risk to on-track."

### Requirement: Monthly Forecast (Scenario-Based)
The system SHALL project end-of-period balance using current spend rate, recurring commitments, subscriptions, debt repayments, and expected income, producing **best / expected / worst** case outcomes.

#### Scenario: Forecast runs on change
- **WHEN** any input changes
- **THEN** the forecast card updates projected end balance, projected savings rate, and projected surplus/deficit for all three cases.

### Requirement: Edge-Case Behavior
The system SHALL define deterministic behavior for boundary conditions.

#### Scenario: Balance hits zero or below
- **WHEN** a committed action would drive balance to ≤ ₹0
- **THEN** the action is allowed but balance is shown as negative/overdrawn, risk jumps toward Red, and a critical insight warns the user (the simulator surfaces this before confirm).

#### Scenario: Unreachable goal
- **WHEN** a goal cannot be met by its target day on the current trajectory
- **THEN** it is marked "unreachable" with the shortfall amount and the extra daily saving required.

#### Scenario: End of period
- **WHEN** the user advances past Day 30
- **THEN** the app shows a 30-day summary (ending balance, total saved, goals met, final health grade) and offers reset or continue.

### Requirement: Persistence & Reset
The system SHALL persist all state in `localStorage` under a versioned key and provide a "Reset 30-day journey" action and a one-click demo scenario.

#### Scenario: Reset
- **WHEN** the user resets
- **THEN** state returns to Day 1, ₹10,000 budget, empty transactions, after a confirmation modal.

#### Scenario: Load demo
- **WHEN** the user clicks "Load demo"
- **THEN** state is seeded to a realistic mid-month (≈ Day 15) with sample income, spending, commitments, subscriptions, a goal, and a debt, so the interconnected dashboard is immediately populated.

### Requirement: UI Shell & Aesthetic
The system SHALL render a modern, mobile-first, Gen-Z-styled single-page app with: hero balance card, daily-allowance meter, risk gauge, health card with letter grade, insights feed, transactions list, commitments list, subscriptions list, goals list, debts list, what-if panel, forecast chart, spending heatmap.

#### Scenario: Visual coherence
- **WHEN** any page loads
- **THEN** typography, color tokens, spacing, and motion are consistent across all components (no plain HTML-look).

### Requirement: Non-Functional Requirements
The system SHALL meet baseline quality bars.

#### Scenario: Accessibility
- **WHEN** a user navigates by keyboard or screen reader
- **THEN** all interactive controls have visible focus states, accessible labels/roles, and color contrast meets WCAG AA.

#### Scenario: Reduced motion
- **WHEN** the OS or app setting requests reduced motion (`prefers-reduced-motion`)
- **THEN** number tweening and non-essential animations are disabled or minimized.

#### Scenario: Performance & portability
- **WHEN** the app runs on a modern mobile or desktop browser
- **THEN** interactions remain responsive (<100ms on commit) and the app works offline from `localStorage` with no backend.

## MODIFIED Requirements
None (greenfield).

## REMOVED Requirements
None.
