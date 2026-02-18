import crypto from "node:crypto";
import { Session, SessionStatus, CollectResult } from "../domain/types.js";
import { sessionStore } from "../store/sessionStore.js";
import { NotFoundError, ConflictError } from "../domain/errors.js";

const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function createBankIdSession(personalNumber: string): Session {
  const orderRef = crypto.randomUUID();
  const qrStartToken = crypto.randomUUID();
  const qrStartSecret = crypto.randomBytes(32).toString("hex");
  const now = Date.now();

  const session: Session = {
    orderRef,
    personalNumber,
    status: SessionStatus.PENDING,
    hintCode: "outstandingTransaction",
    qrStartToken,
    qrStartSecret,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };

  sessionStore.create(session);
  return session;
}

export function generateQrData(session: Session): string {
  const elapsed = Math.floor((Date.now() - session.createdAt) / 1000);
  const hmac = crypto
    .createHmac("sha256", session.qrStartSecret)
    .update(String(elapsed))
    .digest("hex");
  return `bankid.${session.qrStartToken}.${elapsed}.${hmac}`;
}

export function collectSession(orderRef: string): CollectResult {
  const session = sessionStore.get(orderRef);
  if (!session) {
    throw new NotFoundError("Order not found");
  }

  // Check expiry — check status first to avoid redundant store updates
  if (session.status === SessionStatus.PENDING && Date.now() > session.expiresAt) {
    sessionStore.update(orderRef, {
      status: SessionStatus.FAILED,
      hintCode: "expiredTransaction",
    });
    return {
      orderRef: session.orderRef,
      status: SessionStatus.FAILED,
      hintCode: "expiredTransaction",
    };
  }

  if (session.status === SessionStatus.COMPLETE) {
    return {
      orderRef: session.orderRef,
      status: SessionStatus.COMPLETE,
      completionData: session.completionData!,
    };
  }

  if (session.status === SessionStatus.FAILED) {
    return {
      orderRef: session.orderRef,
      status: SessionStatus.FAILED,
      hintCode: session.hintCode ?? "unknown",
    };
  }

  // Still pending — return QR data
  return {
    orderRef: session.orderRef,
    status: SessionStatus.PENDING,
    hintCode: session.hintCode ?? "outstandingTransaction",
    qrData: generateQrData(session),
  };
}

export function completeSession(orderRef: string) {
  const session = sessionStore.get(orderRef);
  if (!session) {
    throw new NotFoundError("Order not found");
  }

  if (session.status !== SessionStatus.PENDING && session.status !== SessionStatus.USER_SIGN) {
    throw new ConflictError("Session not in pending state");
  }

  if (Date.now() > session.expiresAt) {
    sessionStore.update(orderRef, {
      status: SessionStatus.FAILED,
      hintCode: "expiredTransaction",
    });
    throw new ConflictError("Session has expired");
  }

  const mockNames = getMockName(session.personalNumber);

  sessionStore.update(orderRef, {
    status: SessionStatus.COMPLETE,
    hintCode: undefined,
    completionData: {
      user: {
        personalNumber: session.personalNumber,
        ...mockNames,
      },
    },
  });

  return sessionStore.get(orderRef)!;
}

export function cancelSession(orderRef: string) {
  const session = sessionStore.get(orderRef);
  if (!session) {
    throw new NotFoundError("Order not found");
  }

  sessionStore.update(orderRef, {
    status: SessionStatus.FAILED,
    hintCode: "userCancel",
  });
}

function getMockName(personalNumber: string) {
  // Generate deterministic mock names based on the personal number
  const names = [
    { givenName: "Anna", surname: "Andersson" },
    { givenName: "Erik", surname: "Eriksson" },
    { givenName: "Maria", surname: "Johansson" },
    { givenName: "Lars", surname: "Karlsson" },
    { givenName: "Eva", surname: "Lindberg" },
  ];
  const idx =
    personalNumber.split("").reduce((s, c) => s + c.charCodeAt(0), 0) %
    names.length;
  const { givenName, surname } = names[idx];
  return { givenName, surname, name: `${givenName} ${surname}` };
}
