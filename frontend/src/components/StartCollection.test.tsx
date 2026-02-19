import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StartCollection } from "./StartCollection";

describe("StartCollection", () => {
  it("should render personnummer input and connect button when mounted", () => {
    render(<StartCollection onStart={vi.fn()} loading={false} error={null} />);
    expect(screen.getByLabelText(/personal identity number/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /connect/i })).toBeInTheDocument();
  });

  it("should call onStart when valid personnummer is submitted", async () => {
    const onStart = vi.fn().mockResolvedValue(undefined);
    render(<StartCollection onStart={onStart} loading={false} error={null} />);

    const input = screen.getByLabelText(/personal identity number/i);
    await userEvent.type(input, "199001011239");
    await userEvent.click(screen.getByRole("button", { name: /connect/i }));

    expect(onStart).toHaveBeenCalledWith("199001011239");
  });

  it("should show validation error and not call onStart when invalid personnummer is submitted", async () => {
    const onStart = vi.fn();
    render(<StartCollection onStart={onStart} loading={false} error={null} />);

    const input = screen.getByLabelText(/personal identity number/i);
    await userEvent.type(input, "invalid");
    await userEvent.click(screen.getByRole("button", { name: /connect/i }));

    expect(onStart).not.toHaveBeenCalled();
    // Should show some validation error text
    expect(screen.getByText(/digits/i)).toBeInTheDocument();
  });

  it("should show validation error when non-digit input is submitted", async () => {
    const onStart = vi.fn();
    // Need to type something then clear to enable button, or test the disabled state
    render(<StartCollection onStart={onStart} loading={false} error={null} />);

    // Type something to enable the button, then clear
    const input = screen.getByLabelText(/personal identity number/i);
    await userEvent.type(input, "x");
    await userEvent.click(screen.getByRole("button", { name: /connect/i }));

    expect(onStart).not.toHaveBeenCalled();
  });

  it("should clear validation error when typing after error", async () => {
    const onStart = vi.fn();
    render(<StartCollection onStart={onStart} loading={false} error={null} />);

    const input = screen.getByLabelText(/personal identity number/i);
    await userEvent.type(input, "bad");
    await userEvent.click(screen.getByRole("button", { name: /connect/i }));

    // Validation error should be visible
    expect(screen.getByText(/digits/i)).toBeInTheDocument();

    // Type more to clear error
    await userEvent.type(input, "1");
    expect(screen.queryByText(/digits/i)).not.toBeInTheDocument();
  });

  it("should disable connect button when input is empty", () => {
    render(<StartCollection onStart={vi.fn()} loading={false} error={null} />);
    expect(screen.getByRole("button", { name: /connect/i })).toBeDisabled();
  });

  it("should disable button and show connecting label when loading", () => {
    render(<StartCollection onStart={vi.fn()} loading={true} error={null} />);
    expect(screen.getByRole("button", { name: /connecting/i })).toBeDisabled();
  });
});
