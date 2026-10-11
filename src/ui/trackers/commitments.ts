import { inrPlain, escapeHtml } from "../../core/constants";
import { openModal } from "../modal";
import { toast } from "../toast";
import { getState, addCommitment, removeCommitment } from "../../core/store";
import type { AppState } from "../../types/state";

export function initCommitments(): void {
  const addCommitBtn = document.getElementById("addCommitBtn");
  if (addCommitBtn) addCommitBtn.onclick = () => openCommitModal();
}

export function renderCommitments(state: AppState): void {
  const commitList = document.getElementById("commitList");
  if (!commitList) return;

  if (state.commitments.length === 0) {
    commitList.innerHTML = `<div class="empty">No recurring commitments yet.</div>`;
    return;
  }

  commitList.innerHTML = state.commitments
    .map(
      (c) => `
      <div class="row">
        <div class="ico" aria-hidden="true">📅</div>
        <div>
          <div class="label">${escapeHtml(c.label)}</div>
          <div class="sub">${c.frequency} · next Day ${c.nextDueDay}</div>
        </div>
        <div class="amt neg">₹${inrPlain(c.amount)}</div>
        <div class="actions-cell">
          <button class="icon-btn danger" data-rm-c="${c.id}" aria-label="Delete commitment ${escapeHtml(c.label)}">Delete</button>
        </div>
      </div>
    `
    )
    .join("");

  commitList.querySelectorAll<HTMLButtonElement>("[data-rm-c]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.rmC;
      if (id) removeCommitment(id);
    };
  });
}

function openCommitModal(): void {
  openModal({
    title: "Add commitment",
    body: `
      <div class="field"><label class="field-label" for="c_label">Label</label><input id="c_label" type="text" value="Phone EMI"/></div>
      <div class="field"><label class="field-label" for="c_amount">Amount (₹)</label><input id="c_amount" type="number" min="0"/></div>
      <div class="field"><label class="field-label" for="c_freq">Frequency</label><select id="c_freq"><option value="monthly">Monthly</option><option value="weekly">Weekly</option></select></div>
      <div class="field"><label class="field-label" for="c_due">Next due day</label><input id="c_due" type="number" min="1" max="30" value="${getState().day}"/></div>`,
    confirmLabel: "Add",
    onConfirm: () => {
      const labelInput = document.getElementById("c_label") as HTMLInputElement | null;
      const amountInput = document.getElementById("c_amount") as HTMLInputElement | null;
      const freqSelect = document.getElementById("c_freq") as HTMLSelectElement | null;
      const dueInput = document.getElementById("c_due") as HTMLInputElement | null;

      const label = labelInput?.value || "Commitment";
      const amount = Number(amountInput?.value);
      const frequency = (freqSelect?.value as "monthly" | "weekly") || "monthly";
      const nextDueDay = Number(dueInput?.value) || getState().day;

      if (!(amount > 0)) {
        toast("Enter a positive amount", "warn");
        return false;
      }
      addCommitment({ label, amount, frequency, nextDueDay });
      toast("Commitment added.");
      return true;
    }
  });
}
