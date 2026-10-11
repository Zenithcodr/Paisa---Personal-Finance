import { useAppState } from "../../hooks/useStore";
import { resetJourney, loadDemo } from "../../core/store";
import { makeInitialState, makeDemoState } from "../../core/seed";
import { Button } from "../ui/Button";

export function Header() {
  const state = useAppState();

  const onReset = () => {
    if (window.confirm("Reset your 30-day journey back to Day 1 with ₹10,000?")) {
      resetJourney(makeInitialState);
    }
  };

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          ₹
        </span>
        <div className="brand-text">
          <span className="brand-name">Paisa</span>
          <span className="brand-sub">your 30-day money coach</span>
        </div>
      </div>
      <div className="topbar-actions">
        <span className="day-pill" aria-label="Current day">
          Day {state.day} / 30
        </span>
        <Button variant="ghost" onClick={() => loadDemo(makeDemoState)}>
          Load demo
        </Button>
        <Button variant="ghost" className="danger" onClick={onReset}>
          Reset
        </Button>
      </div>
    </header>
  );
}
