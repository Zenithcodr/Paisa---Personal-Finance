import { useAppState, useDerived } from "../../hooks/useStore";
import { advanceDay } from "../../core/store";
import { inrPlain, CATEGORY_ICONS } from "../../core/constants";
import type { Category } from "../../types/state";
import {
  historicalBalance,
  forecastBands,
  categorySpending,
  buildCategoryLegend,
  dailySpend
} from "../../core/helpers";
import { drawBurndownBands, drawCategory } from "../../core/charts";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Canvas } from "../../components/charts/Canvas";

const PALETTE = ["#8b5cf6", "#f472b6", "#fbbf24", "#2dd4bf", "#60a5fa", "#ef4444"];

export function ForecastPage() {
  const state = useAppState();
  const d = useDerived();

  const hist = historicalBalance(state);
  const bands = forecastBands(state);
  const catMap = categorySpending(state);
  const legend = buildCategoryLegend(catMap);
  const days = dailySpend(state);
  const maxDay = Math.max(1, ...days);

  return (
    <>
      <Card id="forecast" kicker="30-day forecast" title="Best · Expected · Worst" ariaLabel="Monthly forecast">
        <div className="forecast-grid">
          <div className="forecast-cell best">
            <span className="muted small">Best case</span>
            <span className="forecast-num">₹{inrPlain(d.forecast.best)}</span>
            <span className="muted small">{d.forecast.best >= 0 ? "Surplus to enjoy" : "Best-case shortfall"}</span>
          </div>
          <div className="forecast-cell expected">
            <span className="muted small">Expected</span>
            <span className="forecast-num">₹{inrPlain(d.forecast.expected)}</span>
            <span className="muted small">{d.forecast.expected >= 0 ? "End-of-period cash" : "Projected deficit"}</span>
          </div>
          <div className="forecast-cell worst">
            <span className="muted small">Worst case</span>
            <span className="forecast-num">₹{inrPlain(d.forecast.worst)}</span>
            <span className="muted small">{d.forecast.worst >= 0 ? "Worst-case surplus" : "Worst-case shortfall"}</span>
          </div>
        </div>
        <Canvas
          draw={(c) =>
            drawBurndownBands(c, hist, { bestLine: bands.bestLine, worstLine: bands.worstLine })
          }
          width={640}
          height={200}
          ariaLabel={`Balance burndown. Current ₹${inrPlain(d.balance)}, projected end ₹${inrPlain(d.forecast.expected)}`}
        />
        <div className="sim-actions">
          <Button variant="ghost" onClick={() => advanceDay()} disabled={state.day >= 30}>
            Advance to next day
          </Button>
        </div>
      </Card>

      <section className="grid-two">
        <Card kicker="Categories" title="Where your money goes" ariaLabel="Spending by category">
          <div className="donut-wrap">
            <Canvas
              draw={(c) => drawCategory(c, catMap)}
              width={240}
              height={240}
              ariaLabel={
                legend.length
                  ? "Spending by category: " + legend.map(([k, v]) => `${k} ₹${inrPlain(v)}`).join(", ")
                  : "Spending by category: none yet"
              }
            />
            <ul className="legend-list">
              {legend.length === 0 ? (
                <li className="muted small">Log an expense to see categories.</li>
              ) : (
                legend.map(([k, v], i) => (
                  <li key={k}>
                    <span
                      className="swatch"
                      style={{ background: PALETTE[i % PALETTE.length] }}
                      aria-hidden="true"
                    />
                    <span className="name">
                      <span aria-hidden="true">{CATEGORY_ICONS[k as Category] || "•"}</span> {k}
                    </span>
                    <span className="num">₹{inrPlain(v)}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </Card>

        <Card kicker="Heatmap" title="Daily spending intensity" ariaLabel="Daily spending heatmap">
          <div className="heatmap">
            {days.map((amt, i) => {
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
              const today = i + 1 === state.day;
              return (
                <div
                  className={`heat-cell heat-${lvl}${today ? " today" : ""}`}
                  key={i}
                  aria-label={`Day ${i + 1}: ${Math.round(amt)} rupees spent`}
                >
                  {i + 1}
                </div>
              );
            })}
          </div>
        </Card>
      </section>
    </>
  );
}
