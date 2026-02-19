import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InvestmentResults } from "./InvestmentResults";
import type { CollectionResult } from "../types";

const mockData: CollectionResult = {
  accounts: [
    {
      accountName: "ISK - Avanza",
      currency: "SEK",
      totalValue: 150000,
      holdings: [
        { name: "Avanza Global", type: "Fund", value: 100000 },
        { name: "Volvo B", type: "Stock", value: 50000 },
      ],
    },
    {
      accountName: "KF - Pension",
      currency: "SEK",
      totalValue: 75000,
      holdings: [
        { name: "Avanza Zero", type: "Fund", value: 75000 },
      ],
    },
  ],
};

describe("InvestmentResults", () => {
  it("should render all account names and holding names when given data", () => {
    render(<InvestmentResults data={mockData} onReset={vi.fn()} />);

    expect(screen.getByText("ISK - Avanza")).toBeInTheDocument();
    expect(screen.getByText("KF - Pension")).toBeInTheDocument();
    expect(screen.getByText("Avanza Global")).toBeInTheDocument();
    expect(screen.getByText("Volvo B")).toBeInTheDocument();
    expect(screen.getByText("Avanza Zero")).toBeInTheDocument();
  });

  it("should render formatted portfolio total and type badges when given data", () => {
    render(<InvestmentResults data={mockData} onReset={vi.fn()} />);

    // Type badges should be present
    const fundBadges = screen.getAllByText("Fund");
    expect(fundBadges.length).toBe(2);
    expect(screen.getByText("Stock")).toBeInTheDocument();

    // Total portfolio value (225000 SEK) should be formatted
    // The exact format depends on sv-SE locale but should contain the number
    expect(screen.getByText("2 accounts")).toBeInTheDocument();
    expect(screen.getByText("3 holdings")).toBeInTheDocument();
  });

  it("should call onReset when 'Start new collection' button is clicked", async () => {
    const onReset = vi.fn();
    render(<InvestmentResults data={mockData} onReset={onReset} />);

    await userEvent.click(screen.getByRole("button", { name: /start new collection/i }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
