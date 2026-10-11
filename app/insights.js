// Generates prioritized insights from derived metrics.
export function buildInsights(derived, state) {
  const out = [];
  const day = derived.day;
  const balance = derived.balance;

  // Overspend pace
  if (derived.expectedSpendPerDay > 0 && derived.sustainableSoFar > 0) {
    const sustainablePerDay = derived.sustainableSoFar / Math.max(1, day);
    if (derived.expectedSpendPerDay > sustainablePerDay * 1.15) {
      const extra = Math.round((derived.expectedSpendPerDay - sustainablePerDay) * (30 - day));
      out.push({
        severity: "high",
        icon: "🔥",
        title: "Spending is outpacing budget",
        body: "At ₹" + Math.round(derived.expectedSpendPerDay) + "/day you'll run out by Day " + projectRunOut(derived) + ". Cap daily spend at ₹" + Math.round(sustainablePerDay) + " to recover, freeing roughly ₹" + extra + "."
      });
    }
  }
  // Buffer shortfall
  if (balance < 1000 && balance > 0) {
    out.push({
      severity: "med",
      icon: "🛟",
      title: "Your emergency buffer is thin",
      body: "You're holding <strong>₹" + Math.round(balance) + "</strong>. A single ₹1,500 surprise could mean an overdraft or a forced loan."
    });
  } else if (balance <= 0) {
    out.push({
      severity: "high",
      icon: "⚠️",
      title: "Balance is overdrawn",
      body: "Any further spend worsens your run-out date. Pause discretionary spending and consider canceling subscriptions or skipping planned expenses."
    });
  }
  // Subscriptions
  if (derived.subMonthly >= 250) {
    const annual = derived.subAnnual;
    out.push({
      severity: "med",
      icon: "📺",
      title: "Subscriptions are a meaningful drag",
      body: "₹" + derived.subMonthly + "/mo across subscriptions. Canceling one ₹119/mo saves ₹1,428/year and moves your goal from at-risk to on-track."
    });
  }
  // Goals at-risk
  const atRisk = derived.goalProjections.filter(g => g.status === "at-risk" || g.status === "unreachable");
  if (atRisk.length) {
    out.push({
      severity: "med",
      icon: "🎯",
      title: "Some goals need attention",
      body: atRisk.map(g => "<strong>" + g.label + "</strong> needs ₹" + Math.round(g.requiredPerDay) + "/day but you're on track for ₹" + Math.round(g.perDay) + "/day").join("; ")
    });
  }
  // Commitment pressure
  if (derived.upcomingOutflow > derived.balance * 0.6) {
    out.push({
      severity: "med",
      icon: "📅",
      title: "Big commitments coming up",
      body: "₹" + derived.upcomingOutflow + " is due in the next week against a ₹" + Math.round(derived.balance) + " balance — that's " + Math.round((derived.upcomingOutflow / Math.max(1, derived.balance)) * 100) + "% of what you have."
    });
  }
  // Good news
  if (derived.goalProjections.some(g => g.status === "reachable")) {
    out.push({
      severity: "low",
      icon: "✨",
      title: "Your savings pace is working",
      body: "Your goal <strong>" + derived.goalProjections.find(g => g.status === "reachable").label + "</strong> is reachable at the current rate."
    });
  }
  // Loan present
  if (derived.totalDebt > 0) {
    out.push({
      severity: "med",
      icon: "💳",
      title: "Loan repayment is in play",
      body: "You're paying ₹" + derived.dailyRepay + "/day across loans. A one-time extra repayment of ₹500 would shorten your loan."
    });
  }

  return out;
}

function projectRunOut(d) {
  if (d.expectedSpendPerDay <= 0) return "30+";
  const remaining = d.balance;
  if (remaining <= 0) return d.day;
  const days = Math.floor(remaining / d.expectedSpendPerDay);
  return Math.min(30, Math.max(d.day, d.day + days));
}
