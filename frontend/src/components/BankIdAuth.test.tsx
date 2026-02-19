import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BankIdAuth } from "./BankIdAuth";

// Mock the useBankIdAuth hook
const mockAuthenticate = vi.fn();
const mockHookReturn = {
  qrData: null as string | null,
  status: "pending" as "pending" | "complete" | "failed" | "userSign" | null,
  hintCode: null as string | null,
  timeLeft: 300,
  error: null as string | null,
  authenticate: mockAuthenticate,
};

vi.mock("../hooks/useBankIdAuth", () => ({
  useBankIdAuth: () => mockHookReturn,
}));

// Mock QRCodeSVG to avoid canvas dependencies
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => <div data-testid="qr-code">{value}</div>,
}));

describe("BankIdAuth", () => {
  beforeEach(() => {
    mockHookReturn.qrData = null;
    mockHookReturn.status = "pending";
    mockHookReturn.hintCode = null;
    mockHookReturn.timeLeft = 300;
    mockHookReturn.error = null;
    mockAuthenticate.mockReset();
  });

  it("shows QR code and scan instruction when status is pending", () => {
    mockHookReturn.status = "pending";
    mockHookReturn.qrData = "bankid.token.0.hmac";
    mockHookReturn.timeLeft = 300;
    mockHookReturn.error = null;

    render(
      <BankIdAuth
        orderRef="ref-1"
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText("Start the BankID app")).toBeInTheDocument();
    expect(screen.getByTestId("qr-code")).toBeInTheDocument();
  });

  it("shows authenticated confirmation when complete without fetchError", () => {
    mockHookReturn.status = "complete";
    mockHookReturn.qrData = null;
    mockHookReturn.error = null;

    render(
      <BankIdAuth
        orderRef="ref-1"
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText("Authenticated!")).toBeInTheDocument();
    expect(screen.getByText(/loading your investment data/i)).toBeInTheDocument();
  });

  it("shows error and retry buttons when complete with fetchError", () => {
    mockHookReturn.status = "complete";
    mockHookReturn.qrData = null;
    mockHookReturn.error = null;

    render(
      <BankIdAuth
        orderRef="ref-1"
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        fetchError="Failed to load investments"
      />
    );

    expect(screen.getByText("Failed to load data")).toBeInTheDocument();
    expect(screen.getByText("Failed to load investments")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start over/i })).toBeInTheDocument();
  });

  it("shows failure message and try-again button when status is failed", () => {
    mockHookReturn.status = "failed";
    mockHookReturn.qrData = null;
    mockHookReturn.error = null;

    render(
      <BankIdAuth
        orderRef="ref-1"
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText("Authentication Failed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("displays '2 minutes left' when timeLeft is 120 seconds", () => {
    mockHookReturn.status = "pending";
    mockHookReturn.qrData = "bankid.token.0.hmac";
    mockHookReturn.timeLeft = 120;
    mockHookReturn.error = null;

    render(
      <BankIdAuth
        orderRef="ref-1"
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText("2 minutes left")).toBeInTheDocument();
  });

  it("displays seconds when timeLeft is under 60", () => {
    mockHookReturn.status = "pending";
    mockHookReturn.qrData = "bankid.token.0.hmac";
    mockHookReturn.timeLeft = 45;
    mockHookReturn.error = null;

    render(
      <BankIdAuth
        orderRef="ref-1"
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText("45 seconds left")).toBeInTheDocument();
  });

  it("displays '1 second left' for singular", () => {
    mockHookReturn.status = "pending";
    mockHookReturn.qrData = "bankid.token.0.hmac";
    mockHookReturn.timeLeft = 1;
    mockHookReturn.error = null;

    render(
      <BankIdAuth
        orderRef="ref-1"
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText("1 second left")).toBeInTheDocument();
  });
});
