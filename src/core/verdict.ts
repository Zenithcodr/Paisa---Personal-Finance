import type { DerivedMetrics, SimulatorVerdict } from "../types/metrics";

export function verdict(current: DerivedMetrics, projected: DerivedMetrics): SimulatorVerdict {
  const dBalance = projected.balance - current.balance;
  const dRisk = projected.riskScore - current.riskScore;
  const dHealth = projected.healthScore - current.healthScore;
  const dExpected = projected.forecast.expected - current.forecast.expected;

  if (dBalance >= 0 && dHealth >= 0 && dExpected > 0 && dRisk <= -1) {
    return {
      label: "smart",
      text: "Improves balance, health, and end-of-period forecast. Green light."
    };
  }
  if (dBalance < -800 || dRisk > 12 || dExpected < -1500 || dHealth <= -10) {
    return {
      label: "avoid",
      text: "Material damage to balance / forecast; risk rises sharply. Consider alternatives."
    };
  }
  if (dRisk > 4 || dExpected < -400 || dHealth < 0) {
    return {
      label: "caution",
      text: "Spendable now but tightens future days and increases risk. Proceed with a plan."
    };
  }
  return {
    label: "smart",
    text: "Affordable under your current trajectory. Still, watch the after-effect on allowance."
  };
}
