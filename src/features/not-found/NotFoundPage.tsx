import { Link } from "react-router-dom";
import { Card } from "../../components/ui/Card";

export function NotFoundPage() {
  return (
    <Card kicker="404" title="Page not found" ariaLabel="Not found">
      <p className="muted">That route doesn't exist.</p>
      <Link className="btn primary" to="/">
        Back to overview
      </Link>
    </Card>
  );
}
