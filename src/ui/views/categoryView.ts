import { inrPlain, CATEGORY_ICONS } from "../../core/constants";
import { drawCategory } from "../../core/charts";
import { categorySpending, buildCategoryLegend } from "../../core/helpers";
import type { AppState, Category } from "../../types/state";

export function renderCategoryView(state: AppState): void {
  const categoryCanvas = document.getElementById("categoryCanvas") as HTMLCanvasElement | null;
  const categoryLegend = document.getElementById("categoryLegend");

  const cat = categorySpending(state);
  const legend = buildCategoryLegend(cat);
  if (categoryCanvas) {
    const topSummary = legend
      .slice(0, 3)
      .map(([k, v]) => `${k} ₹${inrPlain(v)}`)
      .join(", ");
    categoryCanvas.setAttribute(
      "aria-label",
      topSummary ? `Spending by category: ${topSummary}` : "Spending by category: No expenses yet"
    );
    drawCategory(categoryCanvas, cat);
  }

  if (!categoryLegend) return;
  if (legend.length === 0) {
    categoryLegend.innerHTML = `<li class="muted small">Log an expense to see categories.</li>`;
    return;
  }

  const palette = ["#8b5cf6", "#f472b6", "#fbbf24", "#2dd4bf", "#60a5fa", "#ef4444"];
  categoryLegend.innerHTML = legend
    .map(([k, v], i) => {
      const icon = CATEGORY_ICONS[k as Category] || "•";
      const color = palette[i % palette.length] || "#8b5cf6";
      return `
      <li>
        <span class="swatch" style="background:${color}" aria-hidden="true"></span>
        <span class="name"><span aria-hidden="true">${icon}</span> ${k}</span>
        <span class="num">₹${inrPlain(v)}</span>
      </li>`;
    })
    .join("");
}
