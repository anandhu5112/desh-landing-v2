import Hero from "@/components/Hero";
import ServicesSection from "@/components/ServicesSection";
import MarqueeDividerBorders from "@/components/MarqueeDividerBorders";
import BloomSection from "@/components/BloomSection";
import Footer from "@/components/Footer";
import SiteNav from "@/components/SiteNav";
import SmoothScroll from "@/components/SmoothScroll";

export default function Home() {
  return (
    <>
      {/* Renders nothing — wires Lenis into GSAP's ticker for the whole page. */}
      <SmoothScroll />
      {/* Fixed to the viewport, not inside Hero — must survive Hero's
          pinned zoom/fade so its links stay usable the whole page down. */}
      <SiteNav />
      {/* Pinned scroll sequence: spotlight hero -> zoom -> outro statement. */}
      <Hero />
      {/* India + US as one continuous block — single scroll-snap stop and a
          lightweight parallax rise as it enters view, not two separate
          pinned stages. Then plain full-viewport sections the rest of the
          way down. */}
      <ServicesSection />
      {/* Zero margin/padding on either side (see its own .banner comment) —
          sits flush against BloomSection below, no gap. */}
      <MarqueeDividerBorders />
      <BloomSection />
      <Footer />
    </>
  );
}
