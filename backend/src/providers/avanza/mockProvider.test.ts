import { describe, it, expect } from "vitest";
import { avanzaProvider } from "./mockProvider.js";

describe("AvanzaMockProvider", () => {
  it("returns at least one account with holdings", async () => {
    const result = await avanzaProvider.getHoldings("199001011239");
    expect(result.accounts).toBeDefined();
    expect(result.accounts.length).toBeGreaterThan(0);
  });

  it("returns accounts with correct shape", async () => {
    const result = await avanzaProvider.getHoldings("199001011239");

    for (const account of result.accounts) {
      expect(account.accountName).toEqual(expect.any(String));
      expect(account.currency).toBe("SEK");
      expect(account.totalValue).toEqual(expect.any(Number));
      expect(account.holdings.length).toBeGreaterThan(0);
    }
  });

  it("returns holdings with valid types", async () => {
    const result = await avanzaProvider.getHoldings("199001011239");
    const validTypes = ["Fund", "Stock", "Cash", "ETF", "Bond"];

    for (const account of result.accounts) {
      for (const holding of account.holdings) {
        expect(holding.name).toEqual(expect.any(String));
        expect(validTypes).toContain(holding.type);
        expect(holding.value).toBeGreaterThan(0);
      }
    }
  });

  it("account totalValue matches sum of holdings", async () => {
    const result = await avanzaProvider.getHoldings("199001011239");

    for (const account of result.accounts) {
      const holdingsSum = account.holdings.reduce((sum, h) => sum + h.value, 0);
      expect(account.totalValue).toBeCloseTo(holdingsSum, 2);
    }
  });
});
