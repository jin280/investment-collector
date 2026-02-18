import { Session, SessionRepository } from "../domain/types.js";

export class InMemorySessionStore implements SessionRepository {
  private sessions = new Map<string, Session>();

  create(session: Session): void {
    this.sessions.set(session.orderRef, session);
  }

  get(orderRef: string): Session | undefined {
    return this.sessions.get(orderRef);
  }

  update(
    orderRef: string,
    updates: Partial<Session>
  ): Session | undefined {
    const session = this.sessions.get(orderRef);
    if (!session) return undefined;

    const updated = { ...session, ...updates };
    this.sessions.set(orderRef, updated);
    return updated;
  }

  delete(orderRef: string): void {
    this.sessions.delete(orderRef);
  }

  clear(): void {
    this.sessions.clear();
  }
}

// Singleton instance
export const sessionStore = new InMemorySessionStore();
