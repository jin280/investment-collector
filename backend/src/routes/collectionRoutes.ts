import { Router, Request, Response, NextFunction } from "express";
import { ValidationError } from "../domain/errors.js";
import {
  startCollection,
  pollCollection,
  mockComplete,
  cancelCollection,
  getCollectionResult,
} from "../services/collectionService.js";

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
    const result = startCollection(personalNumber);
    res.json(result);
  })
);

// POST /api/collections/collect — Poll session status + get QR data
router.post(
  "/collect",
  asyncHandler(async (req, res) => {
    const orderRef = requireString(req.body?.orderRef, "orderRef");
    const result = pollCollection(orderRef);
    res.json(result);
  })
);

// POST /api/collections/complete — Mock successful BankID authentication
router.post(
  "/complete",
  asyncHandler(async (req, res) => {
    const orderRef = requireString(req.body?.orderRef, "orderRef");
    const result = mockComplete(orderRef);
    res.json(result);
  })
);

// POST /api/collections/cancel — Cancel a pending session
router.post(
  "/cancel",
  asyncHandler(async (req, res) => {
    const orderRef = requireString(req.body?.orderRef, "orderRef");
    const result = cancelCollection(orderRef);
    res.json(result);
  })
);

// GET /api/collections/:orderRef/result — Get investment data after auth
router.get(
  "/:orderRef/result",
  asyncHandler(async (req, res) => {
    const orderRef = requireString(req.params.orderRef, "orderRef");
    const result = await getCollectionResult(orderRef);
    res.json(result);
  })
);

export default router;
