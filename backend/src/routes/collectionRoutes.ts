import { Router, Request, Response, NextFunction } from "express";
import { ValidationError } from "../domain/errors.js";
import { createBankIdService } from "../services/bankidService.js";
import { createCollectionService } from "../services/collectionService.js";
import { sessionStore } from "../store/sessionStore.js";
import { avanzaProvider } from "../providers/avanza/mockProvider.js";

const bankIdService = createBankIdService(sessionStore);
const collectionService = createCollectionService(sessionStore, bankIdService, avanzaProvider);

const router = Router();

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

function requireString(value: unknown, field: string): string {
  if (!value || typeof value !== "string") {
    throw new ValidationError(`${field} is required and must be a string`);
  }
  return value;
}

// POST /api/collections/auth — Start BankID auth + collection session
router.post(
  "/auth",
  asyncHandler(async (req, res) => {
    const personalNumber = requireString(req.body?.personalNumber, "personalNumber");
    const result = collectionService.startCollection(personalNumber);
    res.json(result);
  })
);

// POST /api/collections/collect — Poll session status + get QR data
router.post(
  "/collect",
  asyncHandler(async (req, res) => {
    const orderRef = requireString(req.body?.orderRef, "orderRef");
    const result = collectionService.pollCollection(orderRef);
    res.json(result);
  })
);

// POST /api/collections/complete — Mock successful BankID authentication
router.post(
  "/complete",
  asyncHandler(async (req, res) => {
    const orderRef = requireString(req.body?.orderRef, "orderRef");
    const result = collectionService.mockComplete(orderRef);
    res.json(result);
  })
);

// POST /api/collections/cancel — Cancel a pending session
router.post(
  "/cancel",
  asyncHandler(async (req, res) => {
    const orderRef = requireString(req.body?.orderRef, "orderRef");
    const result = collectionService.cancelCollection(orderRef);
    res.json(result);
  })
);

// GET /api/collections/:orderRef/result — Get investment data after auth
router.get(
  "/:orderRef/result",
  asyncHandler(async (req, res) => {
    const orderRef = requireString(req.params.orderRef, "orderRef");
    const result = await collectionService.getCollectionResult(orderRef);
    res.json(result);
  })
);

export default router;
