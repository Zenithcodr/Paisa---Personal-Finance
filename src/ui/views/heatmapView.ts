import { dailySpend } from "../../core/helpers";
import type { AppState } from "../../types/state";

export function renderHeatmapView(state: AppState): void {
  const heatmap = document.getElementById("heatmap");
  if (!heatmap) return;

  const days = dailySpend(state);
  const maxDay = Math.max(1, ...days);

  heatmap.innerHTML = days
    .map((amt, i) => {
      const lvl =
        amt === 0
          ? 0
          : amt > maxDay * 0.66
            ? 4
            : amt > maxDay * 0.33
              ? 3
              : amt > maxDay * 0.12
                ? 2
                : 1;
      const isToday = i + 1 === state.day;
      return `<div class="heat-cell heat-${lvl} ${isToday ? "today" : ""}" title="Day ${i + 1}: ₹${Math.round(amt)}" aria-label="Day ${i + 1}: ${Math.round(amt)} rupees spent">${i + 1}</div>`;
    })
    .join("");
}
