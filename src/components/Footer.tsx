"use client";

import { IconBrandInstagram } from "@tabler/icons-react";

import { useSnapIntoView } from "@/hooks/useSnapIntoView";
import styles from "./Footer.module.css";

/**
 * id on the glass wordmark, so WordmarkTuner can write its --wm-* custom
 * properties onto the element that declares them.
 */
export const WORDMARK_ID = "footer-wordmark";

/** Widths from `npm run optimize:images`; 2880 is the artwork's native size. */
const SCENE_SRCSET =
  "/images/footer-scene-1280.webp 1280w, " +
  "/images/footer-scene-1920.webp 1920w, " +
  "/images/footer-scene.webp 2880w";

/**
 * The closing artwork.
 *
 * Rendered more than once: the backdrop itself, plus a copy inside each
 * refracting layer of the glass wordmark. They resolve to the same srcSet
 * candidate — `sizes` is a declaration, not a measurement — so the extra
 * copies are cache hits, not downloads.
 *
 * A plain <img>, not next/image: next.config sets images.unoptimized (a
 * static export has no optimizer), so next/image would ship the one
 * native-width file to every device, and it owns the srcSet prop rather than
 * passing it through. Offering the widths directly lets a phone pull 208KB
 * instead of 808KB. Below the fold, hence lazy.
 */
function SceneImage({ className }: { className: string }) {
  return (
    // next/image cannot serve these variants under output: "export" — see
    // the note above.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/footer-scene.webp"
      srcSet={SCENE_SRCSET}
      sizes="100vw"
      alt=""
      width={2880}
      height={1598}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}

export default function Footer() {
  const sectionRef = useSnapIntoView<HTMLElement>();

  return (
    <footer ref={sectionRef} className={styles.section}>
      {/* The large "Desh" wordmark is part of this artwork, not a separate
          layer — the scene is supplied with it already composited in, and its
          transparent upper third fades into the white page above. */}
      <SceneImage className={styles.bgImage} />

      {/* Glass over the top of that composited wordmark, aligned to it to the
          pixel, so the flat white veil in the artwork becomes the frosted
          body of the letters rather than a second image showing through.
          Geometry and layer order are documented in Footer.module.css. */}
      <div id={WORDMARK_ID} className={styles.wordmark} aria-hidden="true">
        <div className={styles.wordmarkShadowWrap}>
          <div className={`${styles.wordmarkLayer} ${styles.maskFill} ${styles.wordmarkShadow}`} />
        </div>
        <div className={`${styles.wordmarkLayer} ${styles.maskFill}`}>
          <SceneImage className={`${styles.wordmarkScene} ${styles.wordmarkSceneBody}`} />
        </div>
        <div className={`${styles.wordmarkLayer} ${styles.maskFill} ${styles.wordmarkTint}`} />
        <div className={`${styles.wordmarkLayer} ${styles.maskRim}`}>
          <SceneImage className={`${styles.wordmarkScene} ${styles.wordmarkSceneRim}`} />
        </div>
        <div className={`${styles.wordmarkLayer} ${styles.maskRim} ${styles.wordmarkBevel}`} />
      </div>

      <div className={styles.content}>
        <div className={styles.bar}>
          <hr className={styles.divider} />
          <div className={styles.bottom}>
            <p className={styles.meta}>© 2026 Desh</p>
            <a
              href="https://www.instagram.com/aswinonfinance/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Aswin on Instagram"
              className={styles.social}
            >
              <IconBrandInstagram className={styles.socialIcon} stroke={1.5} />
            </a>
            <p className={styles.meta}>All rights reserved</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
