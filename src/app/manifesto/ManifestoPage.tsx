"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import buttonStyles from "@/components/ui/Button.module.css";
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
  { name: "Aswin", src: "/images/aswin-portrait.webp", width: 809, height: 1024 },
  { name: "Vinayak", src: "/images/vinayak-portrait.webp", width: 168, height: 168 },
];

/**
 * The manifesto — one long letter, read top to bottom.
 *
 * Deliberately NOT built like the homepage. No pinned scroll sequence, no
 * ScrollRoot, no full-viewport sections: this is a single centred column on
 * white, the way a printed statement reads. The only movement is a
 * per-block fade-up as each one enters view.
 *
 * Type does the whole job. Serif (--font-body) carries the argument; the
 * four turns in it are lifted into Mona Sans at display size; the closing
 * "Welcome to Desh." takes the same script drop cap every section heading
 * on the homepage wears.
 */
export default function ManifestoPage() {
  const rootRef = useRef<HTMLElement>(null);

  /**
   * Reveal on scroll, by IntersectionObserver rather than GSAP/ScrollTrigger.
   * The homepage's triggers are all bound to ScrollRoot's custom scroller
   * (lib/scroller.ts); this page scrolls in its own element and has no
   * business pulling that machinery in for one fade.
   *
   * Blocks ship as data-reveal="hidden" in the markup, so nothing flashes in
   * before hydration and back out. The two ways that could strand content
   * invisible are both covered: a <noscript> style below, and a
   * prefers-reduced-motion rule in the stylesheet.
   */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const blocks = Array.from(
      root.querySelectorAll<HTMLElement>('[data-reveal="hidden"]'),
    );
    const show = (el: HTMLElement) => {
      el.dataset.reveal = "shown";
    };

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
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

  return (
    <main ref={rootRef} className={styles.page}>
      {/* Without JS there is no observer to un-hide anything, so the hidden
          state has to be lifted wholesale. */}
      <noscript>
        <style>{`[data-reveal] { opacity: 1 !important; transform: none !important; }`}</style>
      </noscript>

      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={18} aria-hidden="true" />
          Back to Desh
        </Link>
        <Link href="/" aria-label="Desh home" className={styles.brand}>
          {/* Decorative: the logotype beside it already carries the name. */}
          <Image
            src="/images/desh-logo-symbol.svg"
            alt=""
            width={62}
            height={58}
            className={styles.brandSymbol}
            aria-hidden="true"
          />
          <Image
            src="/images/desh-logo-mark.svg"
            alt="Desh"
            width={63}
            height={21}
            className={styles.brandLogo}
          />
        </Link>
      </header>

      <article className={styles.letter}>
        <div className={styles.opening} data-reveal="hidden">
          {/* The two people who wrote it, overlapped into one lockup. Marked
              decorative because .signature below names them in text — the
              alternative announces both names twice. */}
          <div className={styles.founders} aria-hidden="true">
            {FOUNDERS.map((founder) => (
              <span key={founder.name} className={styles.founder}>
                <Image
                  src={founder.src}
                  alt=""
                  width={founder.width}
                  height={founder.height}
                  className={styles.founderPhoto}
                  priority
                />
              </span>
            ))}
          </div>
          <p className={styles.signature}>
            {FOUNDERS.map((founder) => founder.name).join(" & ")}
          </p>
          <h1 className={styles.title}>
            <span className={styles.dropCap}>D</span>esh.
          </h1>
          <p className={styles.lede}>
            For generations, Indians have left home to build a life somewhere
            else.
          </p>
          <hr className={styles.rule} />
        </div>

        <div className={styles.prose}>
          <p data-reveal="hidden">
            They moved for work, for opportunity, for family, for a better
            future. But moving away never really meant leaving India behind.
          </p>
          <p data-reveal="hidden">
            Your salary might arrive in dirhams, pounds or dollars. But your
            parents are here. Your property is here. Your savings are here.
            Your taxes, investments, insurance, responsibilities and plans for
            the future often still have one foot in India.
          </p>
          <p data-reveal="hidden">
            And somehow, managing all of that from abroad is still
            unnecessarily hard.
          </p>
          <p data-reveal="hidden">
            A bank account needs a branch visit. An investment needs another
            set of documents. A tax question goes to a CA. Property gets
            managed through a relative. Important decisions happen over
            WhatsApp, email, phone calls and PDFs passed between people you
            hope you can trust.
          </p>
        </div>

        <h2 className={styles.statement} data-reveal="hidden">
          Most Indian financial products were built for people living in India.{" "}
          <span className={styles.statementCoda}>
            If you live abroad, you are usually an exception to the flow.
          </span>
        </h2>

        <div className={styles.prose}>
          <p data-reveal="hidden">
            We kept meeting people who had learned to live with this. People
            earning well, saving seriously and wanting to build wealth in
            India, but still unsure whether their account was set up correctly,
            whether an investment was compliant, whether they were paying too
            much tax, or simply who they could trust to get something done back
            home.
          </p>
        </div>

        <h2 className={styles.statement} data-reveal="hidden">
          So we started Desh.
        </h2>

        <div className={styles.prose}>
          <p data-reveal="hidden">
            Not with an app, but with conversations. We spoke to Indians across
            countries, answered their questions, sat through onboarding
            processes with them and watched where things broke.
          </p>
          <p data-reveal="hidden">
            The more we listened, the more obvious the problem became.
          </p>
          <p data-reveal="hidden">
            Global Indians do not need another mutual fund app, remittance app,
            bank, tax portal or property marketplace.
          </p>
          <p className={styles.proseLift} data-reveal="hidden">
            They need one place that understands the whole relationship they
            have with India.
          </p>
        </div>

        {/* One sentence per line: the copy is already a list, so it is set as
            one instead of running seven short sentences into a paragraph. */}
        <p className={styles.list} data-reveal="hidden">
          <span>A place to invest.</span>
          <span>Move money.</span>
          <span>Manage accounts.</span>
          <span>Understand taxes.</span>
          <span>Buy insurance.</span>
          <span>Purchase property.</span>
          <span>Get credit.</span>
        </p>

        <div className={styles.prose}>
          <p data-reveal="hidden">
            And eventually handle the countless other things that become harder
            simply because you are thousands of kilometres away.
          </p>
          <p data-reveal="hidden">That is what we want Desh to become.</p>
        </div>

        <h2 className={styles.statement} data-reveal="hidden">
          A financial home for Indians abroad.
        </h2>

        <div className={styles.prose}>
          <p data-reveal="hidden">
            Built around their lives, not adapted to them as an afterthought.
            Simple where the system is complicated. Human where trust matters.
            Digital where paperwork should have disappeared years ago.
          </p>
        </div>

        <p className={styles.closing} data-reveal="hidden">
          <span>You may live anywhere in the world.</span>
          <span className={styles.closingLift}>
            India should never feel difficult to manage from there.
          </span>
        </p>

        <div className={styles.welcomeBlock} data-reveal="hidden">
          <h2 className={styles.welcome}>
            <span className={styles.dropCap}>W</span>elcome to Desh.
          </h2>
          <Link href="/book" className={buttonStyles.button}>
            Book a conversation
          </Link>
        </div>
      </article>

      {/* The homepage's closing artwork, reused as this page's own sign-off —
          its top third is genuinely transparent, so it fades straight out of
          the paper colour above with no seam to hide. */}
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
  );
}
