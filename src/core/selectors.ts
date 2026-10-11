import { BUDGET, PERIOD_DAYS, clamp, safeDiv } from "./constants";
import type { AppState } from "../types/state";
import type { DerivedMetrics, GoalProjection, RiskFactor, HealthFactor } from "../types/metrics";

const SUSTAINABLE_PACE = safeDiv(BUDGET, PERIOD_DAYS);

export function selectDerived(state: AppState): DerivedMetrics {
  const day = state.day;
  const daysLeft = PERIOD_DAYS - day + 1; // today counts toward the period
  const tx = state.transactions;

  // Income (positive => money in). Encoded as negative amounts in transactions.
  const incomeSoFar = tx.filter((t) => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0);
  const spent = tx
    .filter((t) => t.amount > 0 && t.category !== "Savings")
    .reduce((a, t) => a + t.amount, 0);
  const saved = tx
    .filter((t) => t.amount > 0 && t.category === "Savings")
    .reduce((a, t) => a + t.amount, 0);

  // Balance from transactions + starting budget
  const balance = state.budget + incomeSoFar - spent;
  const remainingBudget = balance;

  // Allowance: how much per remaining day to keep pace
  const dailyAllowance = daysLeft > 0 ? Math.max(0, balance / daysLeft) : 0;

  // Sustainable spend so far: budget / days_elapsed; actual spend per day
  const sustainableSoFar = safeDiv(BUDGET, PERIOD_DAYS) * day;

  // Subscription burden
  const subMonthly = state.subscriptions.filter((s) => s.active).reduce((a, s) => a + s.amount, 0);
  const subAnnual = state.subscriptions
    .filter((s) => s.active)
    .reduce((a, s) => a + (s.cycle === "annual" ? s.amount : s.amount * 12), 0);
  const disposable = Math.max(1, BUDGET);
  const subBurden = clamp(safeDiv(subMonthly, disposable * 0.5), 0, 1);

  // Upcoming commitment outflow over remaining days
  const upcomingOutflow = state.commitments
    .filter((c) => c.active && c.nextDueDay >= day && c.nextDueDay <= day + 7)
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

  // Forecast surplus
  const expectedSpendPerDay = day > 1 ? safeDiv(spent, day) : safeDiv(BUDGET, PERIOD_DAYS);
  const projectedSpend = expectedSpendPerDay * PERIOD_DAYS;
  const projectedIncome = incomeSoFar + expectedFutureIncome(state, day);
  const projectedEnd = state.budget + projectedIncome - projectedSpend;
  const forecastSurplus = clamp(safeDiv(projectedEnd, BUDGET), 0, 1);

  // Goals
  const goalProjections: GoalProjection[] = state.goals.map((g) => {
    const remaining = Math.max(0, g.target - g.saved);
    const daysLeftForGoal = Math.max(1, g.targetDay - day);
    const requiredPerDay = safeDiv(remaining, Math.max(1, Math.min(daysLeftForGoal, 30)));
    const perDay =
      Math.max(0, dailyAllowance - expectedSpendPerDay) + safeDiv(saved, Math.max(1, day));
    const reachable = remaining === 0 ? true : perDay >= requiredPerDay * 0.95;
    let status: GoalProjection["status"] = "reachable";
    if (remaining === 0) status = "done";
    else if (!reachable && perDay >= requiredPerDay * 0.6) status = "at-risk";
    else if (perDay < requiredPerDay * 0.6) status = "unreachable";
    return {
      id: g.id,
      label: g.label,
      target: g.target,
      saved: g.saved,
      remaining,
      requiredPerDay,
      perDay,
      status
    };
  });

  const goalProgress =
    state.goals.length === 0
      ? 0.8
      : state.goals.reduce((a, g) => a + clamp(g.saved / g.target, 0, 1), 0) / state.goals.length;

  // Risk score 0-100
  const weights = {
    burnRate: 0.3,
    balance: 0.2,
    sub: 0.15,
    commit: 0.15,
    debt: 0.1,
    buffer: 0.1
  };
  const expectedBalanceForDay = state.budget * (1 - day / PERIOD_DAYS);
  const balanceRatio = clamp(
    1 - safeDiv(Math.max(0, balance), Math.max(1, expectedBalanceForDay + BUDGET * 0.2)),
    0,
    1
  );

  const burnRateFactor = clamp(
    safeDiv(expectedSpendPerDay, safeDiv(BUDGET, PERIOD_DAYS)) - 1,
    0,
    1
  );

  const riskScore = Math.round(
    100 *
      (weights.burnRate * burnRateFactor +
        weights.balance * balanceRatio +
        weights.sub * subBurden +
        weights.commit * commitmentPressure +
        weights.debt * debtLoad +
        weights.buffer * bufferShortfall)
  );
  const riskBand: DerivedMetrics["riskBand"] =
    riskScore >= 67 ? "high" : riskScore >= 34 ? "medium" : "low";

  const riskFactors: RiskFactor[] = [
    {
      name: "Burn rate",
      value: burnRateFactor,
      weight: weights.burnRate,
      contribution: weights.burnRate * burnRateFactor * 100
    },
    {
      name: "Balance vs expected",
      value: balanceRatio,
      weight: weights.balance,
      contribution: weights.balance * balanceRatio * 100
    },
    {
      name: "Subscription burden",
      value: subBurden,
      weight: weights.sub,
      contribution: weights.sub * subBurden * 100
    },
    {
      name: "Commitment pressure",
      value: commitmentPressure,
      weight: weights.commit,
      contribution: weights.commit * commitmentPressure * 100
    },
    {
      name: "Debt load",
      value: debtLoad,
      weight: weights.debt,
      contribution: weights.debt * debtLoad * 100
    },
    {
      name: "Buffer shortfall",
      value: bufferShortfall,
      weight: weights.buffer,
      contribution: weights.buffer * bufferShortfall * 100
    }
  ];

  // Health 0-100
  const hWeights = { savings: 0.3, sub: 0.2, commit: 0.2, forecast: 0.2, goals: 0.1 };
  const savingsScore =
    state.day === 1 && state.income.recurring.length === 0 && state.income.oneTime.length === 0
      ? 1
      : 0.4 + 0.6 * savingsRate;
  const goalsScore = state.goals.length === 0 ? 1 : 0.5 + 0.5 * goalProgress;
  const isNeutralForecast =
    state.day === 1 &&
    state.income.recurring.length === 0 &&
    state.commitments.length === 0 &&
    state.subscriptions.length === 0;
  const forecastScore = isNeutralForecast ? 1 : forecastSurplus;
  const healthScoreRaw =
    100 *
    (hWeights.savings * savingsScore +
      hWeights.sub * subscriptionDiscipline +
      hWeights.commit * commitmentCoverage +
      hWeights.forecast * forecastScore +
      hWeights.goals * goalsScore);

  const healthScore = Math.max(
    0,
    Math.min(100, Math.round(healthScoreRaw - debtLoad * 15 - (riskScore > 66 ? 10 : 0)))
  );
  const grade: DerivedMetrics["grade"] =
    healthScore >= 90
      ? "A+"
      : healthScore >= 80
        ? "A"
        : healthScore >= 65
          ? "B"
          : healthScore >= 50
            ? "C"
            : "D";

  const healthFactors: HealthFactor[] = [
    { name: "Savings rate", value: savingsRate, weight: hWeights.savings },
    { name: "Subscription discipline", value: subscriptionDiscipline, weight: hWeights.sub },
    { name: "Commitment coverage", value: commitmentCoverage, weight: hWeights.commit },
    { name: "Forecast surplus", value: forecastSurplus, weight: hWeights.forecast },
    { name: "Goal progress", value: goalProgress, weight: hWeights.goals }
  ];

  // Forecast scenarios (best / expected / worst) at end of period
  const daysRemaining = PERIOD_DAYS - day;
  const recRemainingIncome = expectedFutureIncome(state, day);
  const recRemainingCommit = state.commitments
    .filter((c) => c.active && c.nextDueDay >= day)
    .reduce((a, c) => {
      return (
        a +
        (c.frequency === "weekly"
          ? Math.ceil(daysRemaining / 7) * c.amount
          : c.nextDueDay <= PERIOD_DAYS
            ? c.amount
            : 0)
      );
    }, 0);
  const recRemainingSub = state.subscriptions
    .filter((s) => s.active)
    .reduce((a, s) => {
      return a + Math.max(0, Math.floor((PERIOD_DAYS - day) / 30) * s.amount);
    }, 0);
  const recRemainingDebtRepay = state.debts.reduce(
    (a, d) => a + Math.min(d.remaining, d.repayPerDay * daysRemaining),
    0
  );

  const expectedEnd =
    balance +
    recRemainingIncome -
    recRemainingCommit -
    recRemainingSub -
    recRemainingDebtRepay -
    expectedSpendPerDay * daysRemaining;
  const bestEnd = expectedEnd + daysRemaining * Math.max(0, expectedSpendPerDay * 0.4);
  const worstEnd =
    expectedEnd - daysRemaining * Math.max(0, expectedSpendPerDay * 0.6) - Math.max(0, -balance);

  // Allowance buffer: retroactively derived from past days
  let bufferAcc = 0;
  if (day > 1) {
    const spendByDay = new Array<number>(PERIOD_DAYS + 1).fill(0);
    for (const t of state.transactions) {
      if (t.amount > 0 && t.category !== "Savings" && t.day >= 1 && t.day <= day - 1) {
        const cur = spendByDay[t.day] ?? 0;
        spendByDay[t.day] = cur + t.amount;
      }
    }
    for (let d = 1; d < day; d++) {
      const daySpend = spendByDay[d] ?? 0;
      const cushion = Math.max(0, SUSTAINABLE_PACE - daySpend);
      bufferAcc += cushion;
    }
  }
  const allowanceBuffer = Math.round(bufferAcc);

  return {
    day,
    daysLeft,
    balance,
    remainingBudget,
    dailyAllowance,
    spent,
    incomeSoFar,
    saved,
    expectedSpendPerDay,
    sustainableSoFar,
    subMonthly,
    subAnnual,
    upcomingOutflow,
    totalDebt,
    dailyRepay,
    savingsRate,
    subscriptionDiscipline,
    commitmentCoverage,
    forecastSurplus,
    allowanceBuffer,
    goalProgress,
    goalProjections,
    riskScore,
    riskBand,
    riskFactors,
    healthScore,
    grade,
    healthFactors,
    forecast: {
      best: Math.round(bestEnd),
      expected: Math.round(expectedEnd),
      worst: Math.round(worstEnd)
    }
  };
}

export function expectedFutureIncome(state: AppState, day: number): number {
  let total = 0;
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
