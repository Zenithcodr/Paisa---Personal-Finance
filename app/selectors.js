import { BUDGET, PERIOD_DAYS, clamp, safeDiv } from "./constants.js";

// Daily pace used for buffer computation (sustainable allowance). Mirrors the spec's
// "remaining budget / days left" model initialized at Day 1 with budget/30.
const SUSTAINABLE_PACE = safeDiv(BUDGET, PERIOD_DAYS);

export function selectDerived(state) {
  const day = state.day;
  const daysLeft = PERIOD_DAYS - day + 1; // today counts toward the period
  const tx = state.transactions;

  // Income (positive => money in). We encode income as negative amounts in transactions.
  const incomeSoFar = tx.filter(t => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0);
  const spent = tx.filter(t => t.amount > 0 && t.category !== "Savings").reduce((a, t) => a + t.amount, 0);
  const saved = tx.filter(t => t.amount > 0 && t.category === "Savings").reduce((a, t) => a + t.amount, 0);

  // Balance from transactions (canonical truth of "where the money went") + starting budget
  const balance = state.budget + incomeSoFar - spent;
  const remainingBudget = balance; // "cash you still have" = balance

  // Allowance: how much per remaining day to keep pace
  const dailyAllowance = daysLeft > 0 ? Math.max(0, balance / daysLeft) : 0;

  // Sustainable spend so far: budget / days_elapsed; actual spend per day
  const sustainableSoFar = safeDiv(BUDGET, PERIOD_DAYS) * (day);
  const overspendFactor = clamp(safeDiv(spent - sustainableSoFar, BUDGET * 0.5), 0, 1);

  // Subscription burden
  const subMonthly = state.subscriptions.filter(s => s.active).reduce((a, s) => a + s.amount, 0);
  const subAnnual = state.subscriptions.filter(s => s.active).reduce((a, s) => a + (s.cycle === "annual" ? s.amount : s.amount * 12), 0);
  const disposable = Math.max(1, BUDGET);
  const subBurden = clamp(safeDiv(subMonthly, disposable * 0.5), 0, 1); // >50% would saturate

  // Upcoming commitment outflow over remaining days
  const upcomingOutflow = state.commitments
    .filter(c => c.active && c.nextDueDay >= day && c.nextDueDay <= day + 7)
    .reduce((a, c) => a + c.amount, 0);
  const commitmentPressure = clamp(safeDiv(upcomingOutflow, Math.max(1, balance)), 0, 1);

  // Debt
  const totalDebt = state.debts.reduce((a, d) => a + d.remaining, 0);
  const dailyRepay = state.debts.reduce((a, d) => a + d.repayPerDay, 0);
  const debtLoad = clamp(safeDiv(totalDebt + dailyRepay * 7, Math.max(1, balance + BUDGET)), 0, 1);

  // Buffer shortfall: ideal buffer = 10% of budget
  const bufferShortfall = clamp(safeDiv(Math.max(0, 1000 - balance), 1000), 0, 1);

  // Savings rate
  const savingsRate = clamp(safeDiv(saved, Math.max(1, incomeSoFar + state.budget)), 0, 1);

  // Subs discipline
  const subscriptionDiscipline = 1 - subBurden;

  // Commitment coverage: can balance cover next commitments?
  const commitmentCoverage = 1 - commitmentPressure;

  // Forecast surplus (rough)
  const expectedSpendPerDay = day > 1 ? safeDiv(spent, day) : safeDiv(BUDGET, PERIOD_DAYS);
  const projectedSpend = expectedSpendPerDay * PERIOD_DAYS;
  const projectedIncome = incomeSoFar + expectedFutureIncome(state, day);
  const projectedEnd = state.budget + projectedIncome - projectedSpend;
  const forecastSurplus = clamp(safeDiv(projectedEnd, BUDGET), 0, 1);

  // Goals
  const goalProjections = state.goals.map(g => {
    const remaining = Math.max(0, g.target - g.saved);
    const daysLeftForGoal = Math.max(1, g.targetDay - day);
  const requiredPerDay = safeDiv(remaining, Math.max(1, Math.min(daysLeftForGoal, 30)));
    const perDay = Math.max(0, dailyAllowance - expectedSpendPerDay) + safeDiv(saved, Math.max(1, day));
    const reachable = remaining === 0 ? true : perDay >= requiredPerDay * 0.95;
    let status = "reachable";
    if (remaining === 0) status = "done";
    else if (!reachable && perDay >= requiredPerDay * 0.6) status = "at-risk";
    else if (perDay < requiredPerDay * 0.6) status = "unreachable";
    return { id: g.id, label: g.label, target: g.target, saved: g.saved, remaining, requiredPerDay, perDay, status };
  });
  const goalProgress = state.goals.length === 0 ? 0.8 :
    state.goals.reduce((a, g) => a + clamp(g.saved / g.target, 0, 1), 0) / state.goals.length;

  // Risk score 0-100
  const weights = { burnRate: 0.30, balance: 0.20, sub: 0.15, commit: 0.15, debt: 0.10, buffer: 0.10 };
  const expectedBalanceForDay = state.budget * (1 - day / PERIOD_DAYS);
  const balanceRatio = clamp(1 - safeDiv(Math.max(0, balance), Math.max(1, expectedBalanceForDay + BUDGET * 0.2)), 0, 1);

  // Burn-rate as a factor: how much over sustainable pace
  const burnRateFactor = clamp(safeDiv(expectedSpendPerDay, safeDiv(BUDGET, PERIOD_DAYS)) - 1, 0, 1);

  const riskScore = Math.round(100 * (
    weights.burnRate * burnRateFactor +
    weights.balance * balanceRatio +
    weights.sub * subBurden +
    weights.commit * commitmentPressure +
    weights.debt * debtLoad +
    weights.buffer * bufferShortfall
  ));
  const riskBand = riskScore >= 67 ? "high" : riskScore >= 34 ? "medium" : "low";

  const riskFactors = [
    { name: "Burn rate", value: burnRateFactor, weight: weights.burnRate, contribution: weights.burnRate * burnRateFactor * 100 },
    { name: "Balance vs expected", value: balanceRatio, weight: weights.balance, contribution: weights.balance * balanceRatio * 100 },
    { name: "Subscription burden", value: subBurden, weight: weights.sub, contribution: weights.sub * subBurden * 100 },
    { name: "Commitment pressure", value: commitmentPressure, weight: weights.commit, contribution: weights.commit * commitmentPressure * 100 },
    { name: "Debt load", value: debtLoad, weight: weights.debt, contribution: weights.debt * debtLoad * 100 },
    { name: "Buffer shortfall", value: bufferShortfall, weight: weights.buffer, contribution: weights.buffer * bufferShortfall * 100 }
  ];

  // Health 0-100
  const hWeights = { savings: 0.30, sub: 0.20, commit: 0.20, forecast: 0.20, goals: 0.10 };
  const savingsScore = state.day === 1 && state.income.recurring.length === 0 && state.income.oneTime.length === 0
    ? 1 : (0.4 + 0.6 * savingsRate); // fresh state gets full credit; later days blend neutral + actual
  const goalsScore = state.goals.length === 0 ? 1 : (0.5 + 0.5 * goalProgress);
  // For fresh state, forecast surplus isn't meaningful yet
  const isNeutralForecast = state.day === 1 && state.income.recurring.length === 0 && state.commitments.length === 0 && state.subscriptions.length === 0;
  const forecastScore = isNeutralForecast ? 1 : forecastSurplus;
  const healthScoreRaw = 100 * (
    hWeights.savings * savingsScore +
    hWeights.sub * subscriptionDiscipline +
    hWeights.commit * commitmentCoverage +
    hWeights.forecast * forecastScore +
    hWeights.goals * goalsScore
  );
  // Penalize debt load and risk a bit
  const healthScore = Math.max(0, Math.min(100, Math.round(healthScoreRaw - (debtLoad * 15) - (riskScore > 66 ? 10 : 0))));
  const grade = healthScore >= 90 ? "A+" : healthScore >= 80 ? "A" : healthScore >= 65 ? "B" : healthScore >= 50 ? "C" : "D";

  const healthFactors = [
    { name: "Savings rate", value: savingsRate, weight: hWeights.savings },
    { name: "Subscription discipline", value: subscriptionDiscipline, weight: hWeights.sub },
    { name: "Commitment coverage", value: commitmentCoverage, weight: hWeights.commit },
    { name: "Forecast surplus", value: forecastSurplus, weight: hWeights.forecast },
    { name: "Goal progress", value: goalProgress, weight: hWeights.goals }
  ];

  // Forecast scenarios (best / expected / worst) at end of period
  const daysRemaining = PERIOD_DAYS - day;
  const recRemainingIncome = expectedFutureIncome(state, day);
  const recRemainingCommit = state.commitments.filter(c => c.active && c.nextDueDay >= day).reduce((a, c) => {
    return a + (c.frequency === "weekly" ? Math.ceil(daysRemaining / 7) * c.amount : (c.nextDueDay <= PERIOD_DAYS ? c.amount : 0));
  }, 0);
  const recRemainingSub = state.subscriptions.filter(s => s.active).reduce((a, s) => {
    return a + Math.max(0, Math.floor((PERIOD_DAYS - day) / 30) * s.amount);
  }, 0);
  const recRemainingDebtRepay = state.debts.reduce((a, d) => a + Math.min(d.remaining, d.repayPerDay * daysRemaining), 0);

  const expectedEnd = balance + recRemainingIncome - recRemainingCommit - recRemainingSub - recRemainingDebtRepay
    - (expectedSpendPerDay * daysRemaining);
  const bestEnd = expectedEnd + (daysRemaining * Math.max(0, (expectedSpendPerDay * 0.4)));
  const worstEnd = expectedEnd - (daysRemaining * Math.max(0, expectedSpendPerDay * 0.6)) - Math.max(0, -balance);

  // Allowance buffer: retroactively derived from past days. We compare spend
  // on each past day against the sustainable pace and accumulate the positive
  // (underspend) deltas. Overspend days do not contribute to the cushion, so
  // a single bad day cannot pocket a previous underday's savings.
  let _buffer = 0;
  if (day > 1) {
    const _spendByDay = new Array(PERIOD_DAYS + 1).fill(0);
    for (const t of state.transactions) {
      if (t.amount > 0 && t.category !== "Savings" && t.day >= 1 && t.day <= day - 1) {
        _spendByDay[t.day] += t.amount;
      }
    }
    for (let d = 1; d < day; d++) {
      const _cushion = Math.max(0, SUSTAINABLE_PACE - _spendByDay[d]);
      _buffer += _cushion;
    }
  }
  const allowanceBuffer = Math.round(_buffer);

  return {
    day, daysLeft, balance, remainingBudget, dailyAllowance,
    spent, incomeSoFar, saved,
    expectedSpendPerDay,
    sustainableSoFar,
    subMonthly, subAnnual,
    upcomingOutflow,
    totalDebt, dailyRepay,
    savingsRate,
    subscriptionDiscipline,
    commitmentCoverage,
    forecastSurplus,
    allowanceBuffer,
    goalProgress,
    goalProjections,
    riskScore, riskBand, riskFactors,
    healthScore, grade, healthFactors,
    forecast: { best: Math.round(bestEnd), expected: Math.round(expectedEnd), worst: Math.round(worstEnd) }
  };
}

function expectedFutureIncome(state, day) {
  let total = 0;
  const daysRemaining = PERIOD_DAYS - day;
  for (const r of state.income.recurring) {
    if (r.startDay > PERIOD_DAYS) continue;
    const period = r.cadence === "weekly" ? 7 : 30;
    let hits = 0;
    for (let n = Math.max(day + 1, r.startDay); n <= PERIOD_DAYS; n += period) hits++;
    total += hits * r.amount;
  }
  for (const o of state.income.oneTime) {
    if (o.applied) continue;
    if (o.day > day && o.day <= PERIOD_DAYS) total += o.amount;
  }
  return total;
}

// Project state by applying a mutator, then return derived metrics
export function projectDerived(state, mutator) {
  const clone = structuredClone(state);
  mutator(clone);
  return selectDerived(clone);
}

// Project an entire simulated trajectory over 30 days given a base state and a synthetic action
export function projectTrajectory(state, mutator) {
  const baseState = state;
  const projected = structuredClone(state);
  mutator(projected);
  // Build best/expected/worst lines as balance over 30 days
  const currentLine = buildTrajectory(baseState, "expected");
  const projectedLine = buildTrajectory(projected, "expected");
  return { currentLine, projectedLine };
}

function buildTrajectory(state, mode) {
  const periodDays = PERIOD_DAYS;
  const out = new Array(periodDays + 1).fill(0);
  // Use simulated day-rollover until day 30 then continue projecting
  const sim = structuredClone(state);
  // Build a list of daily balances by stepping through period
  const startBalance = sim.budget + sim.transactions.filter(t => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0)
    - sim.transactions.filter(t => t.amount > 0 && t.category !== "Savings").reduce((a, t) => a + t.amount, 0);

  // For trajectory we estimate based on remaining dynamics
  let balance = startBalance;
  out[sim.day] = balance;
  // Estimate daily net: average of (income/commit/sub/debt/spend) per remaining day
  const daysLeft = periodDays - sim.day;
  const incomeFuture = expectedFutureIncome(sim, sim.day);
  const commitFuture = sim.commitments.filter(c => c.active && c.nextDueDay >= sim.day).reduce((a, c) => {
    return a + (c.frequency === "weekly" ? Math.ceil(daysLeft / 7) * c.amount : (c.nextDueDay <= periodDays ? c.amount : 0));
  }, 0);
  const subFuture = sim.subscriptions.filter(s => s.active).reduce((a, s) => a + Math.max(0, Math.floor(daysLeft / 30) * s.amount), 0);
  const debtFuture = sim.debts.reduce((a, d) => a + Math.min(d.remaining, d.repayPerDay * daysLeft), 0);
  const spentSoFar = sim.transactions.filter(t => t.amount > 0 && t.category !== "Savings").reduce((a, t) => a + t.amount, 0);
  const avgSpendPerDay = sim.day > 1 ? spentSoFar / sim.day : sim.budget / periodDays;
  const dailyNet = (incomeFuture + 0 - commitFuture - subFuture - debtFuture) / Math.max(1, daysLeft) - avgSpendPerDay;

  for (let d = sim.day + 1; d <= periodDays; d++) {
    const noise = mode === "best" ? -0.2 : mode === "worst" ? 0.2 : 0;
    balance += dailyNet * (1 + noise);
    out[d] = balance;
  }
  // Fill pre-sim day linearly from budget to startBalance
  for (let d = 1; d < sim.day; d++) out[d] = sim.budget - (sim.budget - startBalance) * (d / sim.day);
  if (sim.day === 1) out[1] = startBalance;
  return out;
}
