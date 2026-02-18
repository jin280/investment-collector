export interface AuthResponse {
  orderRef: string;
  autoStartToken: string;
  qrStartToken: string;
}

export interface CollectResponse {
  orderRef: string;
  status: "pending" | "userSign" | "complete" | "failed";
  hintCode?: string;
  qrData?: string;
  completionData?: {
    user: {
      personalNumber: string;
      name: string;
      givenName: string;
      surname: string;
    };
  };
}

export interface CollectionResult {
  accounts: Account[];
}

export interface Account {
  accountName: string;
  currency: string;
  totalValue: number;
  holdings: Holding[];
}

export interface Holding {
  name: string;
  type: "Fund" | "Stock" | "Cash" | "ETF" | "Bond";
  value: number;
}

export interface ApiError {
  error: string;
  message: string;
}

export type AppStep = "start" | "authenticating" | "results";
