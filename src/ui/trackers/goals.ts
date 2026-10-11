import { inrPlain, escapeHtml } from "../../core/constants";
import { openModal } from "../modal";
import { toast } from "../toast";
import { addGoal, contributeGoal, removeGoal } from "../../core/store";
import type { AppState } from "../../types/state";
import type { DerivedMetrics } from "../../types/metrics";

export function initGoals(): void {
  const addGoalBtn = document.getElementById("addGoalBtn");
  if (addGoalBtn) addGoalBtn.onclick = () => openGoalModal();
}

export function renderGoals(state: AppState, d: DerivedMetrics): void {
  const goalsList = document.getElementById("goalsList");
  if (!goalsList) return;

  if (state.goals.length === 0) {
    goalsList.innerHTML = `<div class="empty">No goals yet. Add one to start tracking.</div>`;
    return;
  }

  goalsList.innerHTML = state.goals
    .map((g) => {
      const gp = d.goalProjections.find((p) => p.id === g.id) || {
        status: "reachable" as const,
        requiredPerDay: 0,
        perDay: 0,
        remaining: 0
      };
      const pct = Math.min(100, (g.saved / g.target) * 100);
      const tone =
        gp.status === "reachable"
          ? "reachable"
          : gp.status === "at-risk"
            ? "at-risk"
            : gp.status === "done"
              ? "reachable"
              : "unreachable";
      const need =
        gp.remaining > 0
          ? `Need <strong>₹${Math.round(gp.requiredPerDay)}/day</strong> · on track for ₹${Math.round(gp.perDay)}/day`
          : "Goal reached 🎉";
      return `
        <div class="goal">
          <h4>${escapeHtml(g.label)}</h4>
          <div class="progress" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><i style="--w:${pct}%; width:${pct}%"></i></div>
          <div class="meta"><span>₹${inrPlain(g.saved)} / ₹${inrPlain(g.target)}</span><span>Day ${g.targetDay}</span></div>
          <div class="eta ${tone}">${need}</div>
          <div class="actions-cell">
            <button class="icon-btn" data-contrib="${g.id}" aria-label="Contribute 100 rupees to ${escapeHtml(g.label)}">+ ₹100</button>
            <button class="icon-btn" data-contrib-big="${g.id}" aria-label="Contribute 500 rupees to ${escapeHtml(g.label)}">+ ₹500</button>
            <button class="icon-btn danger" data-rm-g="${g.id}" aria-label="Delete goal ${escapeHtml(g.label)}">Delete</button>
          </div>
        </div>`;
    })
    .join("");

  goalsList.querySelectorAll<HTMLButtonElement>("[data-contrib]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.contrib;
      if (id) {
        contributeGoal(id, 100);
        toast("Saved ₹100 toward goal.");
      }
    };
  });

  goalsList.querySelectorAll<HTMLButtonElement>("[data-contrib-big]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.contribBig;
      if (id) {
        contributeGoal(id, 500);
        toast("Saved ₹500 toward goal.");
      }
    };
  });

  goalsList.querySelectorAll<HTMLButtonElement>("[data-rm-g]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.rmG;
      if (id) removeGoal(id);
    };
  });
}

function openGoalModal(): void {
  openModal({
    title: "New savings goal",
    body: `
      <div class="field"><label class="field-label" for="g_label">Label</label><input id="g_label" type="text" value="Trip to Goa"/></div>
      <div class="field"><label class="field-label" for="g_target">Target (₹)</label><input id="g_target" type="number" min="0"/></div>
      <div class="field"><label class="field-label" for="g_day">Target day</label><input id="g_day" type="number" min="1" max="30" value="30"/></div>`,
    confirmLabel: "Add",
    onConfirm: () => {
      const labelInput = document.getElementById("g_label") as HTMLInputElement | null;
      const targetInput = document.getElementById("g_target") as HTMLInputElement | null;
      const dayInput = document.getElementById("g_day") as HTMLInputElement | null;

      const label = labelInput?.value || "Goal";
      const target = Number(targetInput?.value);
      const targetDay = Number(dayInput?.value) || 30;

      if (!(target > 0)) {
        toast("Enter a positive target", "warn");
        return false;
      }
      addGoal({ label, target, targetDay });
      toast("Savings goal added.");
      return true;
    }
  });
}
