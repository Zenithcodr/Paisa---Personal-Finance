import { inrPlain, escapeHtml } from "../../core/constants";
import { openModal } from "../modal";
import { toast } from "../toast";
import { getState, addRecurringIncome, removeRecurringIncome } from "../../core/store";
import type { AppState, RecurringIncome, OneTimeIncome } from "../../types/state";

export function initIncome(): void {
  const addRecurringIncomeBtn = document.getElementById("addRecurringIncomeBtn");
  if (addRecurringIncomeBtn) {
    addRecurringIncomeBtn.onclick = () => openRecurringIncomeModal();
  }
}

export function renderIncome(state: AppState): void {
  const incomeList = document.getElementById("incomeList");
  if (!incomeList) return;

  type IncomeItem =
    { kind: "recurring"; r: RecurringIncome } | { kind: "oneTime"; o: OneTimeIncome };

  const recurring: IncomeItem[] = state.income.recurring.map((r) => ({ kind: "recurring", r }));
  const oneTime: IncomeItem[] = state.income.oneTime.map((o) => ({ kind: "oneTime", o }));
  const incomes = [...recurring, ...oneTime];

  if (incomes.length === 0) {
    incomeList.innerHTML = `<div class="empty">No income set. Add it to model paydays.</div>`;
    return;
  }

  incomeList.innerHTML = incomes
    .map((item) => {
      if (item.kind === "recurring") {
        const r = item.r;
        return `
          <div class="row">
            <div class="ico" aria-hidden="true">💵</div>
            <div>
              <div class="label">${escapeHtml(r.label)}</div>
              <div class="sub">${r.cadence} · starts Day ${r.startDay}</div>
            </div>
            <div class="amt pos">+₹${inrPlain(r.amount)}</div>
            <div class="actions-cell">
              <button class="icon-btn danger" data-rm-r="${r.id}" aria-label="Delete recurring income ${escapeHtml(r.label)}">Delete</button>
            </div>
          </div>`;
      } else {
        const o = item.o;
        return `
          <div class="row">
            <div class="ico" aria-hidden="true">💰</div>
            <div>
              <div class="label">${escapeHtml(o.label)}</div>
              <div class="sub">One-time · Day ${o.day}${o.applied ? " · applied" : ""}</div>
            </div>
            <div class="amt pos">+₹${inrPlain(o.amount)}</div>
            <div class="actions-cell"></div>
          </div>`;
      }
    })
    .join("");

  incomeList.querySelectorAll<HTMLButtonElement>("[data-rm-r]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.rmR;
      if (id) removeRecurringIncome(id);
    };
  });
}

function openRecurringIncomeModal(): void {
  openModal({
    title: "Recurring income",
    body: `
      <div class="field"><label class="field-label" for="r_label">Label</label><input id="r_label" type="text" value="Part-time stipend"/></div>
      <div class="field"><label class="field-label" for="r_amount">Amount (₹)</label><input id="r_amount" type="number" min="0"/></div>
      <div class="field"><label class="field-label" for="r_freq">Cadence</label><select id="r_freq"><option value="monthly">Monthly</option><option value="weekly">Weekly</option></select></div>
      <div class="field"><label class="field-label" for="r_day">Starts on day</label><input id="r_day" type="number" min="1" max="30" value="${getState().day}"/></div>`,
    confirmLabel: "Add",
    onConfirm: () => {
      const labelInput = document.getElementById("r_label") as HTMLInputElement | null;
      const amountInput = document.getElementById("r_amount") as HTMLInputElement | null;
      const freqSelect = document.getElementById("r_freq") as HTMLSelectElement | null;
      const dayInput = document.getElementById("r_day") as HTMLInputElement | null;

      const label = labelInput?.value || "Recurring income";
      const amount = Number(amountInput?.value);
      const cadence = (freqSelect?.value as "monthly" | "weekly") || "monthly";
      const startDay = Number(dayInput?.value) || getState().day;

      if (!(amount > 0)) {
        toast("Enter a positive amount", "warn");
        return false;
      }
      addRecurringIncome({ label, amount, cadence, startDay });
      toast("Recurring income added.");
      return true;
    }
  });
}
