import { loadState, saveState } from "./storage.js";

const subs = new Set();
let state;
const pending = {};

// Ensure derived slate is writable but state itself is treated immutably.
export function getState() { return state; }
export function setState(next) {
  state = next;
  saveState(state);
  for (const fn of subs) {
    try { fn(state); } catch (e) { console.error(e); }
  }
}

export function init(initial) {
  state = initial ?? loadState();
}

export function subscribe(fn) {
  subs.add(fn);
  fn(state);
  return () => subs.delete(fn);
}

// ACTIONS — every public mutation goes here. Each returns a NEW state and triggers setState.
import { uid } from "./constants.js";

export function resetJourney(makeInitial, makeDemo) {
  setState(makeInitial());
}
export function loadDemo(makeDemo) {
  setState(makeDemo());
}

export function addExpense({ day, amount, category, note }, defaults) {
  const s = structuredClone(state);
  s.transactions.push({
    id: uid(), day, amount, category, note: note || "",
    ts: Date.now(), source: "manual"
  });
  setState(s);
}

export function addIncomeOneTime({ day, amount, label }) {
  const s = structuredClone(state);
  const id = uid();
  s.income.oneTime.push({ id, label: label || "One-time income", amount, day, applied: true });
  s.transactions.push({
    id: uid(), day, amount: -amount, category: "Income",
    note: label || "One-time income", ts: Date.now(), source: "income"
  });
  setState(s);
}

export function addRecurringIncome({ label, amount, cadence, startDay }) {
  const s = structuredClone(state);
  s.income.recurring.push({ id: uid(), label, amount, cadence, startDay: Number(startDay) });
  setState(s);
}
export function removeRecurringIncome(id) {
  const s = structuredClone(state);
  s.income.recurring = s.income.recurring.filter(r => r.id !== id);
  setState(s);
}

export function addCommitment({ label, amount, frequency, nextDueDay }) {
  const s = structuredClone(state);
  s.commitments.push({ id: uid(), label, amount: Number(amount), frequency, nextDueDay: Number(nextDueDay), active: true });
  setState(s);
}
export function removeCommitment(id) {
  const s = structuredClone(state);
  s.commitments = s.commitments.filter(c => c.id !== id);
  setState(s);
}

export function addSubscription({ name, amount, cycle, renewalDay }) {
  const s = structuredClone(state);
  s.subscriptions.push({ id: uid(), name, amount: Number(amount), cycle, renewalDay: Number(renewalDay), active: true });
  setState(s);
}
export function toggleSubscription(id, active) {
  const s = structuredClone(state);
  const sub = s.subscriptions.find(x => x.id === id);
  if (sub) sub.active = !!active;
  setState(s);
}
export function removeSubscription(id) {
  const s = structuredClone(state);
  s.subscriptions = s.subscriptions.filter(x => x.id !== id);
  setState(s);
}

export function addGoal({ label, target, targetDay }) {
  const s = structuredClone(state);
  s.goals.push({ id: uid(), label, target: Number(target), targetDay: Number(targetDay), saved: 0 });
  setState(s);
}
export function contributeGoal(id, amount) {
  const s = structuredClone(state);
  const g = s.goals.find(x => x.id === id);
  if (!g) return;
  const inc = Math.max(0, Number(amount) || 0);
  g.saved += inc;
  s.transactions.push({ id: uid(), day: s.day, amount: inc, category: "Savings", note: g.label + " — saved", ts: Date.now(), source: "goal" });
  setState(s);
}
export function removeGoal(id) {
  const s = structuredClone(state);
  s.goals = s.goals.filter(g => g.id !== id);
  setState(s);
}

export function addUnexpected({ label, amount, day }) {
  const s = structuredClone(state);
  const d = Number(day) || s.day;
  s.unexpected.push({ id: uid(), label, amount: Number(amount), day: d });
  s.transactions.push({ id: uid(), day: d, amount: Number(amount), category: "Unexpected", note: label, ts: Date.now(), source: "unexpected" });
  setState(s);
}

export function takeLoan({ label, amount, apr, repayPerDay }) {
  const s = structuredClone(state);
  const id = uid();
  const principal = Number(amount);
  const daily = Number(repayPerDay) || Math.round(principal / 30);
  s.debts.push({
    id, label, principal, remaining: principal, apr: Number(apr) || 0,
    repayPerDay: daily, takenDay: s.day
  });
  s.transactions.push({ id: uid(), day: s.day, amount: -principal, category: "Loan", note: label, ts: Date.now(), source: "loan" });
  setState(s);
}
export function repayExtra(id, amount) {
  const s = structuredClone(state);
  const d = s.debts.find(x => x.id === id);
  if (!d) return;
  const pay = Math.min(d.remaining, Number(amount) || 0);
  d.remaining = Math.max(0, d.remaining - pay);
  s.transactions.push({ id: uid(), day: s.day, amount: pay, category: "Loan", note: "Extra repayment: " + d.label, ts: Date.now(), source: "loan" });
  if (d.remaining <= 0) {
    s.debts = s.debts.filter(x => x.id !== id);
  }
  setState(s);
}
export function removeDebt(id) {
  const s = structuredClone(state);
  s.debts = s.debts.filter(d => d.id !== id);
  setState(s);
}

export function advanceDay(target) {
  const s = structuredClone(state);
  const next = Math.min(30, target ?? s.day + 1);
  if (next === s.day) return;
  // Apply recurring things between current and next
  for (let d = s.day + 1; d <= next; d++) {
    applyRecurringForDay(s, d);
  }
  s.day = next;
  setState(s);
}

export function applyRecurringForDay(s, d) {
  const logKey = String(d);
  if (!s.appliedLog.commitmentsByDay[logKey]) s.appliedLog.commitmentsByDay[logKey] = {};
  if (!s.appliedLog.subscriptionsByDay[logKey]) s.appliedLog.subscriptionsByDay[logKey] = {};
  if (!s.appliedLog.debtRepayByDay[logKey]) s.appliedLog.debtRepayByDay[logKey] = {};

  // Commitments: due on or before day
  for (const c of s.commitments) {
    if (!c.active) continue;
    if (c.nextDueDay <= d && !s.appliedLog.commitmentsByDay[logKey][c.id]) {
      s.transactions.push({
        id: uid(), day: d, amount: c.amount, category: "Bills",
        note: c.label, ts: Date.now(), source: "commitment"
      });
      s.appliedLog.commitmentsByDay[logKey][c.id] = true;
      // next due
      c.nextDueDay = c.frequency === "weekly" ? c.nextDueDay + 7 : c.nextDueDay + 30;
    }
  }
  // Subscriptions: renewal day within period
  for (const sub of s.subscriptions) {
    if (!sub.active) continue;
    if (sub.renewalDay <= d && sub.renewalDay >= 1 && !s.appliedLog.subscriptionsByDay[logKey][sub.id]) {
      s.transactions.push({
        id: uid(), day: d, amount: sub.amount, category: "Subscriptions",
        note: sub.name, ts: Date.now(), source: "subscription"
      });
      s.appliedLog.subscriptionsByDay[logKey][sub.id] = true;
      sub.renewalDay = sub.cycle === "annual" ? sub.renewalDay + 365 : sub.renewalDay + 30;
    }
  }
  // Recurring income
  for (const r of s.income.recurring) {
    if (r.startDay > d) continue;
    const period = r.cadence === "weekly" ? 7 : 30;
    for (let n = r.startDay; n <= d; n += period) {
      const k = `${logKey}_${r.id}_${n}`;
      if (s.appliedLog.incomeOneTimeById[k]) continue;
      s.appliedLog.incomeOneTimeById[k] = true;
      s.transactions.push({
        id: uid(), day: n, amount: -r.amount, category: "Income",
        note: r.label, ts: Date.now(), source: "income"
      });
    }
  }
  // Debt daily repayment
  for (const db of s.debts) {
    if (db.remaining <= 0) continue;
    if (s.appliedLog.debtRepayByDay[logKey][db.id]) continue;
    const pay = Math.min(db.repayPerDay, db.remaining);
    db.remaining = Math.max(0, db.remaining - pay);
    s.transactions.push({
      id: uid(), day: d, amount: pay, category: "Loan",
      note: "Repayment: " + db.label, ts: Date.now(), source: "loan"
    });
    s.appliedLog.debtRepayByDay[logKey][db.id] = true;
    if (db.remaining <= 0) {
      // remove when fully paid
      s.debts = s.debts.filter(x => x.id !== db.id);
    }
  }
}

// Used by simulator to clone state + apply a synthetic action → returns a NEW state (does NOT setState)
export function projectState(state, mutator) {
  const clone = structuredClone(state);
  mutator(clone);
  return clone;
}
