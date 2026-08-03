"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import { ParticleGlobe } from "@/components/ui/particle-globe";
import styles from "./orbiting-avatars.module.css";

/**
 * Adapted from a Tailwind reference component (orbiting-circles-02): company
 * logos swapped for real advisor/community photos, motion slowed to roughly
 * half the original speed, and the whole thing ported off Tailwind onto this
 * project's CSS Modules convention. The reference's center ParticleSphere
 * sub-component is rebuilt locally as a 2D-canvas dot globe (see
 * ui/particle-globe.tsx) since its actual source wasn't available to port.
 */

const AVATARS = [
  "/images/advisor-avatar-1.png",
  "/images/advisor-avatar-2.png",
  "/images/advisor-avatar-3.png",
  "/images/advisor-avatar-4.png",
  "/images/advisor-avatar-5.png",
  "/images/advisor-avatar-6.png",
  "/images/advisor-avatar-7.png",
  "/images/advisor-avatar-8.png",
  "/images/advisor-avatar-9.png",
];

interface Orbit {
  ringClass: "ring0" | "ring1" | "ring2";
  /** Full loop duration in seconds — large on purpose; see module comment. */
  duration: number;
  angles: number[];
}

const ORBITS: Orbit[] = [
  { ringClass: "ring0", duration: 36, angles: [-60, 0, 60] },
  { ringClass: "ring1", duration: 48, angles: [0, -90] },
  { ringClass: "ring2", duration: 60, angles: [-60, 0, 60] },
];

export function OrbitingAvatars() {
  // Running index across all rendered chips, independent of each orbit's
  // own angle count — keeps consecutive chips on different photos instead
  // of two same-orbit mirrored angles landing on the same avatar.
  let avatarCursor = 0;

  return (
    <div className={styles.container} aria-hidden="true">
      <ParticleGlobe />

      {ORBITS.map((orbit, orbitIndex) => {
        const isCw = orbitIndex % 2 === 0;
        const orbitAnimClass = isCw ? styles.orbitCw : styles.orbitCcw;
        const counterAnimClass = isCw ? styles.counterCw : styles.counterCcw;

        // Mirrored to the opposite side of the ring, same as the reference.
        const angles = [...orbit.angles, ...orbit.angles.map((a) => a + 180)];

        return (
          <div key={orbitIndex} className={`${styles.ring} ${styles[orbit.ringClass]}`}>
            {angles.map((angle, avatarIndex) => {
              const avatarSrc = AVATARS[avatarCursor % AVATARS.length];
              avatarCursor += 1;

              return (
                <div
                  key={avatarIndex}
                  className={`${styles.iconOrbit} ${orbitAnimClass}`}
                  style={
                    {
                      "--start-angle": `${angle}deg`,
                      animationDuration: `${orbit.duration}s`,
                    } as CSSProperties
                  }
                >
                  <div
                    className={`${styles.chip} ${counterAnimClass}`}
                    style={
                      {
                        "--counter-offset": `${-angle}deg`,
                        animationDuration: `${orbit.duration}s`,
                      } as CSSProperties
                    }
                  >
                    <Image
                      src={avatarSrc}
                      alt=""
                      fill
                      sizes="56px"
                      className={styles.chipImg}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default OrbitingAvatars;
