import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorMessage } from "./ErrorMessage";

describe("ErrorMessage", () => {
  it("renders the provided error message", () => {
    render(<ErrorMessage message="Something went wrong" />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("shows dismiss button when onDismiss provided, click calls it", async () => {
    const onDismiss = vi.fn();
    render(<ErrorMessage message="Error" onDismiss={onDismiss} />);

    const button = screen.getByRole("button");
    await userEvent.click(button);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("no dismiss button when onDismiss omitted", () => {
    render(<ErrorMessage message="Error" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
