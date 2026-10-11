import { inrPlain } from "../../core/constants";
import { drawBurndownBands } from "../../core/charts";
import { historicalBalance, forecastBands } from "../../core/helpers";
import type { AppState } from "../../types/state";
import type { DerivedMetrics } from "../../types/metrics";

export function renderForecastView(state: AppState, d: DerivedMetrics): void {
  const forecastBest = document.getElementById("forecastBest");
  const forecastExpected = document.getElementById("forecastExpected");
  const forecastWorst = document.getElementById("forecastWorst");
  const forecastBestNote = document.getElementById("forecastBestNote");
  const forecastExpectedNote = document.getElementById("forecastExpectedNote");
  const forecastWorstNote = document.getElementById("forecastWorstNote");
  const forecastCanvas = document.getElementById("forecastCanvas") as HTMLCanvasElement | null;
  const burndownCanvas = document.getElementById("burndownCanvas") as HTMLCanvasElement | null;

  if (forecastBest) forecastBest.textContent = inrPlain(d.forecast.best);
  if (forecastExpected) forecastExpected.textContent = inrPlain(d.forecast.expected);
  if (forecastWorst) forecastWorst.textContent = inrPlain(d.forecast.worst);

  if (forecastBestNote) {
    forecastBestNote.textContent =
      d.forecast.best >= 0 ? "Surplus to enjoy" : "Best realistic surplus";
  }
  if (forecastExpectedNote) {
    forecastExpectedNote.textContent =
      d.forecast.expected >= 0 ? "End-of-period cash" : "Projected deficit";
  }
  if (forecastWorstNote) {
    forecastWorstNote.textContent =
      d.forecast.worst >= 0 ? "Worst-case surplus" : "Worst-case shortfall";
  }

  const hist = historicalBalance(state);
  const bands = forecastBands(state);

  if (forecastCanvas) {
    forecastCanvas.setAttribute(
      "aria-label",
      `30-day projection chart. Best case ₹${inrPlain(d.forecast.best)}, Expected ₹${inrPlain(d.forecast.expected)}, Worst case ₹${inrPlain(d.forecast.worst)}`
    );
    drawBurndownBands(forecastCanvas, bands.expectedLine, {
      bestLine: bands.bestLine,
      worstLine: bands.worstLine
    });
  }

  if (burndownCanvas) {
    burndownCanvas.setAttribute(
      "aria-label",
      `Balance burndown over 30 days. Current balance ₹${inrPlain(d.balance)}, projected end balance ₹${inrPlain(d.forecast.expected)}`
    );
    drawBurndownBands(burndownCanvas, hist, {
      bestLine: bands.bestLine,
      worstLine: bands.worstLine
    });
  }
}
