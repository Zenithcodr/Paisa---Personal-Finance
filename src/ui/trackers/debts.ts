import { inrPlain, escapeHtml } from "../../core/constants";
import { openModal } from "../modal";
import { toast } from "../toast";
import { takeLoan, repayExtra, removeDebt } from "../../core/store";
import type { AppState } from "../../types/state";

export function initDebts(): void {
  const takeLoanBtn = document.getElementById("takeLoanBtn");
  if (takeLoanBtn) takeLoanBtn.onclick = () => openLoanModal();
}

export function renderDebts(state: AppState): void {
  const debtList = document.getElementById("debtList");
  if (!debtList) return;

  if (state.debts.length === 0) {
    debtList.innerHTML = `<div class="empty">No loans.</div>`;
    return;
  }

  debtList.innerHTML = state.debts
    .map(
      (db) => `
      <div class="row">
        <div class="ico" aria-hidden="true">💳</div>
        <div>
          <div class="label">${escapeHtml(db.label)}</div>
          <div class="sub">Principal ₹${inrPlain(db.principal)} · APR ${db.apr}% · ₹${Math.round(db.repayPerDay)}/day</div>
        </div>
        <div class="amt neg">₹${inrPlain(db.remaining)} left</div>
        <div class="actions-cell">
          <button class="icon-btn" data-repay="${db.id}" aria-label="Repay 500 rupees toward ${escapeHtml(db.label)}">Repay ₹500</button>
          <button class="icon-btn danger" data-rm-d="${db.id}" aria-label="Delete loan ${escapeHtml(db.label)}">Delete</button>
        </div>
      </div>
    `
    )
    .join("");

  debtList.querySelectorAll<HTMLButtonElement>("[data-repay]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.repay;
      if (id) {
        repayExtra(id, 500);
        toast("Repaid ₹500 toward loan.");
      }
    };
  });

  debtList.querySelectorAll<HTMLButtonElement>("[data-rm-d]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.rmD;
      if (id) removeDebt(id);
    };
  });
}

function openLoanModal(): void {
  openModal({
    title: "Take a loan",
    body: `
      <div class="field"><label class="field-label" for="d_label">Label</label><input id="d_label" type="text" value="Quick loan"/></div>
      <div class="field"><label class="field-label" for="d_amount">Amount (₹)</label><input id="d_amount" type="number" min="0"/></div>
      <div class="field"><label class="field-label" for="d_apr">APR %</label><input id="d_apr" type="number" min="0" value="24"/></div>`,
    confirmLabel: "Take loan",
    onConfirm: () => {
      const labelInput = document.getElementById("d_label") as HTMLInputElement | null;
      const amountInput = document.getElementById("d_amount") as HTMLInputElement | null;
      const aprInput = document.getElementById("d_apr") as HTMLInputElement | null;

      const label = labelInput?.value || "Loan";
      const amount = Number(amountInput?.value);
      const apr = Number(aprInput?.value);

      if (!(amount > 0)) {
        toast("Enter a positive amount", "warn");
        return false;
      }
      takeLoan({
        label,
        amount,
        apr,
        repayPerDay: Math.max(1, Math.round(amount / 30))
      });
      toast("Loan added.");
      return true;
    }
  });
}
