import ContactModalProvider from "@/components/ContactModalProvider";
import Hero from "@/components/Hero";
import ServicesSection from "@/components/ServicesSection";
import BloomSection from "@/components/BloomSection";
import FaqSection from "@/components/FaqSection";
import Footer from "@/components/Footer";
import SiteNav from "@/components/SiteNav";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollRoot from "@/components/ScrollRoot";
import WebKitNavGlass from "@/components/WebKitNavGlass";
import YbouaneNavGlass from "@/components/YbouaneNavGlass";
import { GlassProvider } from "@/components/GlassContext";

export default function Home() {
  return (
    // Owns the contact modal for the whole page, so the nav pill and every
    // "Talk to an Advisor" CTA below open the same one.
    <ContactModalProvider>
      <GlassProvider>
        {/* Renders nothing — wires Lenis into GSAP's ticker for the whole page. */}
        <SmoothScroll />
        {/* The page scrolls inside this, not in the window — see
            lib/scroller.ts. Everything below is page content; the nav
            and contact modal stay outside it as viewport chrome. */}
        <ScrollRoot>
          {/* Pinned scroll sequence: spotlight hero -> zoom -> outro statement. */}
          <Hero />
          {/* India + US as one continuous block — single scroll-snap stop and a
              lightweight parallax rise as it enters view, not two separate
              pinned stages. Then plain full-viewport sections the rest of the
              way down. */}
          <ServicesSection />
          {/* One continuous dark panel: SIP calculator, the "Invest like a true
              global citizen" CTA, and the WhatsApp card straddling its
              bottom edge (Figma node 379:15555). */}
          <BloomSection />
          <FaqSection />
          <Footer />
        </ScrollRoot>

        {/* Fixed to the viewport, not inside Hero — must survive Hero's
            pinned zoom/fade so its links stay usable the whole page down. */}
        <SiteNav />
        {/* Safari / iOS — pill-sized WebGL refraction (@ybouane/liquidglass)
            over the hero. Blink already refracts through <LiquidGlass> in
            ScrollRoot and never mounts this; ?glass=webgl forces it there. */}
        <YbouaneNavGlass />
        {/* Legacy Safari canvas refraction — only with ?glass=canvas, kept
            for side-by-side comparison against the WebGL path above. */}
        <WebKitNavGlass />

        {/* GlassTuner is not mounted. Values are baked into GlassProvider;
            to tune again, add it back for the session behind next/dynamic:
              import dynamic from "next/dynamic";
              const GlassTuner = dynamic(() => import("@/components/GlassTuner"));
              <GlassTuner />
            then copy values into GlassContext and remove it again. A static
            import would leave the panel in the production bundle. */}
      </GlassProvider>
    </ContactModalProvider>
  );
}
