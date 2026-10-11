import { inr, inrPlain, escapeHtml } from "../../core/constants";
import { openModal } from "../modal";
import { toast } from "../toast";
import {
  getState,
  addSubscription,
  toggleSubscription,
  removeSubscription
} from "../../core/store";
import type { AppState } from "../../types/state";
import type { DerivedMetrics } from "../../types/metrics";

export function initSubscriptions(): void {
  const addSubBtn = document.getElementById("addSubBtn");
  if (addSubBtn) addSubBtn.onclick = () => openSubModal();
}

export function renderSubscriptions(state: AppState, d: DerivedMetrics): void {
  const subMonthly = document.getElementById("subMonthly");
  const subAnnual = document.getElementById("subAnnual");
  const subList = document.getElementById("subList");

  if (subMonthly) subMonthly.textContent = inr(d.subMonthly);
  if (subAnnual) subAnnual.textContent = inr(d.subAnnual);
  if (!subList) return;

  if (state.subscriptions.length === 0) {
    subList.innerHTML = `<div class="empty">No subscriptions yet.</div>`;
    return;
  }

  subList.innerHTML = state.subscriptions
    .map(
      (s) => `
      <div class="row">
        <div class="ico" aria-hidden="true">📺</div>
        <div>
          <div class="label">${escapeHtml(s.name)}</div>
          <div class="sub">${s.cycle} · renews Day ${s.renewalDay > 30 ? s.renewalDay - 30 : s.renewalDay}${s.cycle === "annual" ? " (annual)" : ""}${s.active ? "" : " · canceled"}</div>
        </div>
        <div class="amt ${s.active ? "neg" : "muted"}">₹${inrPlain(s.amount)}</div>
        <div class="actions-cell">
          <button class="icon-btn" data-toggle-sub="${s.id}" aria-label="${s.active ? "Cancel" : "Restart"} subscription ${escapeHtml(s.name)}">${s.active ? "Cancel" : "Restart"}</button>
          <button class="icon-btn danger" data-rm-sub="${s.id}" aria-label="Delete subscription ${escapeHtml(s.name)}">Delete</button>
        </div>
      </div>
    `
    )
    .join("");

  subList.querySelectorAll<HTMLButtonElement>("[data-toggle-sub]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.toggleSub;
      if (!id) return;
      const sub = getState().subscriptions.find((x) => x.id === id);
      if (sub) toggleSubscription(id, !sub.active);
    };
  });

  subList.querySelectorAll<HTMLButtonElement>("[data-rm-sub]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.rmSub;
      if (!id) return;
      if (confirm("Delete this subscription?")) {
        removeSubscription(id);
      }
    };
  });
}

function openSubModal(): void {
  openModal({
    title: "Add subscription",
    body: `
      <div class="field"><label class="field-label" for="s_name">Name</label><input id="s_name" type="text" value="New subscription"/></div>
      <div class="field"><label class="field-label" for="s_amount">Monthly cost (₹)</label><input id="s_amount" type="number" min="0" placeholder="119"/></div>
      <div class="field"><label class="field-label" for="s_cycle">Cycle</label>
        <select id="s_cycle"><option value="monthly">Monthly</option><option value="annual">Annual</option></select>
      </div>
      <div class="field"><label class="field-label" for="s_day">Renewal day</label><input id="s_day" type="number" min="1" max="30" value="${Math.min(30, getState().day + 30)}"/></div>`,
    confirmLabel: "Add",
    onConfirm: () => {
      const nameInput = document.getElementById("s_name") as HTMLInputElement | null;
      const amountInput = document.getElementById("s_amount") as HTMLInputElement | null;
      const cycleSelect = document.getElementById("s_cycle") as HTMLSelectElement | null;
      const dayInput = document.getElementById("s_day") as HTMLInputElement | null;

      const name = nameInput?.value || "Subscription";
      const amount = Number(amountInput?.value);
      const cycle = (cycleSelect?.value as "monthly" | "annual") || "monthly";
      const renewalDay = Number(dayInput?.value) || getState().day + 30;

      if (!(amount > 0)) {
        toast("Enter a positive amount", "warn");
        return false;
      }
      addSubscription({ name, amount, cycle, renewalDay });
      toast("Subscription added.");
      return true;
    }
  });
}
