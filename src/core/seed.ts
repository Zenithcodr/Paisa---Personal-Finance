import { uid } from "./constants";
import type { AppState, Category } from "../types/state";

export function makeInitialState(): AppState {
  const now = new Date().toISOString();
  return {
    version: "1",
    startedAt: now,
    day: 1,
    budget: 10000,
    allowanceBuffer: 0,
    income: { recurring: [], oneTime: [] },
    transactions: [],
    commitments: [],
    subscriptions: [],
    goals: [],
    unexpected: [],
    debts: [],
    settings: { reducedMotion: false },
    appliedLog: {
      commitmentsByDay: {},
      subscriptionsByDay: {},
      incomeOneTimeById: {},
      debtRepayByDay: {}
    }
  };
}

export function makeDemoState(): AppState {
  const s = makeInitialState();
  s.day = 15;
  s.startedAt = new Date(Date.now() - 14 * 86400000).toISOString();

  s.income = {
    recurring: [
      { id: uid(), label: "Part-time stipend", amount: 2500, cadence: "monthly", startDay: 1 },
      { id: uid(), label: "Pocket money", amount: 500, cadence: "weekly", startDay: 7 }
    ],
    oneTime: [{ id: uid(), label: "Birthday gift", amount: 1000, day: 4, applied: true }]
  };

  s.commitments = [
    {
      id: uid(),
      label: "Phone EMI",
      amount: 600,
      frequency: "monthly",
      nextDueDay: 18,
      active: true
    },
    { id: uid(), label: "Gym", amount: 350, frequency: "monthly", nextDueDay: 22, active: true }
  ];

  s.subscriptions = [
    { id: uid(), name: "Spotify", amount: 119, cycle: "monthly", renewalDay: 12, active: true },
    { id: uid(), name: "Netflix", amount: 199, cycle: "monthly", renewalDay: 20, active: true }
  ];

  s.goals = [{ id: uid(), label: "Trip to Goa", target: 3000, targetDay: 30, saved: 850 }];

  s.unexpected = [{ id: uid(), label: "Bike repair", amount: 850, day: 8 }];

  s.debts = [];

  // realistic 14-day spending history (Day 1..14)
  const seedSpend: Array<[number, Category, number, string]> = [
    [1, "Food", 180, "Breakfast rolls + chai"],
    [1, "Transport", 60, "Auto"],
    [2, "Food", 220, "Lunch"],
    [2, "Entertainment", 200, "Movie ticket"],
    [3, "Transport", 90, "Metro top-up"],
    [3, "Food", 350, "Groceries"],
    [4, "Shopping", 499, "T-shirt"],
    [5, "Food", 250, "Cafe with friends"],
    [6, "Transport", 40, "Bus pass"],
    [7, "Bills", 799, "Recharge + wifi share"],
    [8, "Health", 320, "Pharmacy"],
    [8, "Misc", 850, "Bike repair"],
    [9, "Food", 180, "Breakfast"],
    [9, "Entertainment", 350, "Concert"],
    [10, "Food", 240, "Lunch"],
    [11, "Shopping", 1200, "Sneakers"],
    [11, "Transport", 60, "Auto"],
    [12, "Food", 200, "Snacks"],
    [13, "Food", 380, "Groceries"],
    [14, "Entertainment", 450, "Escape room"]
  ];

  for (const [d, cat, amt, note] of seedSpend) {
    s.transactions.push({
      id: uid(),
      day: d,
      amount: amt,
      category: cat,
      note,
      ts: Date.now() - (15 - d) * 86400000,
      source: "manual"
    });
  }

  // Gift income
  s.transactions.push({
    id: uid(),
    day: 4,
    amount: -1000,
    category: "Income",
    note: "Birthday gift",
    ts: Date.now() - 11 * 86400000,
    source: "income"
  });
  // Recurring income: pocket money Day 7
  s.transactions.push({
    id: uid(),
    day: 7,
    amount: -500,
    category: "Income",
    note: "Pocket money",
    ts: Date.now() - 8 * 86400000,
    source: "income"
  });
  // Part-time stipend hits on Day 1
  s.transactions.push({
    id: uid(),
    day: 1,
    amount: -2500,
    category: "Income",
    note: "Part-time stipend",
    ts: Date.now() - 14 * 86400000,
    source: "income"
  });

  // Subscription renewal
  s.transactions.push({
    id: uid(),
    day: 12,
    amount: 119,
    category: "Subscriptions",
    note: "Spotify",
    ts: Date.now() - 3 * 86400000,
    source: "subscription"
  });

  // Saved 850 toward goal
  s.transactions.push({
    id: uid(),
    day: 7,
    amount: 850,
    category: "Savings",
    note: "Trip to Goa — saved",
    ts: Date.now() - 8 * 86400000,
    source: "goal"
  });

  s.allowanceBuffer = 850;

  return s;
}
