import { test, expect } from "vitest";
import { makeInitialState, makeDemoState } from "../src/core/seed";
import { isValidAppState } from "../src/core/storage";
import { selectDerived } from "../src/core/selectors";
import { verdict } from "../src/core/verdict";
import { escapeHtml, clamp, safeDiv } from "../src/core/constants";
import type { AppState } from "../src/types/state";

test("Core Constants & Sanitization", () => {
  expect(escapeHtml('<script>alert("xss")</script>')).toBe(
    "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
  );
  expect(escapeHtml("& ' \" < >")).toBe("&amp; &#39; &quot; &lt; &gt;");
  expect(clamp(15, 0, 10)).toBe(10);
  expect(clamp(-5, 0, 10)).toBe(0);
  expect(safeDiv(10, 0)).toBe(0);
  expect(safeDiv(10, 2)).toBe(5);
});

test("Seed States & Schema Validation", () => {
  const initial = makeInitialState();
  expect(initial.budget).toBe(10000);
  expect(initial.day).toBe(1);
  expect(isValidAppState(initial)).toBe(true);

  const demo = makeDemoState();
  expect(demo.day).toBe(15);
  expect(demo.transactions.length).toBeGreaterThan(0);
  expect(demo.subscriptions.length).toBeGreaterThan(0);
  expect(isValidAppState(demo)).toBe(true);

  // Invalid schemas should be rejected
  expect(isValidAppState(null)).toBe(false);
  expect(isValidAppState({})).toBe(false);
  expect(isValidAppState({ version: 1, budget: "not-a-number" })).toBe(false);
  expect(isValidAppState({ version: 1, budget: 10000, day: 0, transactions: "invalid" })).toBe(
    false
  );
});

test("Selector Derived Metrics Engine", () => {
  const state = makeDemoState();
  const derived = selectDerived(state);

  expect(typeof derived.balance).toBe("number");
  expect(typeof derived.dailyAllowance).toBe("number");
  expect(derived.riskScore).toBeGreaterThanOrEqual(0);
  expect(derived.riskScore).toBeLessThanOrEqual(100);
  expect(["low", "medium", "high"]).toContain(derived.riskBand);
  expect(["A+", "A", "B", "C", "D", "F"]).toContain(derived.grade);
  expect(derived.forecast.expected).toBeDefined();
  expect(derived.forecast.best).toBeGreaterThanOrEqual(derived.forecast.worst);
});

test("Simulator Decision Verdict Engine", () => {
  const state = makeDemoState();
  const cur = selectDerived(state);

  // Beneficial change
  const betterState: AppState = {
    ...state,
    transactions: state.transactions.filter((t) => t.id !== state.transactions[0]?.id)
  };
  const betterDerived = selectDerived(betterState);
  const vBetter = verdict(cur, betterDerived);
  expect(["smart", "caution"]).toContain(vBetter.label);

  // Harmful change (heavy deficit)
  const brokenState: AppState = {
    ...state,
    transactions: [
      ...state.transactions,
      {
        id: "huge",
        day: state.day,
        amount: 25000,
        category: "Misc",
        note: "Huge expense",
        ts: Date.now(),
        source: "manual"
      }
    ]
  };
  const brokenDerived = selectDerived(brokenState);
  const vBroken = verdict(cur, brokenDerived);
  expect(vBroken.label).toBe("avoid");
});
