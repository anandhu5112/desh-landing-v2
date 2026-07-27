import AutoplayVideo from "./AutoplayVideo";
import styles from "./UsSection.module.css";

const POINTS = [
  "Invest in top US companies",
  "Grow your wealth in USD",
  "Start with a small amount",
];

/**
 * Second horizontal panel. Structurally identical to GrowSection — same grid
 * spans, typography and 40px rhythm — with a video in place of the sphere.
 */
export default function UsSection() {
  return (
    <div className="grid">
      <div className={styles.card}>
        <div className={styles.text}>
          <h2 className={styles.heading}>Invest beyond borders</h2>
          <p className={styles.subtext}>
            Own the world&apos;s leading companies and build long-term wealth in
            US dollars.
          </p>
          <ul className={styles.points}>
            {POINTS.map((point) => (
              <li key={point} className={styles.point}>
                <span className={styles.tick} aria-hidden="true">
                  ✓
                </span>
                {point}
              </li>
            ))}
          </ul>
          <button type="button" className={styles.cta}>
            Explore US Investing <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className={styles.media}>
          <AutoplayVideo src="/images/us-invest.mp4" className={styles.video} />
        </div>
      </div>
    </div>
  );
}
