import ContactModalProvider from "@/components/ContactModalProvider";
import Hero from "@/components/Hero";
import ServicesSection from "@/components/ServicesSection";
import BloomSection from "@/components/BloomSection";
import FaqSection from "@/components/FaqSection";
import Footer from "@/components/Footer";
import SiteNav from "@/components/SiteNav";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollRoot from "@/components/ScrollRoot";
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
            lib/scroller.ts. Everything below is page content; the nav,
            tuner and contact modal stay outside it as viewport chrome. */}
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

        {/* Neither tuner is mounted. WordmarkTuner drives the footer
            wordmark's --wm-* properties and its values are baked into
            Footer.module.css; to tune again, add it back for the session:
              import dynamic from "next/dynamic";
              const WordmarkTuner = dynamic(() => import("@/components/WordmarkTuner"));
              <WordmarkTuner />
            then press Copy CSS, paste the block over the --wm-* defaults in
            Footer.module.css, update WORDMARK_DEFAULTS to match — a test
            holds the two together — and take the mount back out. Keep it
            behind next/dynamic: a static import would leave the panel in the
            production bundle whatever a NODE_ENV branch evaluates to, which
            is the same trap the note below describes.

            GlassTuner is deliberately NOT mounted here either. The glass values it
            produced are baked into GlassProvider, and a NODE_ENV guard was
            not enough — the component still landed in the production bundle,
            because the import keeps it in the module graph whatever the
            branch evaluates to. To tune again, add it back for the session:
              import GlassTuner from "@/components/GlassTuner";
              <GlassTuner />
            then copy the values into GlassContext and remove it again. */}
      </GlassProvider>
    </ContactModalProvider>
  );
}
