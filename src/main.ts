import { init, subscribe, getState, resetJourney, loadDemo } from "./core/store";
import { makeInitialState, makeDemoState } from "./core/seed";
import { selectDerived } from "./core/selectors";
import { initModalListeners, openModal } from "./ui/modal";
import { toast } from "./ui/toast";
import { initHero, renderHero } from "./ui/hero";
import { initSimulator, renderSimulator } from "./ui/simulator";
import { renderTransactions } from "./ui/trackers/transactions";
import { initSubscriptions, renderSubscriptions } from "./ui/trackers/subscriptions";
import { initCommitments, renderCommitments } from "./ui/trackers/commitments";
import { initIncome, renderIncome } from "./ui/trackers/income";
import { initGoals, renderGoals } from "./ui/trackers/goals";
import { initDebts, renderDebts } from "./ui/trackers/debts";
import { renderInsightsView } from "./ui/views/insightsView";
import { renderForecastView } from "./ui/views/forecastView";
import { renderCategoryView } from "./ui/views/categoryView";
import { renderHeatmapView } from "./ui/views/heatmapView";
import type { AppState } from "./types/state";

// Initialize store from localStorage or initial state
init();

// Initialize modal listener
initModalListeners();

// Initialize component event wiring
initHero();
initSimulator();
initSubscriptions();
initCommitments();
initIncome();
initGoals();
initDebts();

// Wire topbar actions
const resetBtn = document.getElementById("resetBtn");
if (resetBtn) {
  resetBtn.onclick = () => {
    openModal({
      title: "Reset your 30-day journey?",
      body: "<p>This wipes transactions, subscriptions, commitments, debts, and goals and sends you back to Day 1 with ₹10,000.</p>",
      confirmLabel: "Reset",
      onConfirm: () => {
        resetJourney(makeInitialState);
        toast("Journey reset. Fresh start!");
      }
    });
  };
}

const loadDemoBtn = document.getElementById("loadDemoBtn");
if (loadDemoBtn) {
  loadDemoBtn.onclick = () => {
    openModal({
      title: "Load demo scenario?",
      body: "<p>Replaces your current state with a realistic Day 15 — part-time income, subscriptions, an active goal, and a recent bike repair.</p>",
      confirmLabel: "Load demo",
      onConfirm: () => {
        loadDemo(makeDemoState);
        toast("Demo Day 15 loaded.");
      }
    });
  };
}

// Master reactive render loop
function render(state: AppState): void {
  const d = selectDerived(state);

  renderHero(state, d);
  renderSimulator(state, d);
  renderForecastView(state, d);
  renderCategoryView(state);
  renderTransactions(state);
  renderHeatmapView(state);
  renderSubscriptions(state, d);
  renderCommitments(state);
  renderIncome(state);
  renderGoals(state, d);
  renderDebts(state);
  renderInsightsView(state, d);
}

// Rail navigation active link on scroll
const sections = document.querySelectorAll<HTMLElement>("[id]");
const railLinks = document.querySelectorAll<HTMLAnchorElement>(".rail-link");
const observer = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        railLinks.forEach((l) => l.classList.toggle("active", l.dataset.jump === e.target.id));
      }
    }
  },
  { rootMargin: "-30% 0px -55% 0px" }
);

sections.forEach((s) => {
  if (s.id) observer.observe(s);
});

// Subscribe render loop to reactive store
subscribe(render);
render(getState());

// Onboarding hint on first run
setTimeout(() => {
  try {
    const ONBOARD_KEY = "paisa_onboarded";
    if (localStorage.getItem(ONBOARD_KEY)) return;
    const s = getState();
    const isFresh =
      s.transactions.length === 0 && s.subscriptions.length === 0 && s.commitments.length === 0;
    if (isFresh) {
      toast("Tip: try the Simulate panel to preview a decision before committing.", "");
    }
    localStorage.setItem(ONBOARD_KEY, "yes");
  } catch {
    // ignore
  }
}, 600);
