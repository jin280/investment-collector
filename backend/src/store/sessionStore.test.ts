import { describe, it, expect } from "vitest";
import { InMemorySessionStore } from "./sessionStore.js";
import { SessionStatus } from "../domain/types.js";

function makeSession(orderRef: string = "test-ref") {
  return {
    orderRef,
    personalNumber: "199001011239",
    status: SessionStatus.PENDING,
    hintCode: "outstandingTransaction",
    qrStartToken: "token-123",
    qrStartSecret: "secret-456",
    createdAt: Date.now(),
    expiresAt: Date.now() + 300000,
  };
}

describe("InMemorySessionStore", () => {
  it("stores a session that can be retrieved by orderRef", () => {
    const store = new InMemorySessionStore();
    const session = makeSession();
    store.create(session);
    const retrieved = store.get("test-ref");
    expect(retrieved).toEqual(session);
  });

  it("get returns undefined for unknown key", () => {
    const store = new InMemorySessionStore();
    expect(store.get("nonexistent")).toBeUndefined();
  });

  it("update merges partial fields correctly", () => {
    const store = new InMemorySessionStore();
    store.create(makeSession());
    const updated = store.update("test-ref", {
      status: SessionStatus.COMPLETE,
      hintCode: undefined,
    });
    expect(updated!.status).toBe(SessionStatus.COMPLETE);
    expect(updated!.hintCode).toBeUndefined();
    expect(updated!.personalNumber).toBe("199001011239");
  });

  it("update returns undefined for nonexistent key", () => {
    const store = new InMemorySessionStore();
    expect(
      store.update("nonexistent", { status: SessionStatus.COMPLETE })
    ).toBeUndefined();
  });

  it("delete removes session", () => {
    const store = new InMemorySessionStore();
    store.create(makeSession());
    store.delete("test-ref");
    expect(store.get("test-ref")).toBeUndefined();
  });

  it("delete on nonexistent key doesn't throw", () => {
    const store = new InMemorySessionStore();
    expect(() => store.delete("nonexistent")).not.toThrow();
  });
});
