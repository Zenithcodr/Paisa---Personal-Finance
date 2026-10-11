import { buildInsights } from "../../core/insights";
import type { AppState } from "../../types/state";
import type { DerivedMetrics } from "../../types/metrics";

export function renderInsightsView(state: AppState, d: DerivedMetrics): void {
  const insightsList = document.getElementById("insightsList");
  if (!insightsList) return;

  const insights = buildInsights(d, state);
  if (insights.length === 0) {
    insightsList.innerHTML = `<li class="insight low"><span class="ico" aria-hidden="true">✨</span><div class="body">You're tracking clean. Add subscriptions or commitments to see more coaching.</div><span class="sev">GOOD</span></li>`;
    return;
  }

  insightsList.innerHTML = insights
    .map(
      (i) => `
    <li class="insight ${i.severity}">
      <span class="ico" aria-hidden="true">${i.icon}</span>
      <div class="body"><strong>${i.title}.</strong> ${i.body}</div>
      <span class="sev">${i.severity === "high" ? "URGENT" : i.severity === "med" ? "WATCH" : "GOOD"}</span>
    </li>`
    )
    .join("");
}
