import Image from "next/image";

import styles from "./PortfolioSection.module.css";

export default function PortfolioSection() {
  return (
    <section className={styles.section}>
      <div className="grid">
        <div className={styles.text}>
          <h2 className={styles.heading}>Let&apos;s build your portfolio together</h2>
          <p className={styles.subtext}>
            Get expert advice when you need it, or connect with fellow investors for
            ideas, updates, and learning.
          </p>
          <div className={styles.ctaRow}>
            <button className={`${styles.cta} ${styles.ctaBlack}`}>
              Talk to an Advisor
            </button>
            <button className={`${styles.cta} ${styles.ctaGreen}`}>
              Join Our Community
            </button>
          </div>
        </div>

        <div className={styles.media}>
          <div className={styles.whatsappCard}>
            <div className={styles.qrWrap}>
              <Image
                src="/images/qr-code.png"
                alt="QR code to join the Desh WhatsApp community"
                width={210}
                height={210}
                className={styles.qrImage}
              />
            </div>
            <div className={styles.whatsappTextCol}>
              <Image
                src="/images/avatars.png"
                alt="Members of the Desh community"
                width={150}
                height={51}
                className={styles.avatars}
              />
              <p className={styles.whatsappHeading}>
                Join our exclusive NRI WhatsApp community.
              </p>
              <p className={styles.whatsappSubtext}>
                Get guided, get invested, and build wealth back home from wherever you
                are in the world.
              </p>
            </div>
          </div>

          <div className={styles.imageWrap}>
            <Image
              src="/images/portfolio-right.png"
              alt="A quiet riverside spot with two wooden chairs"
              width={646}
              height={646}
              className={styles.image}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
