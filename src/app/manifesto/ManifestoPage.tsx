"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUpRight,
} from "@phosphor-icons/react/dist/ssr";

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

  return (
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
          <a href="#letter" className={styles.readLink}>
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
              To everyone building a life away from home,
            </p>

            <p data-reveal="hidden">
              We both grew up in Kerala, where the work people did thousands of
              kilometres away changed the lives of those back home. Money earned
              abroad paid for education, supported parents and gave families
              room to imagine a different future. Over generations, it helped
              reshape an entire state.
            </p>
            <p data-reveal="hidden">
              We saw it in our own families. Long before we thought about
              building a company, we understood what that connection could make
              possible.
            </p>
            <p data-reveal="hidden">
              The same story runs through millions of Indian households. People
              leave to build a better life, and keep building a part of that
              life here. They send money home, save for a house, invest for the
              future and look after the people who made their journey possible.
            </p>
            <p data-reveal="hidden">
              Yet even the simplest responsibility can become difficult from
              abroad. An investment begins with conflicting advice. A tax
              question turns into weeks of follow-ups. A parent’s insurance or
              an unpaid bill becomes another favour to ask of someone back home.
            </p>
          </div>
        </section>

        <section className={styles.chapter}>
          <div className={styles.prose}>
            <p data-reveal="hidden">
              Most Indian financial products assume you live here. That you have
              a local number, can visit a branch and know someone to call when
              things get stuck. Once you move abroad, those assumptions break.
              The work of joining everything together falls to you.
            </p>
            <p data-reveal="hidden">
              Serving people across borders is hard. The rules are more complex,
              the paperwork is heavier, and getting things done takes real work
              on the ground. It is easier to build for the domestic market. So
              people with deep ties to India are left arranging their lives
              through relatives, scattered advice and patient persistence.
            </p>
          </div>
        </section>

        <div className={styles.belief}>
          <h2 className={styles.beliefText} data-reveal="hidden">
            Home shouldn’t be
            <br />
            this complicated.
          </h2>
        </div>

        <section className={styles.chapter}>
          <div className={styles.prose}>
            <p data-reveal="hidden">
              Through Aswin’s audience, we hear how far the everyday experience
              still has to go. Nearly 40% live outside India. People come to us
              trying to invest, plan for their families or simply get their
              taxes done. They are ready to act. What holds them back is
              uncertainty about the next step, the rules and whom to trust.
            </p>
            <p data-reveal="hidden">
              Those conversations have given us a clear place to begin: take
              responsibility for helping people through the whole process.
              Explain what applies to their situation. Make the next step clear.
              Follow through until the work is done.
            </p>
          </div>
        </section>

        <section className={styles.promise}>
          <div className={styles.prose}>
            <p data-reveal="hidden">
              That is why we are building Desh: a financial home for Indians
              abroad.
            </p>
            <p data-reveal="hidden">
              Our ambition is to bring the financial life you have in India
              together in one place. To help you invest, move money, understand
              your taxes, arrange insurance, buy a home and access credit with
              confidence in the decisions you are making.
            </p>
            <p data-reveal="hidden">
              Earning that trust means understanding the life around the money:
              the parents who depend on you, the home you hope to return to, the
              plans that stretch across two countries. It means building around
              those realities from the beginning and being there when something
              needs a person to see it through.
            </p>
            <p data-reveal="hidden">
              We grew up watching what a life abroad could make possible for a
              family back home. We are building Desh because that possibility
              matters to us. We want more people to be able to act on it, with
              less uncertainty and more of their time left for the people they
              are doing it all for.
            </p>
          </div>
        </section>

        <div className={styles.signoff} data-reveal="hidden">
          <p className={styles.closing}>
            Wherever you build your life,
            <br />
            you should be able to count on a place back home.
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
            {FOUNDERS.map((founder) => founder.name).join(" & ")}
          </p>
          <p className={styles.founderCaption}>Co-founders, Desh</p>
        </div>

        <div className={styles.welcomeBlock} data-reveal="hidden">
          <h2 className={styles.welcome}>
            <span className={styles.dropCap}>W</span>elcome to Desh.
          </h2>
          <Link href="/book" className={`${buttonStyles.button} ${styles.cta}`}>
            Book a conversation <ArrowUpRight size={18} aria-hidden="true" />
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
  );
}
