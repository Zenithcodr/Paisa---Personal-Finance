import { selectDerived } from "./selectors.js";
import { PERIOD_DAYS } from "./constants.js";

export function categorySpending(state) {
  const map = {};
  for (const t of state.transactions) {
    if (t.amount <= 0 || t.category === "Savings") continue;
    map[t.category] = (map[t.category] || 0) + t.amount;
  }
  return map;
}

export function dailySpend(state) {
  const arr = new Array(30).fill(0);
  for (const t of state.transactions) {
    if (t.amount <= 0 || t.category === "Savings") continue;
    if (t.day >= 1 && t.day <= 30) arr[t.day - 1] += t.amount;
  }
  return arr;
}

export function buildCategoryLegend(map) {
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

// True historical per-day balance from the actual transaction log.
// Returns length-(PERIOD_DAYS + 1) array. arr[0] = state.budget (Day 0),
// arr[d] for 1..state.day reflects running balance after applying transactions on day d
// (income is encoded as negative amounts, so `arr[d] = arr[d-1] - t.amount`).
// Days after `state.day` are left at 0; callers should overlay projections there.
export function historicalBalance(state) {
  const arr = new Array(PERIOD_DAYS + 1).fill(0);
  const touched = new Array(PERIOD_DAYS + 1).fill(false);
  arr[0] = state.budget;
  touched[0] = true;
  const sorted = state.transactions.slice().sort((a, b) =>
    a.day !== b.day ? a.day - b.day : (a.ts || 0) - (b.ts || 0)
  );
  let bal = state.budget;
  for (const t of sorted) {
    if (t.day < 1 || t.day > state.day) continue;
    bal -= t.amount;
    arr[t.day] = bal;
    touched[t.day] = true;
  }
  // Carry-forward: any day in 1..state.day with no transactions keeps the
  // most recent closing balance. This produces the true day-by-day line.
  let lastBal = state.budget;
  for (let d = 1; d <= state.day; d++) {
    if (!touched[d]) arr[d] = lastBal;
    else lastBal = arr[d];
  }
  return arr;
}

// Three scenario trajectories (best / expected / worst) for the forecast chart.
// All three share the same shape as `expectedTrajectory` but vary the per-day
// daily-net drift to express upside vs downside variance.
export function forecastBands(state) {
  // We label the upper (less-negative, or more-positive) trajectory "best" and
  // the lower one "worst". In buildLineWithDrift(state, drift):
  //   bal += dailyNet * (1 + drift)
  // - For overspending (dailyNet < 0): a negative drift dampens the drop
  //   (higher line = best); a positive drift deepens it (lower line = worst).
  // - For net-saving (dailyNet > 0): a positive drift amplifies the climb
  //   (higher line = best); a negative drift flattens it (lower line = worst).
  // So in both regimes, bestLine uses drift = sign(dailyNet) * 0.2.
  const probe = buildLineWithDrift(state, 0);
  const lastDelta = probe[probe.length - 1] - probe[state.day];
  const sign = lastDelta >= 0 ? 1 : -1;
  return {
    expectedLine: expectedTrajectory(state),
    bestLine: buildLineWithDrift(state, sign * 0.2),
    worstLine: buildLineWithDrift(state, -sign * 0.2)
  };
}

function buildLineWithDrift(state, drift) {
  const arr = new Array(PERIOD_DAYS + 1).fill(0);
  const startBalance = state.budget
    + state.transactions.filter(t => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0)
    - state.transactions.filter(t => t.amount > 0 && t.category !== "Savings").reduce((a, t) => a + t.amount, 0);
  arr[state.day] = startBalance;
  const sim = structuredClone(state);
  const d = selectDerived(sim);
  const dailyNet = (d.dailyAllowance - d.expectedSpendPerDay);
  let bal = startBalance;
  for (let i = state.day + 1; i <= PERIOD_DAYS; i++) {
    bal += dailyNet * (1 + drift);
    arr[i] = bal;
  }
  for (let i = 1; i < state.day; i++) arr[i] = state.budget - (state.budget - startBalance) * (i / state.day);
  if (state.day === 1) arr[1] = startBalance;
  return arr;
}

// Deterministic trajectory for the "if you do nothing" chart
export function expectedTrajectory(state) {
  // Mirror selector.buildTrajectory by triggering a derive on each day.
  const arr = new Array(PERIOD_DAYS + 1).fill(0);
  const sim = structuredClone(state);
  const startBalance = sim.budget
    + sim.transactions.filter(t => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0)
    - sim.transactions.filter(t => t.amount > 0 && t.category !== "Savings").reduce((a, t) => a + t.amount, 0);
  arr[sim.day] = startBalance;
  const d = selectDerived(sim);
  const dailyNet = (d.dailyAllowance - d.expectedSpendPerDay); // net change per future day
  let bal = startBalance;
  for (let i = sim.day + 1; i <= PERIOD_DAYS; i++) {
    bal += dailyNet;
    arr[i] = bal;
  }
  for (let i = 1; i < sim.day; i++) arr[i] = sim.budget - (sim.budget - startBalance) * (i / sim.day);
  if (sim.day === 1) arr[1] = startBalance;
  return arr;
}
