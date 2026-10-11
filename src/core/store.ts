import { loadState, saveState } from "./storage";
import { uid } from "./constants";
import type { AppState, Category } from "../types/state";

type Subscriber = (state: AppState) => void;

const subs = new Set<Subscriber>();
let state: AppState;

export function getState(): AppState {
  return state;
}

export function setState(next: AppState): void {
  state = next;
  saveState(state);
  for (const fn of subs) {
    try {
      fn(state);
    } catch (e) {
      console.error(e);
    }
  }
}

export function init(initial?: AppState): void {
  state = initial ?? loadState();
}

export function subscribe(fn: Subscriber): () => void {
  subs.add(fn);
  fn(state);
  return () => subs.delete(fn);
}

// ----------------------------- ACTIONS -----------------------------

export function resetJourney(makeInitial: () => AppState): void {
  setState(makeInitial());
}

export function loadDemo(makeDemo: () => AppState): void {
  setState(makeDemo());
}

export function addExpense(params: {
  day: number;
  amount: number;
  category: Category;
  note?: string;
}): void {
  const s = structuredClone(state);
  s.transactions.push({
    id: uid(),
    day: params.day,
    amount: params.amount,
    category: params.category,
    note: params.note || "",
    ts: Date.now(),
    source: "manual"
  });
  setState(s);
}

export function addIncomeOneTime(params: { day: number; amount: number; label?: string }): void {
  const s = structuredClone(state);
  const id = uid();
  const label = params.label || "One-time income";
  s.income.oneTime.push({
    id,
    label,
    amount: params.amount,
    day: params.day,
    applied: true
  });
  s.transactions.push({
    id: uid(),
    day: params.day,
    amount: -params.amount,
    category: "Income",
    note: label,
    ts: Date.now(),
    source: "income"
  });
  setState(s);
}

export function addRecurringIncome(params: {
  label: string;
  amount: number;
  cadence: "monthly" | "weekly";
  startDay: number;
}): void {
  const s = structuredClone(state);
  s.income.recurring.push({
    id: uid(),
    label: params.label,
    amount: params.amount,
    cadence: params.cadence,
    startDay: Number(params.startDay)
  });
  setState(s);
}

export function removeRecurringIncome(id: string): void {
  const s = structuredClone(state);
  s.income.recurring = s.income.recurring.filter((r) => r.id !== id);
  setState(s);
}

export function addCommitment(params: {
  label: string;
  amount: number;
  frequency: "monthly" | "weekly";
  nextDueDay: number;
}): void {
  const s = structuredClone(state);
  s.commitments.push({
    id: uid(),
    label: params.label,
    amount: Number(params.amount),
    frequency: params.frequency,
    nextDueDay: Number(params.nextDueDay),
    active: true
  });
  setState(s);
}

export function removeCommitment(id: string): void {
  const s = structuredClone(state);
  s.commitments = s.commitments.filter((c) => c.id !== id);
  setState(s);
}

export function addSubscription(params: {
  name: string;
  amount: number;
  cycle: "monthly" | "annual";
  renewalDay: number;
}): void {
  const s = structuredClone(state);
  s.subscriptions.push({
    id: uid(),
    name: params.name,
    amount: Number(params.amount),
    cycle: params.cycle,
    renewalDay: Number(params.renewalDay),
    active: true
  });
  setState(s);
}

export function toggleSubscription(id: string, active: boolean): void {
  const s = structuredClone(state);
  const sub = s.subscriptions.find((x) => x.id === id);
  if (sub) sub.active = active;
  setState(s);
}

export function removeSubscription(id: string): void {
  const s = structuredClone(state);
  s.subscriptions = s.subscriptions.filter((x) => x.id !== id);
  setState(s);
}

export function addGoal(params: { label: string; target: number; targetDay: number }): void {
  const s = structuredClone(state);
  s.goals.push({
    id: uid(),
    label: params.label,
    target: Number(params.target),
    targetDay: Number(params.targetDay),
    saved: 0
  });
  setState(s);
}

export function contributeGoal(id: string, amount: number): void {
  const s = structuredClone(state);
  const g = s.goals.find((x) => x.id === id);
  if (!g) return;
  const inc = Math.max(0, Number(amount) || 0);
  g.saved += inc;
  s.transactions.push({
    id: uid(),
    day: s.day,
    amount: inc,
    category: "Savings",
    note: g.label + " — saved",
    ts: Date.now(),
    source: "goal"
  });
  setState(s);
}

export function removeGoal(id: string): void {
  const s = structuredClone(state);
  s.goals = s.goals.filter((g) => g.id !== id);
  setState(s);
}

export function addUnexpected(params: { label: string; amount: number; day?: number }): void {
  const s = structuredClone(state);
  const d = Number(params.day) || s.day;
  s.unexpected.push({ id: uid(), label: params.label, amount: Number(params.amount), day: d });
  s.transactions.push({
    id: uid(),
    day: d,
    amount: Number(params.amount),
    category: "Unexpected",
    note: params.label,
    ts: Date.now(),
    source: "unexpected"
  });
  setState(s);
}

export function takeLoan(params: {
  label: string;
  amount: number;
  apr: number;
  repayPerDay?: number;
}): void {
  const s = structuredClone(state);
  const id = uid();
  const principal = Number(params.amount);
  const daily = Number(params.repayPerDay) || Math.round(principal / 30);
  s.debts.push({
    id,
    label: params.label,
    principal,
    remaining: principal,
    apr: Number(params.apr) || 0,
    repayPerDay: daily,
    takenDay: s.day
  });
  s.transactions.push({
    id: uid(),
    day: s.day,
    amount: -principal,
    category: "Loan",
    note: params.label,
    ts: Date.now(),
    source: "loan"
  });
  setState(s);
}

export function repayExtra(id: string, amount: number): void {
  const s = structuredClone(state);
  const d = s.debts.find((x) => x.id === id);
  if (!d) return;
  const pay = Math.min(d.remaining, Number(amount) || 0);
  d.remaining = Math.max(0, d.remaining - pay);
  s.transactions.push({
    id: uid(),
    day: s.day,
    amount: pay,
    category: "Loan",
    note: "Extra repayment: " + d.label,
    ts: Date.now(),
    source: "loan"
  });
  if (d.remaining <= 0) {
    s.debts = s.debts.filter((x) => x.id !== id);
  }
  setState(s);
}

export function removeDebt(id: string): void {
  const s = structuredClone(state);
  s.debts = s.debts.filter((d) => d.id !== id);
  setState(s);
}

export function advanceDay(target?: number): void {
  const s = structuredClone(state);
  const next = Math.min(30, target ?? s.day + 1);
  if (next === s.day) return;
  for (let d = s.day + 1; d <= next; d++) {
    applyRecurringForDay(s, d);
  }
  s.day = next;
  setState(s);
}

export function applyRecurringForDay(s: AppState, d: number): void {
  const logKey = String(d);
  if (!s.appliedLog.commitmentsByDay[logKey]) s.appliedLog.commitmentsByDay[logKey] = {};
  if (!s.appliedLog.subscriptionsByDay[logKey]) s.appliedLog.subscriptionsByDay[logKey] = {};
  if (!s.appliedLog.debtRepayByDay[logKey]) s.appliedLog.debtRepayByDay[logKey] = {};

  // Commitments
  for (const c of s.commitments) {
    if (!c.active) continue;
    const dayMap = s.appliedLog.commitmentsByDay[logKey];
    if (dayMap && c.nextDueDay <= d && !dayMap[c.id]) {
      s.transactions.push({
        id: uid(),
        day: d,
        amount: c.amount,
        category: "Bills",
        note: c.label,
        ts: Date.now(),
        source: "commitment"
      });
      dayMap[c.id] = true;
      c.nextDueDay = c.frequency === "weekly" ? c.nextDueDay + 7 : c.nextDueDay + 30;
    }
  }

  // Subscriptions
  for (const sub of s.subscriptions) {
    if (!sub.active) continue;
    const subMap = s.appliedLog.subscriptionsByDay[logKey];
    if (subMap && sub.renewalDay <= d && sub.renewalDay >= 1 && !subMap[sub.id]) {
      s.transactions.push({
        id: uid(),
        day: d,
        amount: sub.amount,
        category: "Subscriptions",
        note: sub.name,
        ts: Date.now(),
        source: "subscription"
      });
      subMap[sub.id] = true;
      sub.renewalDay = sub.cycle === "annual" ? sub.renewalDay + 365 : sub.renewalDay + 30;
    }
  }

  // Recurring income
  for (const r of s.income.recurring) {
    if (r.startDay > d) continue;
    const period = r.cadence === "weekly" ? 7 : 30;
    for (let n = r.startDay; n <= d; n += period) {
      const k = `${r.id}_day_${n}`;
      if (s.appliedLog.incomeOneTimeById[k]) continue;
      s.appliedLog.incomeOneTimeById[k] = true;
      s.transactions.push({
        id: uid(),
        day: n,
        amount: -r.amount,
        category: "Income",
        note: r.label,
        ts: Date.now(),
        source: "income"
      });
    }
  }

  // Debt daily repayment
  const remainingDebts: typeof s.debts = [];
  for (const db of s.debts) {
    if (db.remaining <= 0) continue;
    const debtMap = s.appliedLog.debtRepayByDay[logKey];
    if (debtMap && !debtMap[db.id]) {
      const pay = Math.min(db.repayPerDay, db.remaining);
      db.remaining = Math.max(0, db.remaining - pay);
      s.transactions.push({
        id: uid(),
        day: d,
        amount: pay,
        category: "Loan",
        note: "Repayment: " + db.label,
        ts: Date.now(),
        source: "loan"
      });
      debtMap[db.id] = true;
    }
    if (db.remaining > 0) {
      remainingDebts.push(db);
    }
  }
  s.debts = remainingDebts;
}

export function projectState(state: AppState, mutator: (s: AppState) => void): AppState {
  const clone = structuredClone(state);
  mutator(clone);
  return clone;
}
