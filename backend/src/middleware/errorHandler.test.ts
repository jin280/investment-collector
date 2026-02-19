import { describe, it, expect, vi, beforeEach } from "vitest";
import { errorHandler } from "./errorHandler.js";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from "../domain/errors.js";

function createMockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

const mockReq = {} as any;
const mockNext = vi.fn();

describe("errorHandler middleware", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 400 with VALIDATION_ERROR when given ValidationError", () => {
    const res = createMockRes();
    errorHandler(new ValidationError("bad input"), mockReq, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "VALIDATION_ERROR",
      message: "bad input",
    });
  });

  it("should return 404 with NOT_FOUND when given NotFoundError", () => {
    const res = createMockRes();
    errorHandler(new NotFoundError("not found"), mockReq, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "NOT_FOUND",
      message: "not found",
    });
  });

  it("should return 409 with CONFLICT when given ConflictError", () => {
    const res = createMockRes();
    errorHandler(new ConflictError("conflict"), mockReq, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "CONFLICT",
      message: "conflict",
    });
  });

  it("should return 403 with FORBIDDEN when given ForbiddenError", () => {
    const res = createMockRes();
    errorHandler(new ForbiddenError("forbidden"), mockReq, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "FORBIDDEN",
      message: "forbidden",
    });
  });

  it("should return 500 with INTERNAL_ERROR when given plain Error", () => {
    const res = createMockRes();
    errorHandler(new Error("something broke"), mockReq, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    });
  });

  it("should return 500 when given TypeError", () => {
    const res = createMockRes();
    errorHandler(new TypeError("undefined is not a function"), mockReq, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    });
  });

  it("should return 500 when given string thrown as error", () => {
    const res = createMockRes();
    errorHandler("string error" as any, mockReq, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    });
  });

  it("should call console.error when given non-AppError error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = createMockRes();
    const error = new Error("unexpected");
    errorHandler(error, mockReq, res, mockNext);
    expect(spy).toHaveBeenCalledWith("Unexpected error:", error);
  });
});
