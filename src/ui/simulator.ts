import {
  getState,
  projectState,
  addExpense,
  addSubscription,
  toggleSubscription,
  addIncomeOneTime,
  takeLoan,
  addUnexpected
} from "../core/store";
import { selectDerived } from "../core/selectors";
import { verdict } from "../core/verdict";
import { drawForecast } from "../core/charts";
import { expectedTrajectory } from "../core/helpers";
import { toast } from "./toast";
import type { AppState } from "../types/state";
import type { DerivedMetrics, GoalProjection } from "../types/metrics";

type SimAction =
  | "expense"
  | "subscription"
  | "cancelSubscription"
  | "skipExpense"
  | "income"
  | "loan"
  | "unexpected";

interface LastSimulation {
  action: SimAction;
  amount: number;
  opts: { subId?: string };
}

let lastSimulation: LastSimulation | null = null;

export function initSimulator(): void {
  const simAction = document.getElementById("simAction") as HTMLSelectElement | null;
  const simPreviewBtn = document.getElementById("simPreviewBtn");
  const simDiscardBtn = document.getElementById("simDiscardBtn");
  const simConfirmBtn = document.getElementById("simConfirmBtn");

  if (simAction) {
    simAction.addEventListener("change", () => {
      updateSimFields();
      hideProjection();
    });
  }

  document.querySelectorAll<HTMLButtonElement>(".sim-presets .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const p = chip.dataset.preset;
      if (p) applyPreset(p);
    });
  });

  if (simPreviewBtn) simPreviewBtn.onclick = () => runSimulation();
  if (simDiscardBtn) simDiscardBtn.onclick = () => hideProjection();
  if (simConfirmBtn) simConfirmBtn.onclick = () => commitSimulation();
}

export function renderSimulator(state: AppState, _d: DerivedMetrics): void {
  updateSimFields(state);
}

function hideProjection(): void {
  const simProjection = document.getElementById("simProjection");
  const simDiscardBtn = document.getElementById("simDiscardBtn");
  if (simProjection) simProjection.hidden = true;
  if (simDiscardBtn) simDiscardBtn.hidden = true;
  lastSimulation = null;
}

export function updateSimFields(state: AppState = getState()): void {
  const simAction = document.getElementById("simAction") as HTMLSelectElement | null;
  const simAmount = document.getElementById("simAmount") as HTMLInputElement | null;
  const simValueLabel = document.getElementById("simValueLabel");
  const simSubField = document.getElementById("simSubField");
  const simSubscription = document.getElementById("simSubscription") as HTMLSelectElement | null;

  if (!simAction || !simAmount || !simValueLabel || !simSubField || !simSubscription) return;

  const v = simAction.value as SimAction;
  simValueLabel.textContent =
    v === "cancelSubscription" ? "N/A" : v === "subscription" ? "Monthly cost (₹)" : "Amount (₹)";
  simAmount.disabled = v === "cancelSubscription";
  simSubField.hidden = v !== "cancelSubscription";

  if (v === "cancelSubscription") {
    const subs = state.subscriptions.filter((s) => s.active);
    simSubscription.innerHTML =
      subs.length === 0
        ? `<option value="">(no active subscriptions)</option>`
        : subs.map((s) => `<option value="${s.id}">${s.name} — ₹${s.amount}/mo</option>`).join("");
  }
}

function applyPreset(p: string): void {
  const simAction = document.getElementById("simAction") as HTMLSelectElement | null;
  const simAmount = document.getElementById("simAmount") as HTMLInputElement | null;
  const simSubscription = document.getElementById("simSubscription") as HTMLSelectElement | null;
  if (!simAction || !simAmount) return;

  if (p === "buy1499") {
    simAction.value = "subscription";
    simAmount.value = "1499";
  } else if (p === "cancelSpotify") {
    simAction.value = "cancelSubscription";
    updateSimFields();
    const sp = getState().subscriptions.find((s) => /spotify/i.test(s.name));
    if (sp && simSubscription) simSubscription.value = sp.id;
    hideProjection();
    return;
  } else if (p === "skipDinner") {
    simAction.value = "skipExpense";
    simAmount.value = "600";
  } else if (p === "freelance") {
    simAction.value = "income";
    simAmount.value = "3000";
  } else if (p === "unexpected") {
    simAction.value = "unexpected";
    simAmount.value = "2000";
  } else if (p === "loan") {
    simAction.value = "loan";
    simAmount.value = "2000";
  }

  hideProjection();
  updateSimFields();
}

function buildMutator(
  action: SimAction,
  amount: number,
  opts: { subId?: string }
): (s: AppState) => void {
  switch (action) {
    case "expense":
      return (s) => {
        s.transactions.push({
          id: "sim_" + Math.random().toString(36).slice(2),
          day: s.day,
          amount,
          category: "Misc",
          note: "Simulated expense",
          ts: Date.now(),
          source: "manual"
        });
      };
    case "subscription":
      return (s) => {
        s.subscriptions.push({
          id: "sim_" + Math.random().toString(36).slice(2),
          name: "New subscription",
          amount,
          cycle: "monthly",
          renewalDay: Math.min(30, s.day + 30),
          active: true
        });
      };
    case "cancelSubscription": {
      const id = opts.subId;
      return (s) => {
        const sub = s.subscriptions.find((x) => x.id === id);
        if (sub) sub.active = false;
      };
    }
    case "skipExpense":
      return (s) => {
        s.transactions.push({
          id: "sim_" + Math.random().toString(36).slice(2),
          day: s.day,
          amount: -amount,
          category: "Income",
          note: "Simulated savings (skip)",
          ts: Date.now(),
          source: "income"
        });
      };
    case "income":
      return (s) => {
        s.income.oneTime.push({
          id: "sim_" + Math.random().toString(36).slice(2),
          label: "Simulated income",
          amount,
          day: s.day,
          applied: true
        });
        s.transactions.push({
          id: "sim_" + Math.random().toString(36).slice(2),
          day: s.day,
          amount: -amount,
          category: "Income",
          note: "Simulated income",
          ts: Date.now(),
          source: "income"
        });
      };
    case "loan":
      return (s) => {
        const repay = Math.max(1, Math.round(amount / 30));
        s.debts.push({
          id: "sim_" + Math.random().toString(36).slice(2),
          label: "Simulated loan",
          principal: amount,
          remaining: amount,
          apr: 24,
          repayPerDay: repay,
          takenDay: s.day
        });
        s.transactions.push({
          id: "sim_" + Math.random().toString(36).slice(2),
          day: s.day,
          amount: -amount,
          category: "Loan",
          note: "Simulated loan",
          ts: Date.now(),
          source: "loan"
        });
      };
    case "unexpected":
      return (s) => {
        s.unexpected.push({
          id: "sim_" + Math.random().toString(36).slice(2),
          label: "Simulated unexpected",
          amount,
          day: s.day
        });
        s.transactions.push({
          id: "sim_" + Math.random().toString(36).slice(2),
          day: s.day,
          amount,
          category: "Unexpected",
          note: "Simulated unexpected",
          ts: Date.now(),
          source: "unexpected"
        });
      };
  }
}

function runSimulation(): void {
  const simAction = document.getElementById("simAction") as HTMLSelectElement | null;
  const simAmount = document.getElementById("simAmount") as HTMLInputElement | null;
  const simSubscription = document.getElementById("simSubscription") as HTMLSelectElement | null;
  const simProjection = document.getElementById("simProjection");
  const simDiscardBtn = document.getElementById("simDiscardBtn");
  const simVerdictLabel = document.getElementById("simVerdictLabel");
  const simVerdictReason = document.getElementById("simVerdictReason");
  const simDeltas = document.getElementById("simDeltas");
  const simCanvas = document.getElementById("simForecastCanvas") as HTMLCanvasElement | null;

  if (
    !simAction ||
    !simAmount ||
    !simProjection ||
    !simDiscardBtn ||
    !simVerdictLabel ||
    !simVerdictReason ||
    !simDeltas ||
    !simCanvas
  ) {
    return;
  }

  const action = simAction.value as SimAction;
  const amount = Number(simAmount.value);
  if (action !== "cancelSubscription" && (!Number.isFinite(amount) || amount <= 0)) {
    toast("Enter an amount first.", "warn");
    return;
  }

  const opts: { subId?: string } = {};
  if (action === "cancelSubscription") {
    opts.subId = simSubscription?.value;
    if (!opts.subId) {
      toast("Pick a subscription first.", "warn");
      return;
    }
  }

  const current = getState();
  const currentDerived = selectDerived(current);
  const projected = projectState(current, buildMutator(action, amount, opts));
  const projectedDerived = selectDerived(projected);

  const v = verdict(currentDerived, projectedDerived);
  simVerdictLabel.className = "verdict-label " + v.label;
  simVerdictLabel.textContent =
    v.label === "smart" ? "✓ Smart" : v.label === "caution" ? "! Caution" : "✕ Avoid";
  simVerdictReason.textContent = v.text;

  // Delta cards
  const goalEta = (goal: GoalProjection) => {
    if (goal.status === "done") return "done";
    const req = goal.requiredPerDay;
    if (!Number.isFinite(req) || req <= 0) return "now";
    const daysNeeded = Math.ceil(goal.remaining / Math.max(1, req));
    const etaDay = Math.min(30, current.day + daysNeeded);
    return "Day " + etaDay;
  };

  const currentGoalsTxt = currentDerived.goalProjections.length
    ? currentDerived.goalProjections.map((g) => `${g.label}: ${goalEta(g)}`).join(" · ")
    : "No goals set";
  const projectedGoalsTxt = projectedDerived.goalProjections.length
    ? projectedDerived.goalProjections.map((g) => `${g.label}: ${goalEta(g)}`).join(" · ")
    : "No goals set";

  interface DeltaItem {
    label: string;
    a: number | string;
    b: number | string;
    fmt: (val: number | string) => string;
    raw?: boolean;
  }

  const ds: DeltaItem[] = [
    {
      label: "Balance",
      a: currentDerived.balance,
      b: projectedDerived.balance,
      fmt: (val) => "₹" + Math.round(Number(val)).toLocaleString("en-IN")
    },
    {
      label: "Daily allowance",
      a: currentDerived.dailyAllowance,
      b: projectedDerived.dailyAllowance,
      fmt: (val) => "₹" + Math.round(Number(val))
    },
    {
      label: "Risk",
      a: currentDerived.riskScore,
      b: projectedDerived.riskScore,
      fmt: (val) => String(Math.round(Number(val)))
    },
    {
      label: "Health",
      a: currentDerived.healthScore,
      b: projectedDerived.healthScore,
      fmt: (val) => String(Math.round(Number(val)))
    },
    {
      label: "Forecast end",
      a: currentDerived.forecast.expected,
      b: projectedDerived.forecast.expected,
      fmt: (val) => "₹" + Math.round(Number(val)).toLocaleString("en-IN")
    },
    {
      label: "Goal ETA",
      a: currentGoalsTxt,
      b: projectedGoalsTxt,
      fmt: (val) => String(val),
      raw: true
    }
  ];

  simDeltas.innerHTML = "";
  for (const d of ds) {
    const el = document.createElement("div");
    el.className = "delta";
    if (d.raw) {
      el.innerHTML = `
        <div class="label">${d.label}</div>
        <div class="values">${d.fmt(d.a)}</div>
        <div class="values">→ ${d.fmt(d.b)}</div>
      `;
    } else {
      const numA = Number(d.a);
      const numB = Number(d.b);
      const chg = numB - numA;
      const dir = chg > 0.5 ? "up" : chg < -0.5 ? "down" : "flat";
      const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "•";
      el.innerHTML = `
        <div class="label">${d.label}</div>
        <div class="values">${d.fmt(d.a)} → ${d.fmt(d.b)}</div>
        <div class="chg ${dir}">${arrow} ${chg > 0 ? "+" : ""}${d.fmt(chg)}</div>
      `;
    }
    simDeltas.appendChild(el);
  }

  // Draw forecast comparison
  const currentLine = expectedTrajectory(current);
  const projectedLine = expectedTrajectory(projected);
  const currentEnd = currentLine[currentLine.length - 1] ?? 0;
  const projEnd = projectedLine[projectedLine.length - 1] ?? 0;
  simCanvas.setAttribute(
    "aria-label",
    `Forecast comparison chart. If you do nothing, projected end balance is ₹${Math.round(currentEnd).toLocaleString("en-IN")}. If you do this, projected end balance is ₹${Math.round(projEnd).toLocaleString("en-IN")}.`
  );
  drawForecast(simCanvas, currentLine, projectedLine);

  simProjection.hidden = false;
  simDiscardBtn.hidden = false;
  lastSimulation = { action, amount, opts };
}

function commitSimulation(): void {
  if (!lastSimulation) return;
  const { action, amount, opts } = lastSimulation;
  const state = getState();

  switch (action) {
    case "expense":
      addExpense({ day: state.day, amount, category: "Misc", note: "From simulator" });
      break;
    case "subscription":
      addSubscription({
        name: "New subscription",
        amount,
        cycle: "monthly",
        renewalDay: Math.min(30, state.day + 30)
      });
      break;
    case "cancelSubscription":
      if (opts.subId) toggleSubscription(opts.subId, false);
      break;
    case "skipExpense":
      addIncomeOneTime({ day: state.day, amount, label: "Skipped expense (savings)" });
      break;
    case "income":
      addIncomeOneTime({ day: state.day, amount, label: "Simulated income" });
      break;
    case "loan":
      takeLoan({
        label: "Simulated loan",
        amount,
        apr: 24,
        repayPerDay: Math.round(amount / 30)
      });
      break;
    case "unexpected":
      addUnexpected({ label: "Simulated unexpected", amount, day: state.day });
      break;
  }

  hideProjection();
  toast("Applied. All metrics updated.");
}
