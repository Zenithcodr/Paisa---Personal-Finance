import { inrPlain, CATEGORY_ICONS, escapeHtml } from "../../core/constants";
import { getState, setState } from "../../core/store";
import type { AppState, Transaction } from "../../types/state";

export function renderTransactions(state: AppState): void {
  const txList = document.getElementById("txList");
  if (!txList) return;

  const txs = state.transactions.slice().sort((a, b) => b.day - a.day || (b.ts || 0) - (a.ts || 0));

  if (txs.length === 0) {
    txList.innerHTML = `<div class="empty">No transactions yet. Log an expense or load the demo.</div>`;
    return;
  }

  txList.innerHTML = txs
    .slice(0, 30)
    .map((t) => rowForTx(t))
    .join("");

  // Re-attach delete handlers
  txList.querySelectorAll<HTMLButtonElement>("[data-del-tx]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.delTx;
      if (!id) return;
      const s = structuredClone(getState());
      s.transactions = s.transactions.filter((t) => t.id !== id);
      setState(s);
    };
  });
}

function rowForTx(t: Transaction): string {
  const sign = t.amount < 0 ? "+" : "";
  const cls = t.amount < 0 ? "pos" : "neg";
  const icon = CATEGORY_ICONS[t.category] || "•";
  return `
    <div class="row">
      <div class="ico" aria-hidden="true">${icon}</div>
      <div>
        <div class="label">${escapeHtml(t.note || t.category)}</div>
        <div class="sub">Day ${t.day} · ${t.category}${t.source !== "manual" ? " · " + t.source : ""}</div>
      </div>
      <div class="amt ${cls}">${sign}₹${inrPlain(Math.abs(t.amount))}</div>
      <div class="actions-cell">
        <button class="icon-btn danger" data-del-tx="${t.id}" aria-label="Delete transaction ${escapeHtml(t.note || t.category)}">×</button>
      </div>
    </div>
  `;
}
