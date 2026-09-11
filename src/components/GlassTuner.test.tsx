import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GlassTuner from "./GlassTuner";
import { GlassProvider, useGlassConfig } from "./GlassContext";

function LensValue() {
  const { lens, webgl } = useGlassConfig();
  return (
    <>
      <output data-testid="strength">{lens.strength}</output>
      <output data-testid="refraction">{webgl.refraction}</output>
    </>
  );
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); window.history.replaceState({}, "", "/"); });

function mount(narrow: boolean, query = "?tune=1") {
  window.history.replaceState({}, "", `/${query}`);
  Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn(() => ({
    matches: narrow, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })) });
  return render(<GlassProvider><GlassTuner /><LensValue /></GlassProvider>);
}

describe("glass tuner", () => {
  it.each([true, false])("offers live lens controls and copies all values (narrow=%s)", async (narrow) => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    mount(narrow);
    const strength = await screen.findByRole("slider", { name: "strength" });
    expect(screen.getAllByRole("slider")).toHaveLength(14);
    fireEvent.change(strength, { target: { value: "0.04" } });
    expect(screen.getByTestId("strength")).toHaveTextContent("0.04");
    fireEvent.click(screen.getByRole("button", { name: "copy values" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining("strength: 0.04,")));
    expect(writeText.mock.calls[0][0]).toContain("opacity: 0.18,");
    expect(writeText.mock.calls[0][0]).toContain("blur: 18,");
  });

  it("swaps in the WebGL lens controls where ybouane is the live glass", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    mount(true, "?tune=1&glass=webgl");
    const refraction = await screen.findByRole("slider", { name: "refraction" });
    // 10 WebGL knobs + 3 pill knobs; the SVG lens sliders are not offered.
    expect(screen.getAllByRole("slider")).toHaveLength(13);
    expect(screen.queryByRole("slider", { name: "strength" })).not.toBeInTheDocument();
    fireEvent.change(refraction, { target: { value: "1.2" } });
    expect(screen.getByTestId("refraction")).toHaveTextContent("1.2");
    fireEvent.click(screen.getByRole("button", { name: "copy values" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining("refraction: 1.2,")));
    expect(writeText.mock.calls[0][0]).toContain("// GlassProvider safariPill");
    expect(writeText.mock.calls[0][0]).toContain("opacity: 0.04,");
    expect(writeText.mock.calls[0][0]).not.toContain("strength:");
  });

  it("stays hidden without the tuning query", () => {
    mount(true, "");
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("keeps controls available if copying is blocked", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: vi.fn().mockRejectedValue(new Error("Clipboard denied")),
    } });
    mount(true);
    fireEvent.click(await screen.findByRole("button", { name: "copy values" }));
    await waitFor(() => expect(screen.getByRole("slider", { name: "strength" })).toBeVisible());
  });
});
