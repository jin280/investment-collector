import { Provider, CollectionResult } from "../../domain/types.js";

export class AvanzaMockProvider implements Provider {
  async getHoldings(_personalNumber: string): Promise<CollectionResult> {
    return {
      accounts: [
        {
          accountName: "ISK - Investeringssparkonto",
          currency: "SEK",
          totalValue: 247_892.5,
          holdings: [
            { name: "Avanza Global", type: "Fund", value: 89_450.0 },
            { name: "Länsförsäkringar Teknik", type: "Fund", value: 42_100.75 },
            { name: "Evolution Gaming", type: "Stock", value: 35_670.0 },
            { name: "Volvo B", type: "Stock", value: 28_340.25 },
            { name: "XACT OMXS30 ESG", type: "ETF", value: 18_900.0 },
            { name: "Riksgälden 1054", type: "Bond", value: 15_000.0 },
            { name: "Likvida medel", type: "Cash", value: 18_431.5 },
          ],
        },
        {
          accountName: "Kapitalförsäkring",
          currency: "SEK",
          totalValue: 134_560.0,
          holdings: [
            { name: "Spiltan Aktiefond Investmentbolag", type: "Fund", value: 52_300.0 },
            { name: "SEB Sverige Indexfond", type: "Fund", value: 38_760.0 },
            { name: "Hexagon B", type: "Stock", value: 22_500.0 },
            { name: "Likvida medel", type: "Cash", value: 21_000.0 },
          ],
        },
      ],
    };
  }
}

export const avanzaProvider = new AvanzaMockProvider();
