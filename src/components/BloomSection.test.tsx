import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import BloomSection from "./BloomSection";

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

// Mock ContactModalProvider
vi.mock("@/components/ContactModalProvider", () => ({
  useContactModal: () => ({
    open: vi.fn(),
  }),
}));

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    drawImage: vi.fn(),
  });
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
});

describe("BloomSection coin slider", () => {
  it("renders the monthly investment slider with coin thumb image", () => {
    render(<BloomSection />);

    const slider = screen.getByRole("slider", {
      name: /monthly investment amount in rupees/i,
    });
    expect(slider).toBeDefined();
    expect(slider).toHaveValue("25000");

    // The coin image should be rendered with slider-coin
    const coinImg = document.querySelector('img[src*="slider-coin"]');
    expect(coinImg).not.toBeNull();
    expect(coinImg?.getAttribute("src")).toContain("slider-coin.webp");
  });

  it("updates value and estimated corpus when dragging or changing the slider", () => {
    render(<BloomSection />);

    const slider = screen.getByRole("slider", {
      name: /monthly investment amount in rupees/i,
    });

    // Check initial display
    expect(screen.getByDisplayValue("₹25,000")).toBeDefined();

    // Change slider value to ₹50,000
    fireEvent.change(slider, { target: { value: "50000" } });

    expect(slider).toHaveValue("50000");
    expect(screen.getByDisplayValue("₹50,000")).toBeDefined();
  });

  it("calculates dynamic position for the coin thumb and progress fill", () => {
    render(<BloomSection />);

    const fillBar = document.querySelector('[class*="sliderFill"]') as HTMLElement;
    const thumb = document.querySelector('[class*="sliderThumb"]') as HTMLElement;

    expect(fillBar).not.toBeNull();
    expect(thumb).not.toBeNull();

    // At initial ₹25,000, ratio is (25000 - 1000) / (200000 - 1000) = 24 / 199 ≈ 12.06%
    // positionCalc is calc(pct% + offset px)
    expect(fillBar.style.width).toContain("calc(");
    expect(thumb.style.left).toContain("calc(");
    expect(fillBar.style.width).toBe(thumb.style.left);
  });
});

describe("BloomSection WhatsApp community", () => {
  it("renders the Join community link with WhatsApp URL", () => {
    render(<BloomSection />);

    const link = screen.getByRole("link", { name: /join community/i });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toContain("chat.whatsapp.com");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("renders the QR code image for WhatsApp community", () => {
    render(<BloomSection />);

    const qrImg = screen.getByAltText(/qr code to join the desh whatsapp community/i);
    expect(qrImg).toBeDefined();
    expect(qrImg.getAttribute("src")).toContain("community-qr.svg");
  });
});


describe("BloomSection amount editing", () => {
  it.each([
    ["₹1,75,000", "175000", "₹1,75,000"],
    ["999999", "200000", "₹2,00,000"],
    ["-5", "1000", "₹1,000"],
    ["25500", "26000", "₹26,000"],
    ["", "25000", "₹25,000"],
    ["oops", "25000", "₹25,000"],
    ["Infinity", "25000", "₹25,000"],
  ])("commits %s safely", (draft, amount, display) => {
    render(<BloomSection />);
    const input = screen.getByRole("textbox", { name: "Monthly investment" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: draft } });
    fireEvent.blur(input);
    expect(input).toHaveValue(display);
    expect(screen.getByRole("slider")).toHaveValue(amount);
  });

  it("focuses with the pencil, commits on Enter and cancels on Escape", () => {
    render(<BloomSection />);
    const input = screen.getByRole("textbox", { name: "Monthly investment" });
    fireEvent.click(screen.getByRole("button", { name: "Edit monthly investment" }));
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: "50000" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input).toHaveValue("₹50,000");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "100000" } });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.blur(input);
    expect(input).toHaveValue("₹50,000");
  });

  it("updates the result and duration label for every preset", () => {
    render(<BloomSection />);
    for (const years of [5, 10, 15, 20, 25, 30]) {
      const option = screen.getByRole("radio", { name: `${years} yrs` });
      fireEvent.click(option);
      expect(option).toHaveAttribute("aria-checked", "true");
      expect(screen.getByText(`Estimated value in ${years} years`)).toBeInTheDocument();
      const value = Math.round(25000 * ((1.01 ** (years * 12) - 1) / 0.01) * 1.01);
      expect(screen.getByText(`₹${value.toLocaleString("en-IN")}`)).toBeInTheDocument();
    }
  });
});
