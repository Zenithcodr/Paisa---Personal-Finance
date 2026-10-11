import { test, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { init, getState } from "../core/store";
import { selectDerived } from "../core/selectors";
import { makeInitialState, makeDemoState } from "../core/seed";
import { App } from "../app/App";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { TransactionsPage } from "../features/transactions/TransactionsPage";
import { SimulatorPage } from "../features/simulator/SimulatorPage";

beforeEach(() => {
  init(makeDemoState());
});

test("App renders brand, navigation, and the dashboard route", () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <App />
    </MemoryRouter>
  );
  expect(screen.getByText("Paisa")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Transactions" })).toBeInTheDocument();
  expect(screen.getByText("Remaining balance")).toBeInTheDocument();
});

test("Dashboard shows risk and health cards", () => {
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );
  expect(screen.getByText("Risk")).toBeInTheDocument();
  expect(screen.getByText("Health")).toBeInTheDocument();
});

test("Logging an expense updates balance and the transaction list", () => {
  init(makeInitialState());
  render(
    <MemoryRouter>
      <TransactionsPage />
    </MemoryRouter>
  );
  const amount = screen.getByPlaceholderText("0");
  fireEvent.change(amount, { target: { value: "350" } });
  fireEvent.click(screen.getByRole("button", { name: /Log expense/i }));
  expect(selectDerived(getState()).balance).toBe(9650);
  expect(screen.getByText(/Day 1 · Food/)).toBeInTheDocument();
});

test("Simulator previews impact without mutating saved state until confirmed", () => {
  init(makeInitialState());
  const before = getState().transactions.length;
  render(
    <MemoryRouter>
      <SimulatorPage />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole("button", { name: "Buy ₹1,499 subscription" }));
  fireEvent.click(screen.getByRole("button", { name: "Project impact" }));
  // Projection is shown...
  expect(screen.getByText(/Forecast end/)).toBeInTheDocument();
  // ...but nothing is committed yet.
  expect(getState().subscriptions.length).toBe(0);
  fireEvent.click(screen.getByRole("button", { name: /Confirm/i }));
  expect(getState().subscriptions.length).toBe(1);
  expect(getState().transactions.length).toBe(before);
});
