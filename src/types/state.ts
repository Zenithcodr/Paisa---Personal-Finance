export type Category =
  | "Food"
  | "Transport"
  | "Shopping"
  | "Entertainment"
  | "Bills"
  | "Health"
  | "Misc"
  | "Income"
  | "Subscriptions"
  | "Savings"
  | "Loan"
  | "Unexpected";

export interface Transaction {
  id: string;
  day: number;
  amount: number; // positive = expense, negative = income
  category: Category;
  note: string;
  ts: number;
  source: "manual" | "income" | "subscription" | "commitment" | "goal" | "loan" | "unexpected";
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  cycle: "monthly" | "annual";
  renewalDay: number;
  active: boolean;
}

export interface Commitment {
  id: string;
  label: string;
  amount: number;
  frequency: "monthly" | "weekly";
  nextDueDay: number;
  active: boolean;
}

export interface RecurringIncome {
  id: string;
  label: string;
  amount: number;
  cadence: "monthly" | "weekly";
  startDay: number;
}

export interface OneTimeIncome {
  id: string;
  label: string;
  amount: number;
  day: number;
  applied: boolean;
}

export interface IncomeState {
  recurring: RecurringIncome[];
  oneTime: OneTimeIncome[];
}

export interface SavingsGoal {
  id: string;
  label: string;
  target: number;
  targetDay: number;
  saved: number;
}

export interface UnexpectedExpense {
  id: string;
  label: string;
  amount: number;
  day: number;
}

export interface Debt {
  id: string;
  label: string;
  principal: number;
  remaining: number;
  apr: number;
  repayPerDay: number;
  takenDay: number;
}

export interface AppliedLog {
  commitmentsByDay: Record<string, Record<string, boolean>>;
  subscriptionsByDay: Record<string, Record<string, boolean>>;
  incomeOneTimeById: Record<string, boolean>;
  debtRepayByDay: Record<string, Record<string, boolean>>;
}

export interface AppSettings {
  reducedMotion: boolean;
}

export interface AppState {
  version: string;
  startedAt: string;
  day: number;
  budget: number;
  allowanceBuffer: number;
  income: IncomeState;
  transactions: Transaction[];
  commitments: Commitment[];
  subscriptions: Subscription[];
  goals: SavingsGoal[];
  unexpected: UnexpectedExpense[];
  debts: Debt[];
  settings: AppSettings;
  appliedLog: AppliedLog;
}
