import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BookingExperience from "./BookingExperience";

type CalEvent = {
  detail: {
    data: {
      startTime?: string;
    };
  };
};

const cal = vi.hoisted(() => {
  let successCallback: ((event: CalEvent) => void) | undefined;

  const api = vi.fn(
    (
      method: string,
      options: { action?: string; callback?: (event: CalEvent) => void },
    ) => {
      if (method === "on" && options.action === "bookingSuccessfulV2") {
        successCallback = options.callback;
      }
      if (method === "off" && options.callback === successCallback) {
        successCallback = undefined;
      }
    },
  );

  return {
    api,
    emitSuccess(startTime?: string) {
      successCallback?.({ detail: { data: { startTime } } });
    },
    reset() {
      api.mockClear();
      successCallback = undefined;
    },
  };
});

vi.mock("@calcom/embed-react", () => ({
  default: () => <div data-testid="cal-embed">Calendar</div>,
  getCalApi: vi.fn(async () => cal.api),
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    priority,
    fill,
    sizes,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    priority?: boolean;
    fill?: boolean;
  }) => {
    void priority;
    void fill;
    void sizes;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt ?? ""} {...props} />
    );
  },
}));

afterEach(() => {
  cleanup();
  cal.reset();
});

describe("BookingExperience", () => {
  it("shows the embedded calendar before a booking is completed", async () => {
    render(<BookingExperience />);

    expect(
      screen.getByRole("heading", { name: "Choose a time that works for you." }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("cal-embed")).toBeInTheDocument();

    await waitFor(() =>
      expect(cal.api).toHaveBeenCalledWith(
        "on",
        expect.objectContaining({ action: "bookingSuccessfulV2" }),
      ),
    );
  });

  it("replaces the calendar with the community invitation after booking", async () => {
    render(<BookingExperience />);
    await waitFor(() => expect(cal.api).toHaveBeenCalledWith("on", expect.anything()));

    act(() => cal.emitSuccess("2026-09-14T11:00:00.000Z"));

    expect(screen.getByRole("heading", { name: "See you soon." })).toBeInTheDocument();
    expect(screen.queryByTestId("cal-embed")).not.toBeInTheDocument();
    expect(screen.getByText(/Your conversation is set for/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Join the WhatsApp community" }),
    ).toHaveAttribute("href", expect.stringContaining("chat.whatsapp.com"));
  });

  it("still confirms a successful booking when Cal omits the start time", async () => {
    render(<BookingExperience />);
    await waitFor(() => expect(cal.api).toHaveBeenCalledWith("on", expect.anything()));

    act(() => cal.emitSuccess());

    expect(screen.getByRole("heading", { name: "See you soon." })).toBeInTheDocument();
    expect(screen.getByText(/^Your conversation is set\. We’ve sent/)).toBeInTheDocument();
  });

  it("removes the Cal event listener when the page unmounts", async () => {
    const { unmount } = render(<BookingExperience />);
    await waitFor(() => expect(cal.api).toHaveBeenCalledWith("on", expect.anything()));

    unmount();

    expect(cal.api).toHaveBeenCalledWith(
      "off",
      expect.objectContaining({ action: "bookingSuccessfulV2" }),
    );
  });
});
