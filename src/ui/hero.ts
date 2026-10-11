import { inr, inrPlain, CATEGORY_ICONS } from "../core/constants";
import { drawGauge } from "../core/charts";
import { openModal } from "./modal";
import { toast } from "./toast";
import {
  getState,
  addExpense,
  addUnexpected,
  addIncomeOneTime,
  advanceDay,
  resetJourney,
  projectState
} from "../core/store";
import { selectDerived } from "../core/selectors";
import { makeInitialState } from "../core/seed";
import type { AppState, Category } from "../types/state";
import type { DerivedMetrics } from "../types/metrics";

export function initHero(): void {
  const addExpenseBtn = document.getElementById("addExpenseBtn");
  const addUnexpectedBtn = document.getElementById("addUnexpectedBtn");
  const addIncomeBtn = document.getElementById("addIncomeBtn");
  const advanceDayBtn = document.getElementById("advanceDayBtn");

  if (addExpenseBtn) addExpenseBtn.onclick = () => openExpenseModal();
  if (addUnexpectedBtn) addUnexpectedBtn.onclick = () => openUnexpectedModal();
  if (addIncomeBtn) addIncomeBtn.onclick = () => openIncomeModal();
  if (advanceDayBtn) {
    advanceDayBtn.onclick = () => {
      if (getState().day >= 30) {
        toast("Day 30 already — try Reset.", "warn");
        return;
      }
      advanceDay();
      toast("Advanced one day.");
    };
  }
}

export function renderHero(state: AppState, d: DerivedMetrics): void {
  const dayPill = document.getElementById("dayPill");
  const balanceNum = document.getElementById("balanceNum");
  const balanceBar = document.getElementById("balanceBar");
  const allowanceNum = document.getElementById("allowanceNum");
  const bufferNum = document.getElementById("bufferNum");
  const spentNum = document.getElementById("spentNum");
  const daysLeftNum = document.getElementById("daysLeftNum");
  const balanceBand = document.getElementById("balanceBand");

  if (dayPill) dayPill.textContent = `Day ${d.day} / 30`;
  if (balanceNum) balanceNum.textContent = inrPlain(d.balance);
  if (allowanceNum) allowanceNum.textContent = String(Math.round(d.dailyAllowance));
  if (bufferNum) bufferNum.textContent = inrPlain(d.allowanceBuffer || 0);
  if (spentNum) spentNum.textContent = inrPlain(d.spent);
  if (daysLeftNum) daysLeftNum.textContent = String(d.daysLeft);

  if (balanceBar) {
    const balPct = Math.max(0, Math.min(100, (d.balance / state.budget) * 100));
    balanceBar.style.setProperty("--w", balPct + "%");
    balanceBar.style.width = balPct + "%";
  }

  if (balanceBand) {
    if (d.balance < 0) {
      balanceBand.textContent = "Overdrawn";
      balanceBand.className = "badge tone-red";
    } else if (d.balance < 1500) {
      balanceBand.textContent = "Tight";
      balanceBand.className = "badge tone-amber";
    } else {
      balanceBand.textContent = "In the green";
      balanceBand.className = "badge tone-balance";
    }
  }

  // Risk gauge & factors
  const riskGaugeEl = document.getElementById("riskGauge");
  if (riskGaugeEl) {
    riskGaugeEl.setAttribute(
      "aria-label",
      `Risk score gauge: ${d.riskScore} out of 100, ${d.riskBand} risk`
    );
  }
  drawGauge(riskGaugeEl, d.riskScore);

  const riskBand = document.getElementById("riskBand");
  if (riskBand) {
    riskBand.textContent =
      d.riskBand === "high" ? "High" : d.riskBand === "medium" ? "Moderate" : "Low";
    riskBand.className =
      "badge " +
      (d.riskBand === "high" ? "tone-red" : d.riskBand === "medium" ? "tone-amber" : "tone-green");
  }

  const riskFactors = document.getElementById("riskFactors");
  if (riskFactors) {
    riskFactors.innerHTML = d.riskFactors
      .sort((a, b) => b.contribution - a.contribution)
      .map(
        (f) =>
          `<li class="factor"><span class="name">${f.name}</span><span class="mini"><i style="--w:${Math.round(f.value * 100)}%; width:${Math.round(f.value * 100)}%"></i></span><span class="val">+${Math.round(f.contribution)}</span></li>`
      )
      .join("");
  }

  // Health display & factors
  const healthLetter = document.getElementById("healthLetter");
  const healthBadge = document.getElementById("healthBadge");
  const healthScoreNum = document.getElementById("healthScoreNum");
  const healthFactors = document.getElementById("healthFactors");

  if (healthLetter) healthLetter.textContent = d.grade;
  if (healthBadge) healthBadge.textContent = d.grade;
  if (healthScoreNum) healthScoreNum.textContent = String(d.healthScore);

  if (healthFactors) {
    healthFactors.innerHTML = d.healthFactors
      .map(
        (f) =>
          `<li class="factor"><span class="name">${f.name}</span><span class="mini"><i style="--w:${Math.round(f.value * 100)}%; width:${Math.round(f.value * 100)}%"></i></span><span class="val">${Math.round(f.value * 100)}%</span></li>`
      )
      .join("");
  }

  // Day 30 summary modal trigger
  checkDay30Summary(state, d);
}

declare global {
  interface Window {
    _paisaDay30ShownForDay?: number | null;
  }
}

function checkDay30Summary(state: AppState, d: DerivedMetrics): void {
  if (state.day >= 30 && !window._paisaDay30ShownForDay) {
    window._paisaDay30ShownForDay = 30;
    const goalsMet = d.goalProjections.filter((p) => p.remaining === 0).length;
    const goalsAtRisk = d.goalProjections.filter((p) => p.status === "at-risk").length;
    const goalsUnreach = d.goalProjections.filter((p) => p.status === "unreachable").length;
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

function openExpenseModal(): void {
  const categories: Category[] = [
    "Food",
    "Transport",
    "Shopping",
    "Entertainment",
    "Bills",
    "Health",
    "Misc"
  ];
  openModal({
    title: "Log an expense",
    body: `
      <div class="field"><label class="field-label" for="m_amount">Amount (₹)</label><input id="m_amount" type="number" min="0" placeholder="0"/></div>
      <div class="field"><label class="field-label" for="m_cat">Category</label>
        <select id="m_cat">
          ${categories.map((c) => `<option value="${c}">${CATEGORY_ICONS[c]} ${c}</option>`).join("")}
        </select>
      </div>
      <div class="field"><label class="field-label" for="m_note">Note</label><input id="m_note" type="text" placeholder="optional"/></div>`,
    confirmLabel: "Log",
    onConfirm: () => {
      const amountInput = document.getElementById("m_amount") as HTMLInputElement | null;
      const catSelect = document.getElementById("m_cat") as HTMLSelectElement | null;
      const noteInput = document.getElementById("m_note") as HTMLInputElement | null;
      const amount = Number(amountInput?.value);
      if (!(amount > 0)) {
        toast("Enter a positive amount", "warn");
        return false;
      }
      const cat = (catSelect?.value as Category) || "Misc";
      const note = noteInput?.value || "";
      addExpense({ day: getState().day, amount, category: cat, note });
      toast("Expense logged.");
      return true;
    }
  });
}

function openUnexpectedModal(): void {
  openModal({
    title: "Unexpected expense",
    body: `
      <p>Surprise spend incoming. Try the simulator first to preview impact — or commit and add it now.</p>
      <div class="field"><label class="field-label" for="u_label">Label</label><input id="u_label" type="text" value="Phone repair"/></div>
      <div class="field"><label class="field-label" for="u_amount">Amount (₹)</label><input id="u_amount" type="number" min="0" placeholder="0"/></div>`,
    confirmLabel: "Add expense",
    onConfirm: () => {
      const amountInput = document.getElementById("u_amount") as HTMLInputElement | null;
      const labelInput = document.getElementById("u_label") as HTMLInputElement | null;
      const amount = Number(amountInput?.value);
      const label = labelInput?.value || "Unexpected";
      if (!(amount > 0)) {
        toast("Enter a positive amount", "warn");
        return false;
      }
      const current = getState();
      const projected = projectState(current, (s) => {
        s.unexpected.push({ id: "simU", label, amount, day: s.day });
        s.transactions.push({
          id: "simU",
          day: s.day,
          amount,
          category: "Unexpected",
          note: label,
          ts: Date.now(),
          source: "unexpected"
        });
      });
      const cur = selectDerived(current);
      const proj = selectDerived(projected);
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
          return true;
        }
      });
      return false;
    }
  });
}

function openIncomeModal(): void {
  openModal({
    title: "Receive income",
    body: `<p class="muted small">One-time income boosts balance now and improves forecast.</p>
      <div class="field"><label class="field-label" for="i_label">Label</label><input id="i_label" type="text" value="Freelance gig"/></div>
      <div class="field"><label class="field-label" for="i_amount">Amount (₹)</label><input id="i_amount" type="number" min="0" placeholder="0"/></div>`,
    confirmLabel: "Add income",
    onConfirm: () => {
      const amountInput = document.getElementById("i_amount") as HTMLInputElement | null;
      const labelInput = document.getElementById("i_label") as HTMLInputElement | null;
      const amount = Number(amountInput?.value);
      const label = labelInput?.value || "Income";
      if (!(amount > 0)) {
        toast("Enter a positive amount", "warn");
        return false;
      }
      addIncomeOneTime({ day: getState().day, amount, label });
      toast("Income added.");
      return true;
    }
  });
}
