import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorMessage } from "./ErrorMessage";

describe("ErrorMessage", () => {
  it("should render the provided error message when given", () => {
    render(<ErrorMessage message="Something went wrong" />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("should show dismiss button and call onDismiss when clicked", async () => {
    const onDismiss = vi.fn();
    render(<ErrorMessage message="Error" onDismiss={onDismiss} />);

    const button = screen.getByRole("button");
    await userEvent.click(button);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("should hide dismiss button when onDismiss is omitted", () => {
    render(<ErrorMessage message="Error" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
