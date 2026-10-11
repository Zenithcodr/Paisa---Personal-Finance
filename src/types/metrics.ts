export interface RiskFactor {
  name: string;
  value: number;
  weight: number;
  contribution: number;
}

export interface HealthFactor {
  name: string;
  value: number;
  weight: number;
}

export interface GoalProjection {
  id: string;
  label: string;
  target: number;
  saved: number;
  remaining: number;
  requiredPerDay: number;
  perDay: number;
  status: "reachable" | "at-risk" | "unreachable" | "done";
}

export interface ForecastScenarios {
  best: number;
  expected: number;
  worst: number;
}

export interface SimulatorVerdict {
  label: "smart" | "caution" | "avoid";
  text: string;
}

export interface DerivedMetrics {
  day: number;
  daysLeft: number;
  balance: number;
  remainingBudget: number;
  dailyAllowance: number;
  spent: number;
  incomeSoFar: number;
  saved: number;
  expectedSpendPerDay: number;
  sustainableSoFar: number;
  subMonthly: number;
  subAnnual: number;
  upcomingOutflow: number;
  totalDebt: number;
  dailyRepay: number;
  savingsRate: number;
  subscriptionDiscipline: number;
  commitmentCoverage: number;
  forecastSurplus: number;
  allowanceBuffer: number;
  goalProgress: number;
  goalProjections: GoalProjection[];
  riskScore: number;
  riskBand: "low" | "medium" | "high";
  riskFactors: RiskFactor[];
  healthScore: number;
  grade: "A+" | "A" | "B" | "C" | "D";
  healthFactors: HealthFactor[];
  forecast: ForecastScenarios;
}

export interface CoachingInsight {
  severity: "high" | "med" | "low";
  icon: string;
  title: string;
  body: string;
}
