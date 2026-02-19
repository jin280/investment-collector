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
  it("should retrieve the stored session when queried by orderRef", () => {
    const store = new InMemorySessionStore();
    const session = makeSession();
    store.create(session);
    const retrieved = store.get("test-ref");
    expect(retrieved).toEqual(session);
  });

  it("should return undefined when key is unknown", () => {
    const store = new InMemorySessionStore();
    expect(store.get("nonexistent")).toBeUndefined();
  });

  it("should merge partial fields when updated", () => {
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

  it("should return undefined when updating nonexistent key", () => {
    const store = new InMemorySessionStore();
    expect(
      store.update("nonexistent", { status: SessionStatus.COMPLETE })
    ).toBeUndefined();
  });

  it("should remove session when deleted", () => {
    const store = new InMemorySessionStore();
    store.create(makeSession());
    store.delete("test-ref");
    expect(store.get("test-ref")).toBeUndefined();
  });

  it("should not throw when deleting nonexistent key", () => {
    const store = new InMemorySessionStore();
    expect(() => store.delete("nonexistent")).not.toThrow();
  });
});
