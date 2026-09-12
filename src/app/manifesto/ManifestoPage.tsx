"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";

import ContactModalProvider from "@/components/ContactModalProvider";
import { GlassProvider } from "@/components/GlassContext";
import ScrollRoot from "@/components/ScrollRoot";
import SiteNav from "@/components/SiteNav";
import YbouaneNavGlass from "@/components/YbouaneNavGlass";
import buttonStyles from "@/components/ui/Button.module.css";
import { getScroller } from "@/lib/scroller";
import styles from "./page.module.css";

/** Widths from `npm run optimize:images`; 2880 is the artwork's native size.
    Same closing artwork the homepage footer uses — see Footer.tsx for why
    this is a plain <img> with an explicit srcSet rather than next/image. */
const SCENE_SRCSET =
  "/images/footer-scene-1280.webp 1280w, " +
  "/images/footer-scene-1920.webp 1920w, " +
  "/images/footer-scene.webp 2880w";

/**
 * Who signed the letter, left to right.
 *
 * The two files are different shapes on purpose. Aswin's is the
 * head-and-shoulders frame ContactModal also renders at full height, so it
 * ships at native size and the circle crop is CSS's job (see .founderPhoto).
 * Vinayak's is used nowhere else, so it is pre-cropped square and built at
 * 168px — 3x the 56px circle — by `npm run optimize:images`.
 */
const FOUNDERS = [
  {
    name: "Aswin",
    src: "/images/aswin-portrait.webp",
    width: 809,
    height: 1024,
  },
  {
    name: "Vinayak",
    src: "/images/vinayak-portrait.webp",
    width: 168,
    height: 168,
  },
];

export default function ManifestoPage() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const blocks = Array.from(
      root.querySelectorAll<HTMLElement>('[data-reveal="hidden"]'),
    );
    const show = (el: HTMLElement) => {
      el.dataset.reveal = "shown";
    };

    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      blocks.forEach(show);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      },
      // Fires a little before the block reaches the fold, so the motion has
      // finished by the time the line is actually being read.
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );

    blocks.forEach((block) => observer.observe(block));
    return () => observer.disconnect();
  }, []);

  // Native #letter navigation scrolls nothing once the page lives inside
  // ScrollRoot: a `filter` on an ancestor (the liquid-glass surface) stops
  // Chrome/Firefox from treating #page-scroller as the scrolling box a
  // fragment jump should target. Drive it by hand instead — falls through to
  // the plain href, and thus works with no JS, whenever ScrollRoot's
  // scroller isn't there to find (e.g. its filter never mounted).
  function scrollToLetter(event: React.MouseEvent<HTMLAnchorElement>) {
    const scroller = getScroller();
    const target = document.getElementById("letter");
    if (!scroller || !target) return;
    event.preventDefault();
    const delta =
      target.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    scroller.scrollTo({ top: scroller.scrollTop + delta, behavior: "smooth" });
    history.pushState(null, "", "#letter");
  }

  return (
    <ContactModalProvider>
      <GlassProvider>
        {/* Same persistent pill nav as the homepage, so moving between the
            two never feels like leaving the site. */}
        <SiteNav />
        {/* Safari/iOS: same pill-sized WebGL refraction as the homepage. Its
            generic fallback (no hero-specific data-nav-glass-* hooks here)
            reads whatever's inside ScrollRoot's #page-scroll-content, which
            is this page's own hero/portrait/scene images. */}
        <YbouaneNavGlass />
        {/* Chrome/Blink: the real per-pixel refraction, filtering this
            page's own scroll container exactly like the homepage's. No
            Lenis here, so smoothScroll asks it for native CSS smooth-scroll
            instead, to keep the "Read our letter" anchor jump from going
            instant. */}
        <ScrollRoot smoothScroll>
          <main ref={rootRef} className={styles.page} data-manifesto>
            <noscript>
              <style>{`[data-reveal] { opacity: 1 !important; transform: none !important; }`}</style>
            </noscript>
            <section className={styles.hero} aria-labelledby="manifesto-title">
              {/* Responsive local assets: this site is a static export. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/manifesto-kerala-1536.webp"
                srcSet="/images/manifesto-kerala-768.webp 768w, /images/manifesto-kerala-1536.webp 1536w"
                sizes="(max-width: 767px) 1350px, 100vw"
                width={1536}
                height={1024}
                fetchPriority="high"
                alt=""
                className={styles.heroImage}
              />
              <div className={styles.opening}>
                <p className={styles.eyebrow}>THE DESH MANIFESTO</p>
                <h1 id="manifesto-title" className={styles.title}>
                  A world away.
                  <br />
                  <span className={styles.homeLine}>
                    Still <span className={styles.dropCap}>h</span>ome.
                  </span>
                </h1>
                <p className={styles.lede}>
                  A life abroad should bring you closer to everything you hoped to
                  build at home.
                </p>
                <a href="#letter" className={styles.readLink} onClick={scrollToLetter}>
                  Read our letter <ArrowDown size={16} aria-hidden="true" />
                </a>
              </div>
              <div className={styles.heroCaption} aria-hidden="true">
                <span>ROOTED IN INDIA. MADE FOR YOUR WORLD.</span>
                <span>A LETTER FROM THE FOUNDERS</span>
              </div>
            </section>

            <article
              id="letter"
              className={styles.letter}
              aria-label="A letter from the founders"
            >
              <section className={styles.origin}>
                <div className={styles.prose}>
                  <p className={styles.salutation}>
                    <span aria-hidden="true">👋</span> Hi Reader far from home,
                  </p>
                  <p className={styles.introduction} data-reveal="hidden">
                    You moved abroad. Your connection to India moved with you.
                  </p>
                  <p data-reveal="hidden">
                    It lives in the money you send your parents, the home you hope to
                    buy, the savings you’ve built, and the thought that you might
                    return one day.
                  </p>
                  <p data-reveal="hidden">
                    Over <strong>34 Million people</strong> carry that connection, the
                    largest diaspora on the planet, spread across <strong>208 countries.</strong>{" "}
                    In FY25, the Indian diaspora sent <strong>$135.6 billion</strong>{" "}
                    back home, nearly double what the country spends on national
                    defense in a year.
                  </p>
                </div>
              </section>

              <section className={styles.chapter}>
                <div className={styles.prose}>
                  <p data-reveal="hidden">
                    Today, a missing signature can send your application back to the
                    beginning. A cousin has to stand in a queue on your behalf. A visit
                    home becomes a list of bank appointments.
                  </p>
                  <p data-reveal="hidden">
                    None of this is because Indian finance lacks the money or the
                    technology to fix it. It&apos;s because serving people across a border
                    is genuinely harder, every transaction gets watched more closely
                    by design, and the compliance load is heavier than most companies
                    want to carry. So they don&apos;t carry it. They build for the market
                    at home, and 34 million people abroad get treated as an edge case:
                    a rational business decision that adds up to a very large, very
                    avoidable failure.
                  </p>
                </div>
              </section>

              <div className={styles.belief}>
                <h2 className={styles.beliefText} data-reveal="hidden">
                  Indians abroad<br /> deserve better
                </h2>
              </div>

              <section className={styles.promise}>
                <div className={styles.prose}>
                  <p className={styles.promiseLead} data-reveal="hidden">
                    So we&apos;re building Desh: one place to invest, move money, file your
                    taxes, insure your family, buy property and access credit in India.
                  </p>
                  <p data-reveal="hidden">
                    Within a decade, more Indians will live outside the country than
                    ever before, responsible for more capital than most single
                    industries in India. What happens to that money, and how connected
                    it stays to home, will help shape what India becomes next.
                  </p>
                </div>
              </section>

              <div className={styles.signoff} data-reveal="hidden">
                <p className={styles.closing}>
                  We&apos;re building Desh so distance is never the reason that connection
                  breaks.
                </p>
                <div className={styles.founders} aria-hidden="true">
                  {FOUNDERS.map((founder) => (
                    <span key={founder.name} className={styles.founder}>
                      <Image
                        src={founder.src}
                        alt=""
                        width={founder.width}
                        height={founder.height}
                        className={styles.founderPhoto}
                        loading="lazy"
                      />
                    </span>
                  ))}
                </div>
                <p className={styles.signature}>
                  {FOUNDERS.map((founder) => founder.name).join(" and ")}
                </p>
                <p className={styles.founderCaption}>Co-founders, Desh</p>
              </div>

              <div className={styles.welcomeBlock} data-reveal="hidden">
                <h2 className={styles.welcome}>
                  <span className={styles.dropCap}>W</span>elcome to Desh.
                </h2>
                <Link href="/book" className={`${buttonStyles.button} ${styles.cta}`}>
                  Let's talk Money <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
              </div>
            </article>
            <div className={styles.scene}>
              {/* next/image cannot serve these variants under output: "export" —
                  same reason Footer.tsx hand-rolls this. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/footer-scene.webp"
                srcSet={SCENE_SRCSET}
                sizes="100vw"
                alt=""
                width={2880}
                height={1598}
                loading="lazy"
                decoding="async"
                className={styles.sceneImage}
              />
              <p className={styles.sceneMeta}>© 2026 Desh</p>
            </div>
          </main>
        </ScrollRoot>
      </GlassProvider>
    </ContactModalProvider>
  );
}
