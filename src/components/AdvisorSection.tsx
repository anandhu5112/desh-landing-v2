import Image from "next/image";
import Button from "@/components/ui/Button";
import styles from "./AdvisorSection.module.css";

/**
 * "Got questions about your money?" — Figma node 482:3507. Sits between
 * UsSection and GrowSection (see ServicesSection.tsx). Copied, not shared:
 * same house rule as every other section.
 *
 * Static — earlier versions of this section played a scroll-triggered
 * animation (a "Portfolio Calibration Recommended" card that crossfaded
 * into this "Total value" card on click). That's gone: node 482:3507 only
 * ever shows this one settled state, and the interaction was dropped by
 * explicit request in favor of matching this frame exactly.
 *
 * Every position below is a percentage of the card's own 1376x657 box
 * (Figma's literal px positions, converted — see each rule's own comment
 * for the source numbers), not a grid/container-query system like the
 * animated version used — the whole layout is one aspect-ratio-locked
 * card, so percentages alone keep every element's position exactly
 * proportional at any width without extra machinery.
 */
export default function AdvisorSection() {
  return (
    <section className={styles.section}>
      <div className={styles.frame}>
        <Image
          src="/images/advisor-sky.png"
          alt=""
          width={2000}
          height={1160}
          className={styles.bgImage}
        />

        <div className={styles.content}>
          <h2 className={styles.heading}>
            <span className={styles.dropCap}>G</span>ot questions about
            <br />
            your money?
          </h2>
          <p className={styles.subtext}>
            Whether you&apos;re starting your investment journey or managing a growing
            portfolio, receive personalised guidance whenever you need it.
          </p>
          <Button type="button" className={styles.cta}>
            Book a Free Consultation
          </Button>
        </div>

        <div className={styles.photo}>
          <Image
            src="/images/advisor-video-call.png"
            alt="An investor on a video call with their Desh advisor"
            width={2000}
            height={1333}
            className={styles.photoImg}
          />
        </div>

        {/* A live-looking product moment, not a real alert — decorative,
            so it's hidden from assistive tech rather than announced as an
            actual notification needing action. */}
        <div className={styles.insightCard} aria-hidden="true">
          <div className={styles.insightHead}>
            <p className={styles.totalValueLabel}>Total value</p>
            <div className={styles.insightStatus}>
              <Image src="/images/icon-status-dot.svg" alt="" width={10} height={10} />
              <span>Monitoring</span>
            </div>
          </div>

          <p className={styles.totalValueAmount}>₹ 24,72,480</p>

          <div className={styles.totalValueMetaRow}>
            <div className={styles.totalValueChange}>
              <span>+12.84%</span>
              <span>+₹5,09,776</span>
            </div>
            <p className={styles.totalValueUpdated}>updated 2 mins ago</p>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element -- a plain
              vector line chart, not a photo; next/image's optimizer adds
              nothing here, and nothing needs to target its <path> anymore
              now that the section is static. */}
          <img src="/images/advisor-graph-line.svg" alt="" className={styles.graphImg} />
        </div>
      </div>
    </section>
  );
}
