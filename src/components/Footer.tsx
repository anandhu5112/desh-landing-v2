"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { IconBrandX, IconBrandWhatsapp, IconBrandFacebook } from "@tabler/icons-react";

import { useSnapIntoView } from "@/hooks/useSnapIntoView";
import { useInView } from "@/hooks/useInView";
import { TextRotate } from "@/components/ui/text-rotate";
import Button from "@/components/ui/Button";
import styles from "./Footer.module.css";

/** Also used by ContactModal/GrowSection/UsSection — same four faces. */
const AVATARS = [
  "/images/join-avatar-1.png",
  "/images/join-avatar-2.png",
  "/images/join-avatar-3.png",
  "/images/join-avatar-4.png",
];

/** Matches .qrWrap's base width/height in Footer.module.css. */
const QR_BASE_SIZE = 166;

export default function Footer() {
  const sectionRef = useSnapIntoView<HTMLElement>();
  // Observes .heroText, not the heading itself — see GrowSection's identical
  // comment for why a zero-area heading can't be the observed element.
  const [heroTextRef, headingInView] = useInView<HTMLDivElement>();

  // Drives the QR's hover-grow target size (see .qrWrap) — how tall
  // .whatsappTextCol actually renders depends on fluid font-size tokens and
  // viewport width, so it's measured rather than hand-tuned, and kept in
  // sync via ResizeObserver rather than a one-off mount measurement.
  // .whatsappTextCol itself has flex-shrink: 0, so nothing about .qrWrap
  // growing on hover can ever feed back into this measurement — without
  // that, a transient squeeze mid-transition could change this value while
  // animating, restarting the transition and producing exactly the jerky,
  // oscillating growth this is written to avoid.
  const textColMeasureRef = useRef<HTMLDivElement>(null);
  const [qrHoverSize, setQrHoverSize] = useState(QR_BASE_SIZE);

  useEffect(() => {
    const el = textColMeasureRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      setQrHoverSize(Math.max(QR_BASE_SIZE, entry.contentRect.height));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <footer ref={sectionRef} className={styles.section}>
      <Image
        src="/images/footer-bg.png"
        alt=""
        width={4006}
        height={1536}
        className={styles.bgImage}
      />
      <div className={styles.fade} />
      <div className={styles.content}>
        {/* Its own grid, separate from .barPanel below — .content spaces the
            two apart (see .content's justify-content: space-between), so
            the hero block can sit up near the top, clear of the tagline/
            copyright bar at the bottom, revealing the chairs and hills
            between them instead of the two sitting flush together. */}
        <div className={`grid ${styles.panel}`}>
          <div className={styles.hero}>
            <div className={styles.heroCard}>
              <div ref={heroTextRef} className={styles.heroText}>
                <h2 className={styles.heading}>
                  <TextRotate
                    mainClassName={styles.headingLine}
                    texts={["Let's build your"]}
                    splitBy="words"
                    auto={false}
                    loop={false}
                    trigger={headingInView}
                  />
                  <TextRotate
                    mainClassName={styles.headingLine}
                    texts={["portfolio together"]}
                    splitBy="words"
                    auto={false}
                    loop={false}
                    trigger={headingInView}
                  />
                </h2>
                <p className={styles.subtext}>
                  Get expert advice when you need it, or connect with fellow investors
                  for ideas, updates, and learning.
                </p>
                <Button type="button" className={styles.cta}>
                  Talk to an Advisor
                </Button>
              </div>

              <hr className={styles.heroDivider} />

              <div
                className={styles.whatsappCard}
                style={{ "--qr-hover-size": `${qrHoverSize}px` } as CSSProperties}
              >
                <div className={styles.qrWrap}>
                  <Image
                    src="/images/qr-code.png"
                    alt="QR code to join the Desh WhatsApp community"
                    width={166}
                    height={166}
                    className={styles.qrImage}
                  />
                </div>
                <div ref={textColMeasureRef} className={styles.whatsappTextCol}>
                  <div className={styles.avatarStack}>
                    {AVATARS.map((src) => (
                      <Image
                        key={src}
                        src={src}
                        alt=""
                        width={30}
                        height={30}
                        className={styles.avatarImg}
                      />
                    ))}
                  </div>
                  <p className={styles.whatsappHeading}>
                    Join our exclusive NRI WhatsApp community.
                  </p>
                  <p className={styles.whatsappSubtext}>
                    Get guided, get invested, and build wealth back home from wherever
                    you are in the world.
                  </p>
                  <Button type="button" className={`${styles.cta} ${styles.ctaGreen}`}>
                    Join Our Community
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`grid ${styles.panel} ${styles.barPanel}`}>
          <div className={styles.top}>
            <p className={styles.tagline}>
              A modern investing experience built for NRIs who want a clean, credible
              path into Indian mutual funds &amp; US stocks without getting buried in
              paperwork, confusion, or bad advice.
            </p>
            <Image
              src="/images/desh-logo-white.png"
              alt="Desh"
              width={166}
              height={74}
              className={styles.logo}
            />
          </div>

          <hr className={styles.divider} />

          <div className={styles.bottom}>
            <p className={styles.copyright}>© 2026 Desh | All rights reserved</p>
            <div className={styles.socials}>
              <a href="#" aria-label="Desh on X" className={styles.social}>
                <IconBrandX className={styles.socialIcon} stroke={1.75} />
              </a>
              <a href="#" aria-label="Desh on WhatsApp" className={styles.social}>
                <IconBrandWhatsapp className={styles.socialIcon} stroke={1.75} />
              </a>
              <a href="#" aria-label="Desh on Facebook" className={styles.social}>
                <IconBrandFacebook className={styles.socialIcon} stroke={1.75} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
