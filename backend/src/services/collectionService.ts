import { validatePersonnummer } from "../domain/personnummer.js";
import { ValidationError, NotFoundError, ForbiddenError } from "../domain/errors.js";
import { SessionStatus, SessionRepository, Provider, CollectResult, BankIdService } from "../domain/types.js";

export function createCollectionService(
  store: SessionRepository,
  bankId: BankIdService,
  provider: Provider
) {
  function startCollection(personalNumber: string) {
    const validation = validatePersonnummer(personalNumber);
    if (!validation.valid) {
      throw new ValidationError(validation.error!);
    }

    const session = bankId.createSession(validation.normalized!);

    return {
      orderRef: session.orderRef,
      autoStartToken: session.qrStartToken,
      qrStartToken: session.qrStartToken,
    };
  }

  function pollCollection(orderRef: string): CollectResult {
    return bankId.collectSession(orderRef);
  }

  function mockComplete(orderRef: string) {
    const session = bankId.completeSession(orderRef);
    return {
      orderRef: session.orderRef,
      status: session.status,
    };
  }

  function cancelCollection(orderRef: string) {
    bankId.cancelSession(orderRef);
    return {};
  }

  async function getCollectionResult(orderRef: string) {
    const session = store.get(orderRef);
    if (!session) {
      throw new NotFoundError("Order not found");
    }

    if (session.status !== SessionStatus.COMPLETE) {
      throw new ForbiddenError("Session not complete — authenticate first");
    }

    return provider.getHoldings(session.personalNumber);
  }

  return { startCollection, pollCollection, mockComplete, cancelCollection, getCollectionResult };
}
