import { init, subscribe, getState, setState } from "./store.js";
import { makeInitialState, makeDemoState } from "./seed.js";
import { selectDerived } from "./selectors.js";
import { buildInsights } from "./insights.js";
import { verdict } from "./verdict.js";
import { drawBurndown, drawBurndownBands, drawForecast, drawCategory, drawGauge } from "./charts.js";
import { categorySpending, dailySpend, buildCategoryLegend, expectedTrajectory, historicalBalance, forecastBands } from "./helpers.js";
import { inr, inrPlain } from "./constants.js";
import {
  resetJourney, loadDemo, addExpense, addIncomeOneTime, addRecurringIncome, removeRecurringIncome,
  addCommitment, removeCommitment, addSubscription, toggleSubscription, removeSubscription,
  addGoal, contributeGoal, removeGoal, addUnexpected, takeLoan, repayExtra, removeDebt,
  advanceDay, projectState
} from "./store.js";

init();

const CATS = {
  Food: "🍜", Transport: "🚌", Shopping: "🛍️", Entertainment: "🎬", Bills: "🧾", Health: "💊", Misc: "✨",
  Income: "💰", Subscriptions: "📺", Savings: "🎯", Loan: "💳", Unexpected: "⚡"
};

const modalBackdrop = document.getElementById("modalBackdrop");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalCancelBtn = document.getElementById("modalCancelBtn");
const modalConfirmBtn = document.getElementById("modalConfirmBtn");

let toastTimer;
function toast(message, tone = "") {
  const wrap = document.getElementById("toastWrap");
  const el = document.createElement("div");
  el.className = "toast " + tone;
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => { el.remove(); }, 3500);
}

let currentModalClose = null;

function closeModal() {
  if (currentModalClose) {
    const fn = currentModalClose;
    currentModalClose = null;
    fn();
  }
}

function openModal({ title, body, confirmLabel = "Confirm", cancelLabel = "Cancel", onConfirm, onCancel }) {
  if (currentModalClose) {
    const prev = currentModalClose;
    currentModalClose = null;
    prev();
  }

  modalTitle.textContent = title;
  modalBody.innerHTML = body;
  modalConfirmBtn.textContent = confirmLabel;
  modalCancelBtn.textContent = cancelLabel;
  modalBackdrop.hidden = false;

  const previouslyFocused = document.activeElement;
  const getFocusable = () => Array.from(
    modalBackdrop.querySelectorAll(
      'button:not([hidden]):not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
  setTimeout(() => {
    const f = getFocusable();
    if (f.length) f[0].focus();
  }, 0);

  const onKey = (e) => {
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "Enter" && e.target && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "BUTTON") {
      e.preventDefault();
      modalConfirmBtn.click();
      return;
    }
    if (e.key !== "Tab") return;
    const f = getFocusable();
    if (f.length === 0) { e.preventDefault(); return; }
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener("keydown", onKey);

  const close = () => {
    document.removeEventListener("keydown", onKey);
    modalBackdrop.hidden = true;
    modalConfirmBtn.onclick = null;
    modalCancelBtn.onclick = null;
    modalTitle.textContent = "";
    modalBody.innerHTML = "";
    if (currentModalClose === close) currentModalClose = null;
    if (previouslyFocused && typeof previouslyFocused.focus === "function") {
      try { previouslyFocused.focus(); } catch {}
    }
  };

  currentModalClose = close;

  modalCancelBtn.onclick = () => {
    if (onCancel) onCancel();
    close();
  };
  modalConfirmBtn.onclick = () => {
    if (onConfirm) {
      const res = onConfirm();
      if (res === false) return;
    }
    close();
  };
}
modalBackdrop.addEventListener("click", (e) => { if (e.target === modalBackdrop) closeModal(); });

// ----------------------------- EVENT WIRING -----------------------------
document.getElementById("resetBtn").onclick = () => {
  openModal({
    title: "Reset your 30-day journey?",
    body: "<p>This wipes transactions, subscriptions, commitments, debts, and goals and sends you back to Day 1 with ₹10,000.</p>",
    confirmLabel: "Reset",
    onConfirm: () => { resetJourney(makeInitialState); toast("Journey reset. Fresh start!"); }
  });
};
document.getElementById("loadDemoBtn").onclick = () => {
  openModal({
    title: "Load demo scenario?",
    body: "<p>Replaces your current state with a realistic Day 15 — part-time income, subscriptions, an active goal, and a recent bike repair.</p>",
    confirmLabel: "Load demo",
    onConfirm: () => { loadDemo(makeDemoState); toast("Demo Day 15 loaded."); }
  });
};
document.getElementById("advanceDayBtn").onclick = () => {
  if (getState().day >= 30) { toast("Day 30 already — try Reset."); return; }
  advanceDay(); toast("Advanced one day.");
};

document.getElementById("addExpenseBtn").onclick = () => openExpenseModal();
document.getElementById("addUnexpectedBtn").onclick = () => openUnexpectedModal();
document.getElementById("addIncomeBtn").onclick = () => openIncomeModal();
document.getElementById("addSubBtn").onclick = () => openSubModal();
document.getElementById("addCommitBtn").onclick = () => openCommitModal();
document.getElementById("addRecurringIncomeBtn").onclick = () => openRecurringIncomeModal();
document.getElementById("addGoalBtn").onclick = () => openGoalModal();
document.getElementById("takeLoanBtn").onclick = () => openLoanModal();

// SIMULATOR WIRING
const simAction = document.getElementById("simAction");
const simAmount = document.getElementById("simAmount");
const simValueLabel = document.getElementById("simValueLabel");
const simSubField = document.getElementById("simSubField");
const simSubscription = document.getElementById("simSubscription");
const simProjection = document.getElementById("simProjection");
const simVerdictLabel = document.getElementById("simVerdictLabel");
const simVerdictReason = document.getElementById("simVerdictReason");
const simDeltas = document.getElementById("simDeltas");
const simConfirmBtn = document.getElementById("simConfirmBtn");
const simDiscardBtn = document.getElementById("simDiscardBtn");

simAction.addEventListener("change", updateSimFields);
simAction.addEventListener("change", () => { simProjection.hidden = true; });

function updateSimFields() {
  const v = simAction.value;
  simValueLabel.textContent = v === "cancelSubscription" ? "N/A" : (v === "subscription" ? "Monthly cost (₹)" : "Amount (₹)");
  simAmount.disabled = (v === "cancelSubscription");
  simAmount.value = "";
  simSubField.hidden = (v !== "cancelSubscription");
  if (v === "cancelSubscription") {
    const subs = getState().subscriptions.filter(s => s.active);
    simSubscription.innerHTML = subs.length === 0
      ? `<option value="">(no active subscriptions)</option>`
      : subs.map(s => `<option value="${s.id}">${s.name} — ₹${s.amount}/mo</option>`).join("");
  }
}

document.querySelectorAll(".sim-presets .chip").forEach(chip => {
  chip.addEventListener("click", () => applyPreset(chip.dataset.preset));
});
document.getElementById("simPreviewBtn").onclick = () => runSimulation();
document.getElementById("simDiscardBtn").onclick = () => { simProjection.hidden = true; simDiscardBtn.hidden = true; };
simConfirmBtn.onclick = () => commitSimulation();

function applyPreset(p) {
  if (p === "buy1499") { simAction.value = "subscription"; simAmount.value = 1499; }
  if (p === "cancelSpotify") {
    simAction.value = "cancelSubscription";
    updateSimFields();
    const sp = getState().subscriptions.find(s => /spotify/i.test(s.name));
    if (sp) simSubscription.value = sp.id; return simProjection.hidden = true, simDiscardBtn.hidden = true;
  }
  if (p === "skipDinner") { simAction.value = "skipExpense"; simAmount.value = 600; }
  if (p === "freelance") { simAction.value = "income"; simAmount.value = 3000; }
  if (p === "unexpected") { simAction.value = "unexpected"; simAmount.value = 2000; }
  if (p === "loan") { simAction.value = "loan"; simAmount.value = 2000; }
  simProjection.hidden = true; simDiscardBtn.hidden = true;
  updateSimFields();
}

// ----------------------------- SIMULATION CORE -----------------------------
let lastSimulation = null;

function buildMutator(action, amount, opts) {
  switch (action) {
    case "expense":
      return (s) => s.transactions.push({ id: "sim_" + Math.random().toString(36).slice(2), day: s.day, amount, category: "Misc", note: "Simulated expense", ts: Date.now(), source: "manual" });
    case "subscription":
      return (s) => {
        s.subscriptions.push({ id: "sim_" + Math.random().toString(36).slice(2), name: "New subscription", amount, cycle: "monthly", renewalDay: Math.min(30, s.day + 30), active: true });
      };
    case "cancelSubscription": {
      const id = opts.subId;
      return (s) => { const sub = s.subscriptions.find(x => x.id === id); if (sub) sub.active = false; };
    }
    case "skipExpense":
      // "skip" is a savings: subtract an assumed pending expense; modeled as immediate cash inflow
      return (s) => s.transactions.push({ id: "sim_" + Math.random().toString(36).slice(2), day: s.day, amount: -amount, category: "Income", note: "Simulated savings (skip)", ts: Date.now(), source: "income" });
    case "income":
      return (s) => {
        s.income.oneTime.push({ id: "sim_" + Math.random().toString(36).slice(2), label: "Simulated income", amount, day: s.day, applied: true });
        s.transactions.push({ id: "sim_" + Math.random().toString(36).slice(2), day: s.day, amount: -amount, category: "Income", note: "Simulated income", ts: Date.now(), source: "income" });
      };
    case "loan":
      return (s) => {
        const repay = Math.max(1, Math.round(amount / 30));
        s.debts.push({ id: "sim_" + Math.random().toString(36).slice(2), label: "Simulated loan", principal: amount, remaining: amount, apr: 24, repayPerDay: repay, takenDay: s.day });
        s.transactions.push({ id: "sim_" + Math.random().toString(36).slice(2), day: s.day, amount: -amount, category: "Loan", note: "Simulated loan", ts: Date.now(), source: "loan" });
      };
    case "unexpected":
      return (s) => {
        s.unexpected.push({ id: "sim_" + Math.random().toString(36).slice(2), label: "Simulated unexpected", amount, day: s.day });
        s.transactions.push({ id: "sim_" + Math.random().toString(36).slice(2), day: s.day, amount, category: "Unexpected", note: "Simulated unexpected", ts: Date.now(), source: "unexpected" });
      };
  }
}

function runSimulation() {
  const action = simAction.value;
  const amount = Number(simAmount.value);
  if (action !== "cancelSubscription" && (!Number.isFinite(amount) || amount <= 0)) {
    toast("Enter an amount first.", "warn"); return;
  }
  const opts = {};
  if (action === "cancelSubscription") {
    opts.subId = simSubscription.value;
    if (!opts.subId || opts.subId === "") { toast("Pick a subscription first.", "warn"); return; }
  }
  const current = getState();
  const currentDerived = selectDerived(current);
  const projected = projectState(current, buildMutator(action, amount, opts));
  const projectedDerived = selectDerived(projected);

  const v = verdict(currentDerived, projectedDerived);
  simVerdictLabel.className = "verdict-label " + v.label;
  simVerdictLabel.textContent = ({ smart: "✓ Smart", caution: "! Caution", avoid: "✕ Avoid" })[v.label];
  simVerdictReason.textContent = v.text;

  // deltas
  const goalEta = goal => {
    if (goal.status === "done") return "done";
    const req = goal.requiredPerDay;
    if (!Number.isFinite(req) || req <= 0) return "now";
    const daysNeeded = Math.ceil(goal.remaining / Math.max(1, req));
    const etaDay = Math.min(30, current.day + daysNeeded);
    return "Day " + etaDay;
  };
  const currentGoalsTxt = currentDerived.goalProjections.length
    ? currentDerived.goalProjections.map(g => `${g.label}: ${goalEta(g)}`).join(" · ")
    : "No goals set";
  const projectedGoalsTxt = projectedDerived.goalProjections.length
    ? projectedDerived.goalProjections.map(g => `${g.label}: ${goalEta(g)}`).join(" · ")
    : "No goals set";
  const ds = [
    { label: "Balance", a: currentDerived.balance, b: projectedDerived.balance, fmt: v => "₹" + Math.round(v).toLocaleString("en-IN") },
    { label: "Daily allowance", a: currentDerived.dailyAllowance, b: projectedDerived.dailyAllowance, fmt: v => "₹" + Math.round(v) },
    { label: "Risk", a: currentDerived.riskScore, b: projectedDerived.riskScore, fmt: v => Math.round(v) },
    { label: "Health", a: currentDerived.healthScore, b: projectedDerived.healthScore, fmt: v => Math.round(v) },
    { label: "Forecast end", a: currentDerived.forecast.expected, b: projectedDerived.forecast.expected, fmt: v => "₹" + Math.round(v).toLocaleString("en-IN") },
    { label: "Goal ETA", a: currentGoalsTxt, b: projectedGoalsTxt, fmt: v => v, raw: true }
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
      const chg = d.b - d.a;
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

  // forecast chart: current vs projected
  const currentLine = expectedTrajectory(current);
  const projectedLine = expectedTrajectory(projected);
  const canvas = document.getElementById("simForecastCanvas");
  drawForecast(canvas, currentLine, projectedLine);

  simProjection.hidden = false;
  simDiscardBtn.hidden = false;
  lastSimulation = { action, amount, opts };
}

function commitSimulation() {
  if (!lastSimulation) return;
  const { action, amount, opts } = lastSimulation;
  const state = getState();
  switch (action) {
    case "expense":
      addExpense({ day: state.day, amount, category: "Misc", note: "From simulator" });
      break;
    case "subscription":
      addSubscription({ name: "New subscription", amount, cycle: "monthly", renewalDay: Math.min(30, state.day + 30) });
      break;
    case "cancelSubscription":
      toggleSubscription(opts.subId, false);
      break;
    case "skipExpense":
      addIncomeOneTime({ day: state.day, amount, label: "Skipped expense (savings)" });
      break;
    case "income":
      addIncomeOneTime({ day: state.day, amount, label: "Simulated income" });
      break;
    case "loan":
      takeLoan({ label: "Simulated loan", amount, apr: 24, repayPerDay: Math.round(amount / 30) });
      break;
    case "unexpected":
      addUnexpected({ label: "Simulated unexpected", amount, day: state.day });
      break;
  }
  simProjection.hidden = true;
  simDiscardBtn.hidden = true;
  lastSimulation = null;
  toast("Applied. All metrics updated.");
}

// ----------------------------- MODALS -----------------------------
function openExpenseModal() {
  openModal({
    title: "Log an expense",
    body: `
      <div class="field"><label class="field-label">Amount (₹)</label><input id="m_amount" type="number" min="0" placeholder="0"/></div>
      <div class="field"><label class="field-label">Category</label>
        <select id="m_cat">
          ${Object.keys(CATS).filter(c => c !== "Income" && c !== "Subscriptions" && c !== "Savings" && c !== "Loan" && c !== "Unexpected").map(c => `<option>${c}</option>`).join("")}
        </select>
      </div>
      <div class="field"><label class="field-label">Note</label><input id="m_note" type="text" placeholder="optional"/></div>`,
    confirmLabel: "Log",
    onConfirm: () => {
      const amount = Number(document.getElementById("m_amount").value);
      if (!(amount > 0)) { toast("Enter a positive amount", "warn"); return false; }
      const cat = document.getElementById("m_cat").value;
      const note = document.getElementById("m_note").value;
      addExpense({ day: getState().day, amount, category: cat, note });
      toast("Expense logged.");
    }
  });
}

function openUnexpectedModal() {
  openModal({
    title: "Unexpected expense",
    body: `
      <p>Surprise spend incoming. Try the simulator first to preview impact — or commit and add it now.</p>
      <div class="field"><label class="field-label">Label</label><input id="u_label" type="text" value="Phone repair"/></div>
      <div class="field"><label class="field-label">Amount (₹)</label><input id="u_amount" type="number" min="0" placeholder="0"/></div>`,
    confirmLabel: "Add expense",
    onConfirm: () => {
      const amount = Number(document.getElementById("u_amount").value);
      const label = document.getElementById("u_label").value || "Unexpected";
      if (!(amount > 0)) { toast("Enter a positive amount", "warn"); return false; }
      // show impact first
      const current = getState();
      const projected = projectState(current, s => {
        s.unexpected.push({ id: "simU", label, amount, day: s.day });
        s.transactions.push({ id: "simU", day: s.day, amount, category: "Unexpected", note: label, ts: Date.now(), source: "unexpected" });
      });
      const cur = selectDerived(current), proj = selectDerived(projected);
      const delta = proj.balance - cur.balance;
      openModal({
        title: "Impact preview",
        body: `<p>Balance drops by <strong>${inr(delta)}</strong>.</p>
               <p>New daily allowance: <strong>${inr(proj.dailyAllowance)}/day</strong> (was ${inr(cur.dailyAllowance)}).</p>
               <p>Risk: <strong>${cur.riskScore}</strong> → <strong>${proj.riskScore}</strong>. Health: <strong>${cur.grade}</strong> → <strong>${proj.grade}</strong>.</p>
               <p>Confirm to add to your 30-day journey.</p>`,
        confirmLabel: "Confirm & add",
        onConfirm: () => {
          addUnexpected({ label, amount, day: getState().day });
          toast("Unexpected expense added.");
        }
      });
      return false;
    }
  });
}

function openIncomeModal() {
  openModal({
    title: "Receive income",
    body: `<p class="muted small">One-time income boosts balance now and improves forecast.</p>
      <div class="field"><label class="field-label">Label</label><input id="i_label" type="text" value="Freelance gig"/></div>
      <div class="field"><label class="field-label">Amount (₹)</label><input id="i_amount" type="number" min="0" placeholder="0"/></div>`,
    confirmLabel: "Add income",
    onConfirm: () => {
      const amount = Number(document.getElementById("i_amount").value);
      const label = document.getElementById("i_label").value || "Income";
      if (!(amount > 0)) { toast("Enter a positive amount", "warn"); return false; }
      addIncomeOneTime({ day: getState().day, amount, label });
      toast("Income added.");
    }
  });
}

function openSubModal() {
  openModal({
    title: "Add subscription",
    body: `
      <div class="field"><label class="field-label">Name</label><input id="s_name" type="text" value="New subscription"/></div>
      <div class="field"><label class="field-label">Monthly cost (₹)</label><input id="s_amount" type="number" min="0" placeholder="119"/></div>
      <div class="field"><label class="field-label">Cycle</label>
        <select id="s_cycle"><option value="monthly">Monthly</option><option value="annual">Annual</option></select>
      </div>
      <div class="field"><label class="field-label">Renewal day</label><input id="s_day" type="number" min="1" max="30" value="${Math.min(30, getState().day + 30)}"/></div>`,
    confirmLabel: "Add",
    onConfirm: () => {
      const name = document.getElementById("s_name").value || "Subscription";
      const amount = Number(document.getElementById("s_amount").value);
      const cycle = document.getElementById("s_cycle").value;
      const renewalDay = Number(document.getElementById("s_day").value) || getState().day + 30;
      if (!(amount > 0)) { toast("Enter a positive amount", "warn"); return false; }
      addSubscription({ name, amount, cycle, renewalDay });
      toast("Subscription added.");
    }
  });
}

function openCommitModal() {
  openModal({
    title: "Add commitment",
    body: `
      <div class="field"><label class="field-label">Label</label><input id="c_label" type="text" value="Phone EMI"/></div>
      <div class="field"><label class="field-label">Amount (₹)</label><input id="c_amount" type="number" min="0"/></div>
      <div class="field"><label class="field-label">Frequency</label><select id="c_freq"><option value="monthly">Monthly</option><option value="weekly">Weekly</option></select></div>
      <div class="field"><label class="field-label">Next due day</label><input id="c_due" type="number" min="1" max="30" value="${getState().day}"/></div>`,
    confirmLabel: "Add",
    onConfirm: () => {
      const label = document.getElementById("c_label").value || "Commitment";
      const amount = Number(document.getElementById("c_amount").value);
      const frequency = document.getElementById("c_freq").value;
      const nextDueDay = Number(document.getElementById("c_due").value) || getState().day;
      if (!(amount > 0)) { toast("Enter a positive amount", "warn"); return false; }
      addCommitment({ label, amount, frequency, nextDueDay });
      toast("Commitment added.");
    }
  });
}

function openRecurringIncomeModal() {
  openModal({
    title: "Recurring income",
    body: `
      <div class="field"><label class="field-label">Label</label><input id="r_label" type="text" value="Part-time stipend"/></div>
      <div class="field"><label class="field-label">Amount (₹)</label><input id="r_amount" type="number" min="0"/></div>
      <div class="field"><label class="field-label">Cadence</label><select id="r_freq"><option value="monthly">Monthly</option><option value="weekly">Weekly</option></select></div>
      <div class="field"><label class="field-label">Starts on day</label><input id="r_day" type="number" min="1" max="30" value="${getState().day}"/></div>`,
    confirmLabel: "Add",
    onConfirm: () => {
      const label = document.getElementById("r_label").value || "Recurring income";
      const amount = Number(document.getElementById("r_amount").value);
      const cadence = document.getElementById("r_freq").value;
      const startDay = Number(document.getElementById("r_day").value) || getState().day;
      if (!(amount > 0)) { toast("Enter a positive amount", "warn"); return false; }
      addRecurringIncome({ label, amount, cadence, startDay });
      toast("Recurring income added.");
    }
  });
}

function openGoalModal() {
  openModal({
    title: "New savings goal",
    body: `
      <div class="field"><label class="field-label">Label</label><input id="g_label" type="text" value="Trip to Goa"/></div>
      <div class="field"><label class="field-label">Target (₹)</label><input id="g_target" type="number" min="0"/></div>
      <div class="field"><label class="field-label">Target day</label><input id="g_day" type="number" min="1" max="30" value="30"/></div>`,
    confirmLabel: "Add",
    onConfirm: () => {
      const label = document.getElementById("g_label").value || "Goal";
      const target = Number(document.getElementById("g_target").value);
      const targetDay = Number(document.getElementById("g_day").value) || 30;
      if (!(target > 0)) { toast("Enter a positive target", "warn"); return false; }
      addGoal({ label, target, targetDay });
      toast("Savings goal added.");
    }
  });
}

function openLoanModal() {
  openModal({
    title: "Take a loan",
    body: `
      <div class="field"><label class="field-label">Label</label><input id="d_label" type="text" value="Quick loan"/></div>
      <div class="field"><label class="field-label">Amount (₹)</label><input id="d_amount" type="number" min="0"/></div>
      <div class="field"><label class="field-label">APR %</label><input id="d_apr" type="number" min="0" value="24"/></div>`,
    confirmLabel: "Take loan",
    onConfirm: () => {
      const label = document.getElementById("d_label").value || "Loan";
      const amount = Number(document.getElementById("d_amount").value);
      const apr = Number(document.getElementById("d_apr").value);
      if (!(amount > 0)) { toast("Enter a positive amount", "warn"); return false; }
      takeLoan({ label, amount, apr, repayPerDay: Math.max(1, Math.round(amount / 30)) });
      toast("Loan added.");
    }
  });
}

// ----------------------------- RENDER -----------------------------
const dayPill = document.getElementById("dayPill");
const balanceNum = document.getElementById("balanceNum");
const balanceBar = document.getElementById("balanceBar");
const allowanceNum = document.getElementById("allowanceNum");
const bufferNum = document.getElementById("bufferNum");
const spentNum = document.getElementById("spentNum");
const daysLeftNum = document.getElementById("daysLeftNum");
const balanceBand = document.getElementById("balanceBand");
const riskBand = document.getElementById("riskBand");
const riskFactors = document.getElementById("riskFactors");
const healthBadge = document.getElementById("healthBadge");
const healthLetter = document.getElementById("healthLetter");
const healthScoreNum = document.getElementById("healthScoreNum");
const healthFactors = document.getElementById("healthFactors");
const txList = document.getElementById("txList");
const subList = document.getElementById("subList");
const subMonthly = document.getElementById("subMonthly");
const subAnnual = document.getElementById("subAnnual");
const commitList = document.getElementById("commitList");
const goalsList = document.getElementById("goalsList");
const debtList = document.getElementById("debtList");
const incomeList = document.getElementById("incomeList");
const heatmap = document.getElementById("heatmap");
const insightsList = document.getElementById("insightsList");
const forecastBest = document.getElementById("forecastBest");
const forecastExpected = document.getElementById("forecastExpected");
const forecastWorst = document.getElementById("forecastWorst");
const forecastBestNote = document.getElementById("forecastBestNote");
const forecastExpectedNote = document.getElementById("forecastExpectedNote");
const forecastWorstNote = document.getElementById("forecastWorstNote");
const forecastCanvas = document.getElementById("forecastCanvas");
const burndownCanvas = document.getElementById("burndownCanvas");
const categoryCanvas = document.getElementById("categoryCanvas");
const categoryLegend = document.getElementById("categoryLegend");

function render() {
  const state = getState();
  const d = selectDerived(state);

  dayPill.textContent = `Day ${d.day} / 30`;
  balanceNum.textContent = inrPlain(d.balance);
  allowanceNum.textContent = Math.round(d.dailyAllowance);
  bufferNum.textContent = inrPlain(d.allowanceBuffer || 0);
  spentNum.textContent = inrPlain(d.spent);
  daysLeftNum.textContent = d.daysLeft;

  const balPct = Math.max(0, Math.min(100, (d.balance / state.budget) * 100));
  balanceBar.style.width = balPct + "%";
  if (d.balance < 0) { balanceBand.textContent = "Overdrawn"; balanceBand.className = "badge tone-red"; }
  else if (d.balance < 1500) { balanceBand.textContent = "Tight"; balanceBand.className = "badge tone-amber"; }
  else { balanceBand.textContent = "In the green"; balanceBand.className = "badge tone-balance"; }

  // Risk gauge
  drawGauge(document.getElementById("riskGauge"), d.riskScore);
  riskBand.textContent = d.riskBand === "high" ? "High" : d.riskBand === "medium" ? "Moderate" : "Low";
  riskBand.className = "badge " + (d.riskBand === "high" ? "tone-red" : d.riskBand === "medium" ? "tone-amber" : "tone-green");
  riskFactors.innerHTML = d.riskFactors
    .sort((a, b) => b.contribution - a.contribution)
    .map(f => `<li class="factor"><span class="name">${f.name}</span><span class="mini"><i style="width:${Math.round(f.value * 100)}%"></i></span><span class="val">+${Math.round(f.contribution)}</span></li>`).join("");

  // Health
  healthLetter.textContent = d.grade;
  healthBadge.textContent = d.grade;
  healthScoreNum.textContent = d.healthScore;
  healthFactors.innerHTML = d.healthFactors
    .map(f => `<li class="factor"><span class="name">${f.name}</span><span class="mini"><i style="width:${Math.round(f.value * 100)}%"></i></span><span class="val">${Math.round(f.value * 100)}%</span></li>`)
    .join("");

  // Forecast
  forecastBest.textContent = inrPlain(d.forecast.best);
  forecastExpected.textContent = inrPlain(d.forecast.expected);
  forecastWorst.textContent = inrPlain(d.forecast.worst);
  forecastBestNote.textContent = d.forecast.best >= 0 ? "Surplus to enjoy" : "Best realistic surplus";
  forecastExpectedNote.textContent = d.forecast.expected >= 0 ? "End-of-period cash" : "Projected deficit";
  forecastWorstNote.textContent = d.forecast.worst >= 0 ? "Worst-case surplus" : "Worst-case shortfall";

  // Forecast chart (banded) + burn-down (historical + future band)
  const hist = historicalBalance(state);
  const bands = forecastBands(state);
  drawBurndownBands(forecastCanvas, bands.expectedLine, { bestLine: bands.bestLine, worstLine: bands.worstLine });
  drawBurndownBands(burndownCanvas, hist, { bestLine: bands.bestLine, worstLine: bands.worstLine });

  // Categories
  const cat = categorySpending(state);
  drawCategory(categoryCanvas, cat);
  const legend = buildCategoryLegend(cat);
  if (legend.length === 0) {
    categoryLegend.innerHTML = `<li class="muted small">Log an expense to see categories.</li>`;
  } else {
    const palette = ["#8b5cf6", "#f472b6", "#fbbf24", "#2dd4bf", "#60a5fa", "#ef4444"];
    categoryLegend.innerHTML = legend.map(([k, v], i) => `<li><span class="swatch" style="background:${palette[i % palette.length]}"></span><span class="name">${CATS[k] || "•"} ${k}</span><span class="num">₹${inrPlain(v)}</span></li>`).join("");
  }

  // Transactions
  const txs = state.transactions.slice().sort((a, b) => b.day - a.day || b.ts - a.ts);
  if (txs.length === 0) {
    txList.innerHTML = `<div class="empty">No transactions yet. Log an expense or load the demo.</div>`;
  } else {
    txList.innerHTML = txs.slice(0, 30).map(t => rowForTx(t, state)).join("");
    // re-attach handlers
    txList.querySelectorAll("[data-del-tx]").forEach(b => b.onclick = () => {
      const id = b.dataset.delTx;
      const s = structuredClone(getState());
      s.transactions = s.transactions.filter(t => t.id !== id);
      setStoreFromOutside(s);
    });
  }

  // Subscriptions
  subMonthly.textContent = inr(d.subMonthly);
  subAnnual.textContent = inr(d.subAnnual);
  if (state.subscriptions.length === 0) {
    subList.innerHTML = `<div class="empty">No subscriptions yet.</div>`;
  } else {
    subList.innerHTML = state.subscriptions.map(s => `
      <div class="row">
        <div class="ico">📺</div>
        <div>
          <div class="label">${escapeHtml(s.name)}</div>
          <div class="sub">${s.cycle} · renews Day ${s.renewalDay > 30 ? s.renewalDay - 30 : s.renewalDay}${s.cycle === 'annual' ? ' (annual)' : ''}${s.active ? '' : ' · canceled'}</div>
        </div>
        <div class="amt ${s.active ? 'neg' : 'muted'}">₹${inrPlain(s.amount)}</div>
        <div class="actions-cell">
          <button class="icon-btn" data-toggle-sub="${s.id}">${s.active ? 'Cancel' : 'Restart'}</button>
          <button class="icon-btn danger" data-rm-sub="${s.id}">Delete</button>
        </div>
      </div>
    `).join("");
    subList.querySelectorAll("[data-toggle-sub]").forEach(b => b.onclick = () => {
      const id = b.dataset.toggleSub;
      const sub = getState().subscriptions.find(x => x.id === id);
      toggleSubscription(id, !sub.active);
    });
    subList.querySelectorAll("[data-rm-sub]").forEach(b => b.onclick = () => {
      if (confirm("Delete this subscription?")) removeSubscription(b.dataset.rmSub);
    });
  }

  // Commitments
  if (state.commitments.length === 0) {
    commitList.innerHTML = `<div class="empty">No recurring commitments yet.</div>`;
  } else {
    commitList.innerHTML = state.commitments.map(c => `
      <div class="row">
        <div class="ico">📅</div>
        <div>
          <div class="label">${escapeHtml(c.label)}</div>
          <div class="sub">${c.frequency} · next Day ${c.nextDueDay}</div>
        </div>
        <div class="amt neg">₹${inrPlain(c.amount)}</div>
        <div class="actions-cell">
          <button class="icon-btn danger" data-rm-c="${c.id}">Delete</button>
        </div>
      </div>
    `).join("");
    commitList.querySelectorAll("[data-rm-c]").forEach(b => b.onclick = () => removeCommitment(b.dataset.rmC));
  }

  // Income
  const recurring = state.income.recurring.map(r => ({ kind: "recurring", r }));
  const oneTime = state.income.oneTime.map(o => ({ kind: "oneTime", o }));
  const incomes = [...recurring, ...oneTime];
  if (incomes.length === 0) {
    incomeList.innerHTML = `<div class="empty">No income set. Add it to model paydays.</div>`;
  } else {
    incomeList.innerHTML = incomes.map(item => {
      if (item.kind === "recurring") {
        const r = item.r;
        return `
          <div class="row">
            <div class="ico">💵</div>
            <div>
              <div class="label">${escapeHtml(r.label)}</div>
              <div class="sub">${r.cadence} · starts Day ${r.startDay}</div>
            </div>
            <div class="amt pos">+₹${inrPlain(r.amount)}</div>
            <div class="actions-cell">
              <button class="icon-btn danger" data-rm-r="${r.id}">Delete</button>
            </div>
          </div>`;
      } else {
        const o = item.o;
        return `
          <div class="row">
            <div class="ico">💰</div>
            <div>
              <div class="label">${escapeHtml(o.label)}</div>
              <div class="sub">One-time · Day ${o.day}${o.applied ? ' · applied' : ''}</div>
            </div>
            <div class="amt pos">+₹${inrPlain(o.amount)}</div>
            <div class="actions-cell"><span class="muted small"></span></div>
          </div>`;
      }
    }).join("");
    incomeList.querySelectorAll("[data-rm-r]").forEach(b => b.onclick = () => removeRecurringIncome(b.dataset.rmR));
  }

  // Goals
  if (state.goals.length === 0) {
    goalsList.innerHTML = `<div class="empty">No goals yet. Add one to start tracking.</div>`;
  } else {
    goalsList.innerHTML = state.goals.map(g => {
      const gp = d.goalProjections.find(p => p.id === g.id) || { status: "reachable", requiredPerDay: 0, perDay: 0 };
      const pct = Math.min(100, (g.saved / g.target) * 100);
      const tone = gp.status === "reachable" ? "reachable" : gp.status === "at-risk" ? "at-risk" : gp.status === "done" ? "reachable" : "unreachable";
      const need = gp.remaining > 0 ? `Need <strong>₹${Math.round(gp.requiredPerDay)}/day</strong> · on track for ₹${Math.round(gp.perDay)}/day` : "Goal reached 🎉";
      return `
        <div class="goal">
          <h4>${escapeHtml(g.label)}</h4>
          <div class="progress"><i style="width:${pct}%"></i></div>
          <div class="meta"><span>₹${inrPlain(g.saved)} / ₹${inrPlain(g.target)}</span><span>Day ${g.targetDay}</span></div>
          <div class="eta ${tone}">${need}</div>
          <div class="actions-cell" style="display:flex;gap:6px;">
            <button class="icon-btn" data-contrib="${g.id}">+ ₹100</button>
            <button class="icon-btn" data-contrib-big="${g.id}">+ ₹500</button>
            <button class="icon-btn danger" data-rm-g="${g.id}">Delete</button>
          </div>
        </div>`;
    }).join("");
    goalsList.querySelectorAll("[data-contrib]").forEach(b => b.onclick = () => contributeGoal(b.dataset.contrib, 100));
    goalsList.querySelectorAll("[data-contrib-big]").forEach(b => b.onclick = () => contributeGoal(b.dataset.contribBig, 500));
    goalsList.querySelectorAll("[data-rm-g]").forEach(b => b.onclick = () => removeGoal(b.dataset.rmG));
  }

  // Debts
  if (state.debts.length === 0) {
    debtList.innerHTML = `<div class="empty">No loans. </div>`;
  } else {
    debtList.innerHTML = state.debts.map(db => `
      <div class="row">
        <div class="ico">💳</div>
        <div>
          <div class="label">${escapeHtml(db.label)}</div>
          <div class="sub">Principal ₹${inrPlain(db.principal)} · APR ${db.apr}% · ₹${Math.round(db.repayPerDay)}/day</div>
        </div>
        <div class="amt neg">₹${inrPlain(db.remaining)} left</div>
        <div class="actions-cell">
          <button class="icon-btn" data-repay="${db.id}">Repay ₹500</button>
          <button class="icon-btn danger" data-rm-d="${db.id}">Delete</button>
        </div>
      </div>
    `).join("");
    debtList.querySelectorAll("[data-repay]").forEach(b => b.onclick = () => repayExtra(b.dataset.repay, 500));
    debtList.querySelectorAll("[data-rm-d]").forEach(b => b.onclick = () => removeDebt(b.dataset.rmD));
  }

  // Heatmap
  const days = dailySpend(state);
  const maxDay = Math.max(1, ...days);
  heatmap.innerHTML = days.map((amt, i) => {
    const lvl = amt === 0 ? 0 : amt > maxDay * 0.66 ? 4 : amt > maxDay * 0.33 ? 3 : amt > maxDay * 0.12 ? 2 : 1;
    const isToday = (i + 1) === state.day;
    return `<div class="heat-cell heat-${lvl} ${isToday ? 'today' : ''}" title="Day ${i + 1}: ₹${Math.round(amt)}">${i + 1}</div>`;
  }).join("");

  // Insights
  const insights = buildInsights(d, state);
  if (insights.length === 0) {
    insightsList.innerHTML = `<li class="insight low"><span class="ico">✨</span><div class="body">You're tracking clean. Add subscriptions or commitments to see more coaching.</div><span class="sev">GOOD</span></li>`;
  } else {
    insightsList.innerHTML = insights.map(i => `<li class="insight ${i.severity}"><span class="ico">${i.icon}</span><div class="body"><strong>${i.title}.</strong> ${i.body}</div><span class="sev">${i.severity === 'high' ? 'URGENT' : i.severity === 'med' ? 'WATCH' : 'GOOD'}</span></li>`).join("");
  }

  // Simulator sub list
  updateSimFields();

  // Day-30 end-of-period summary modal — UI-only trigger so dismissing it
  // never rolls back state. Per-session flag prevents re-fire.
  if (state.day >= 30 && !window._paisaDay30ShownForDay) {
    window._paisaDay30ShownForDay = 30;
    const goalsMet = d.goalProjections.filter(p => p.remaining === 0).length;
    const goalsAtRisk = d.goalProjections.filter(p => p.status === "at-risk").length;
    const goalsUnreach = d.goalProjections.filter(p => p.status === "unreachable").length;
    openModal({
      title: "Day 30 — journey summary",
      body: `
        <p>You made it to the end of the 30-day journey. Here's how it went:</p>
        <ul class="summary-list">
          <li><strong>Final balance:</strong> ${inr(d.balance)}</li>
          <li><strong>Total saved toward goals:</strong> ${inr(d.saved)}</li>
          <li><strong>Goals met:</strong> ${goalsMet} of ${state.goals.length}</li>
          <li><strong>Final grade:</strong> ${d.grade} (${d.healthScore}/100)</li>
          <li><strong>Final risk:</strong> ${d.riskScore} · ${d.riskBand === "high" ? "High" : d.riskBand === "medium" ? "Moderate" : "Low"}</li>
          ${goalsAtRisk + goalsUnreach > 0 ? `<li><strong>Goals at risk / unreachable:</strong> ${goalsAtRisk + goalsUnreach}</li>` : ""}
        </ul>
        <p class="muted small">You can keep this state or start over with a fresh ₹10,000 budget.</p>`,
      confirmLabel: "Reset journey",
      cancelLabel: "Keep & continue",
      onConfirm: () => {
        resetJourney(makeInitialState);
        window._paisaDay30ShownForDay = null;
        toast("Journey reset. Fresh start!");
      }
    });
  }
}

function rowForTx(t) {
  const sign = t.amount < 0 ? "+" : "";
  const cls = t.amount < 0 ? "pos" : "neg";
  return `
    <div class="row">
      <div class="ico">${CATS[t.category] || "•"}</div>
      <div>
        <div class="label">${escapeHtml(t.note || t.category)}</div>
        <div class="sub">Day ${t.day} · ${t.category}${t.source !== 'manual' ? ' · ' + t.source : ''}</div>
      </div>
      <div class="amt ${cls}">${sign}₹${inrPlain(Math.abs(t.amount))}</div>
      <div class="actions-cell"><button class="icon-btn danger" data-del-tx="${t.id}">×</button></div>
    </div>
  `;
}

function setStoreFromOutside(state) {
  // Push the new state through the reactive store without reloading
  setState(state);
}

function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

// Sidebar active link on scroll
const sections = document.querySelectorAll("[id]");
const railLinks = document.querySelectorAll(".rail-link");
const observer = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      railLinks.forEach(l => l.classList.toggle("active", l.dataset.jump === e.target.id));
    }
  }
}, { rootMargin: "-30% 0px -55% 0px" });
sections.forEach(s => s.id && observer.observe(s));

subscribe(render);
render();

// Onboarding hint on first run — only fires when localStorage has no record and the
// user has not added any data yet. Gated by `paisa_onboarded` so reloads don't repeat it.
setTimeout(() => {
  try {
    const ONBOARD_KEY = "paisa_onboarded";
    if (localStorage.getItem(ONBOARD_KEY)) return;
    const s = getState();
    const isFresh = s.transactions.length === 0 && s.subscriptions.length === 0 && s.commitments.length === 0;
    if (isFresh) {
      toast("Tip: try the Simulate panel to preview a decision before committing.", "");
    }
    localStorage.setItem(ONBOARD_KEY, "yes");
  } catch {}
}, 600);
