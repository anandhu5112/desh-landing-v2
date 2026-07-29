import Hero from "@/components/Hero";
import BloomSection from "@/components/BloomSection";
import PortfolioSection from "@/components/PortfolioSection";
import Footer from "@/components/Footer";
import SiteNav from "@/components/SiteNav";

export default function Home() {
  return (
    <>
      {/* Fixed to the viewport, not inside Hero — must survive Hero's
          pinned zoom/fade so its links stay usable the whole page down. */}
      <SiteNav />
      {/* Pinned scroll sequence: spotlight hero -> zoom -> India card -> US panel */}
      <Hero />
      {/* Sibling of Hero, never a child: the hero's 1.6x zoom would scale it. */}
      <BloomSection />
      <PortfolioSection />
      <Footer />
    </>
  );
}
