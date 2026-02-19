export enum SessionStatus {
  PENDING = "pending",
  USER_SIGN = "userSign",
  COMPLETE = "complete",
  FAILED = "failed",
}

export interface Session {
  orderRef: string;
  personalNumber: string;
  status: SessionStatus;
  hintCode?: string;
  qrStartToken: string;
  qrStartSecret: string;
  createdAt: number;
  expiresAt: number;
  completionData?: CompletionData;
}

export interface CompletionData {
  user: {
    personalNumber: string;
    name: string;
    givenName: string;
    surname: string;
  };
}

export interface Provider {
  getHoldings(personalNumber: string): Promise<CollectionResult>;
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

export interface SessionRepository {
  create(session: Session): void;
  get(orderRef: string): Session | undefined;
  update(orderRef: string, updates: Partial<Session>): Session | undefined;
  delete(orderRef: string): void;
  clear(): void;
}

/** Discriminated union for collect endpoint responses */
export type CollectResult =
  | { orderRef: string; status: SessionStatus.PENDING; hintCode: string; qrData: string }
  | { orderRef: string; status: SessionStatus.COMPLETE; completionData: CompletionData }
  | { orderRef: string; status: SessionStatus.FAILED; hintCode: string };

export interface BankIdService {
  createSession(personalNumber: string): Session;
  generateQrData(session: Session): string;
  collectSession(orderRef: string): CollectResult;
  completeSession(orderRef: string): Session;
  cancelSession(orderRef: string): void;
}
