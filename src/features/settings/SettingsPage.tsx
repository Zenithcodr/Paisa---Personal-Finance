import { useAppState } from "../../hooks/useStore";
import { resetJourney, loadDemo, advanceDay } from "../../core/store";
import { makeInitialState, makeDemoState } from "../../core/seed";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export function SettingsPage() {
  const state = useAppState();

  const onReset = () => {
    if (window.confirm("Reset your 30-day journey back to Day 1 with ₹10,000?")) {
      resetJourney(makeInitialState);
    }
  };

  return (
    <Card id="settings" kicker="Settings" title="Manage your journey" ariaLabel="Settings">
      <p className="muted small">
        You're on Day {state.day} of 30. Your data lives locally in your browser — no backend, no
        tracking.
      </p>
      <div className="sim-actions" style={{ flexWrap: "wrap", gap: 8 }}>
        <Button variant="primary" onClick={() => advanceDay()} disabled={state.day >= 30}>
          Advance to next day
        </Button>
        <Button onClick={() => advanceDay(30)} disabled={state.day >= 30}>
          Jump to Day 30
        </Button>
        <Button onClick={() => loadDemo(makeDemoState)}>Load demo scenario</Button>
        <Button variant="ghost" className="danger" onClick={onReset}>
          Reset journey
        </Button>
      </div>
    </Card>
  );
}
