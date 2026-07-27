import Hero from "@/components/Hero";
import BloomSection from "@/components/BloomSection";

export default function Home() {
  return (
    <>
      {/* Pinned scroll sequence: spotlight hero -> zoom -> India card -> US panel */}
      <Hero />
      {/* Sibling of Hero, never a child: the hero's 1.6x zoom would scale it. */}
      <BloomSection />
    </>
  );
}
