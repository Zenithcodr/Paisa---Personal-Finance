import { Routes, Route } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { TransactionsPage } from "../features/transactions/TransactionsPage";
import { SubscriptionsPage } from "../features/subscriptions/SubscriptionsPage";
import { CommitmentsPage } from "../features/commitments/CommitmentsPage";
import { IncomePage } from "../features/income/IncomePage";
import { GoalsPage } from "../features/goals/GoalsPage";
import { DebtsPage } from "../features/debts/DebtsPage";
import { ForecastPage } from "../features/forecast/ForecastPage";
import { InsightsPage } from "../features/insights/InsightsPage";
import { SimulatorPage } from "../features/simulator/SimulatorPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { NotFoundPage } from "../features/not-found/NotFoundPage";

export function App() {
  return (
    <>
      <div className="bg-aurora" aria-hidden="true">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>
      <Header />
      <main className="layout">
        <Sidebar />
        <section className="content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/commitments" element={<CommitmentsPage />} />
            <Route path="/income" element={<IncomePage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/debts" element={<DebtsPage />} />
            <Route path="/forecast" element={<ForecastPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/simulate" element={<SimulatorPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </section>
      </main>
    </>
  );
}
