import { useAppState, useDerived } from "../../hooks/useStore";
import { buildInsights } from "../../core/insights";
import { Card } from "../../components/ui/Card";

/** Strips any inline HTML tags so coaching copy renders as safe plain text. */
function toText(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

const SEV_LABEL: Record<string, string> = { high: "URGENT", med: "WATCH", low: "GOOD" };

export function InsightsPage() {
  const state = useAppState();
  const d = useDerived();
  const insights = buildInsights(d, state);

  return (
    <Card id="insights" kicker="Coaching" title="What your numbers are saying" ariaLabel="Coaching insights">
      <ul className="insights">
        {insights.length === 0 ? (
          <li className="insight low">
            <span className="ico" aria-hidden="true">
              ✨
            </span>
            <div className="body">
              You're tracking clean. Add subscriptions or commitments to see more coaching.
            </div>
            <span className="sev">GOOD</span>
          </li>
        ) : (
          insights.map((i, idx) => (
            <li className={"insight " + i.severity} key={idx}>
              <span className="ico" aria-hidden="true">
                {i.icon}
              </span>
              <div className="body">
                <strong>{i.title}.</strong> {toText(i.body)}
              </div>
              <span className="sev">{SEV_LABEL[i.severity] ?? "GOOD"}</span>
            </li>
          ))
        )}
      </ul>
    </Card>
  );
}
