import { validatePersonnummer } from "../domain/personnummer.js";
import { ValidationError, NotFoundError, ForbiddenError } from "../domain/errors.js";
import { SessionStatus } from "../domain/types.js";
import { sessionStore } from "../store/sessionStore.js";
import {
  createBankIdSession,
  collectSession,
  completeSession,
  cancelSession,
} from "./bankidService.js";
import { avanzaProvider } from "../providers/avanza/mockProvider.js";

export function startCollection(personalNumber: string) {
  const validation = validatePersonnummer(personalNumber);
  if (!validation.valid) {
    throw new ValidationError(validation.error!);
  }

  const session = createBankIdSession(validation.normalized!);

  return {
    orderRef: session.orderRef,
    autoStartToken: session.qrStartToken,
    qrStartToken: session.qrStartToken,
  };
}

export function pollCollection(orderRef: string) {
  return collectSession(orderRef);
}

export function mockComplete(orderRef: string) {
  const session = completeSession(orderRef);
  return {
    orderRef: session.orderRef,
    status: session.status,
  };
}

export function cancelCollection(orderRef: string) {
  cancelSession(orderRef);
  return {};
}

export async function getCollectionResult(orderRef: string) {
  const session = sessionStore.get(orderRef);
  if (!session) {
    throw new NotFoundError("Order not found");
  }

  if (session.status !== SessionStatus.COMPLETE) {
    throw new ForbiddenError("Session not complete — authenticate first");
  }

  const result = await avanzaProvider.getHoldings(session.personalNumber);
  return result;
}
