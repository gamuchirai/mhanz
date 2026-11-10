import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastContainer } from "../components/common/ToastContainer";
import { useToastStore } from "../store/useToastStore";

describe("ToastContainer Component (AC-5)", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it("renders nothing when toast list is empty", () => {
    const { container } = render(<ToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  it("renders notification region with aria landmark and status message when toasts are present", () => {
    useToastStore.getState().addToast("Next track skipped: file not found");

    render(<ToastContainer />);

    const region = screen.getByRole("region", { name: "Notifications" });
    expect(region).toBeInTheDocument();

    const statusItem = screen.getByRole("status");
    expect(statusItem).toBeInTheDocument();
    expect(statusItem).toHaveTextContent("Next track skipped: file not found");
  });

  it("renders multiple toasts in order", () => {
    useToastStore.getState().addToast("First notification");
    useToastStore.getState().addToast("Second notification");

    render(<ToastContainer />);

    const statusItems = screen.getAllByRole("status");
    expect(statusItems).toHaveLength(2);
    expect(statusItems[0]).toHaveTextContent("First notification");
    expect(statusItems[1]).toHaveTextContent("Second notification");
  });

  it("removes toast when user clicks dismiss button", async () => {
    const user = userEvent.setup();
    useToastStore.getState().addToast("Dismissible alert");

    render(<ToastContainer />);

    const dismissButton = screen.getByRole("button", {
      name: "Dismiss notification",
    });
    expect(dismissButton).toBeInTheDocument();

    await user.click(dismissButton);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("removes toast via keyboard navigation and Enter key on dismiss button", async () => {
    const user = userEvent.setup();
    useToastStore.getState().addToast("Keyboard alert");

    render(<ToastContainer />);

    const dismissButton = screen.getByRole("button", {
      name: "Dismiss notification",
    });

    await user.tab();
    expect(dismissButton).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

