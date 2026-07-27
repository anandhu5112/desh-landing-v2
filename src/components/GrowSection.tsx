import Image from "next/image";
import SphereImageGrid, { type ImageData } from "@/components/ui/img-sphere";
import styles from "./GrowSection.module.css";

// AMC logos — all 512x512 squares, so object-cover fills the circle without cropping.
const BASE_SPHERE_IMAGES: Omit<ImageData, "id">[] = [
  { src: "/images/amc/axis_groww.png", alt: "Axis Mutual Fund" },
  { src: "/images/amc/birla_groww.png", alt: "Aditya Birla Mutual Fund" },
  { src: "/images/amc/boi_groww.png", alt: "Bank of India Mutual Fund" },
  { src: "/images/amc/canara_groww.png", alt: "Canara Robeco Mutual Fund" },
  { src: "/images/amc/edelweiss_groww.png", alt: "Edelweiss Mutual Fund" },
  { src: "/images/amc/escorts_groww.png", alt: "Escorts Mutual Fund" },
  { src: "/images/amc/hdfc_groww.png", alt: "HDFC Mutual Fund" },
  { src: "/images/amc/hsbc_groww.png", alt: "HSBC Mutual Fund" },
  { src: "/images/amc/icici_groww.png", alt: "ICICI Prudential Mutual Fund" },
  { src: "/images/amc/idfc_groww.png", alt: "IDFC Mutual Fund" },
  { src: "/images/amc/indiabulls_groww.png", alt: "Indiabulls Mutual Fund" },
  { src: "/images/amc/invesco_groww.png", alt: "Invesco Mutual Fund" },
  { src: "/images/amc/jioblackrock_groww.png", alt: "Jio BlackRock Mutual Fund" },
  { src: "/images/amc/jm_groww.png", alt: "JM Financial Mutual Fund" },
  { src: "/images/amc/kotak_groww.png", alt: "Kotak Mutual Fund" },
  { src: "/images/amc/lic_groww.png", alt: "LIC Mutual Fund" },
  { src: "/images/amc/mirae_groww.png", alt: "Mirae Asset Mutual Fund" },
  { src: "/images/amc/motilal_groww.png", alt: "Motilal Oswal Mutual Fund" },
  { src: "/images/amc/peerless_groww.png", alt: "Peerless Mutual Fund" },
  { src: "/images/amc/ppfas_groww.png", alt: "Parag Parikh Mutual Fund" },
  { src: "/images/amc/quantum_groww.png", alt: "Quantum Mutual Fund" },
  { src: "/images/amc/reliance_groww.png", alt: "Reliance Mutual Fund" },
  { src: "/images/amc/sbi_groww.png", alt: "SBI Mutual Fund" },
  { src: "/images/amc/tata_groww.png", alt: "Tata Mutual Fund" },
  { src: "/images/amc/trust_groww.png", alt: "Trust Mutual Fund" },
  { src: "/images/amc/uti_groww.png", alt: "UTI Mutual Fund" },
  { src: "/images/amc/whiteoak_groww.png", alt: "WhiteOak Capital Mutual Fund" },
];

const SPHERE_IMAGES: ImageData[] = Array.from({ length: 60 }, (_, i) => {
  const base = BASE_SPHERE_IMAGES[i % BASE_SPHERE_IMAGES.length];
  return { id: `sphere-${i + 1}`, ...base, alt: `${base.alt}` };
});

/**
 * Third-section content. Purely presentational — the reveal animation is
 * driven by the Hero's GSAP timeline, so nothing here touches scroll state.
 */
export default function GrowSection() {
  return (
    <div className="grid">
      <div className={styles.card}>
        <div className={styles.text}>
          <h2 className={styles.heading}>Grow your wealth in India.</h2>
          <p className={styles.subtext}>
            Access carefully selected mutual funds designed to help NRIs invest
            confidently and achieve their long term financial goals.
          </p>
          <div className={styles.logoRow}>
            <Image
              src="/images/amfi.png"
              alt="AMFI"
              width={51}
              height={63}
              className={styles.logo}
            />
            <Image
              src="/images/sebi.png"
              alt="SEBI"
              width={105}
              height={46}
              className={styles.logo}
            />
            <span className={styles.logoCaption}>
              registered mutual fund distributor
            </span>
          </div>
          <button type="button" className={styles.cta}>
            Start Investing
          </button>
        </div>
        <div className={styles.media}>
          <SphereImageGrid
            images={SPHERE_IMAGES}
            containerSize={540}
            sphereRadius={180}
            baseImageScale={0.15}
            dragSensitivity={0.8}
            momentumDecay={0.96}
            maxRotationSpeed={6}
            hoverScale={1.3}
            perspective={1000}
            autoRotate
            autoRotateSpeed={0.2}
          />
        </div>
      </div>
    </div>
  );
}
