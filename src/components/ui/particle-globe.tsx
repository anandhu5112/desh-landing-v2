"use client";

import { useEffect, useRef } from "react";
import styles from "./particle-globe.module.css";

/**
 * Stands in for the reference orbiting-circles-02 component's center
 * `ParticleSphereAnimation` (a Tailwind/three.js piece whose source wasn't
 * available to port). Rebuilt as a plain 2D-canvas dot sphere — same
 * resize/rAF-cleanup shape as Hero.tsx's own canvas effect — so it needs no
 * new dependency (no three.js in this project) and slots into
 * OrbitingAvatars the same way the reference's globe sits inside its rings.
 */

const DOT_COUNT = 220;
const ROTATE_SPEED = 0.0022; // radians per frame

interface Point {
  x: number;
  y: number;
  z: number;
}

function buildFibonacciSphere(count: number): Point[] {
  const points: Point[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;

    points.push({
      x: Math.cos(theta) * radiusAtY,
      y,
      z: Math.sin(theta) * radiusAtY,
    });
  }

  return points;
}

export function ParticleGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const points = buildFibonacciSphere(DOT_COUNT);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let size = 0;
    let angle = 0;
    let rafId: number | null = null;

    function resizeCanvas() {
      size = container!.clientWidth;
      canvas!.width = size * dpr;
      canvas!.height = size * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resizeCanvas();

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);

    function draw() {
      const radius = size / 2;
      const cx = radius;
      const cy = radius;
      const sphereR = radius * 0.86;

      ctx!.clearRect(0, 0, size, size);

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      // Rotate around Y then project with a simple fixed-distance
      // perspective — sorted back-to-front so nearer dots draw on top.
      const projected = points
        .map(({ x, y, z }) => {
          const rx = x * cos - z * sin;
          const rz = x * sin + z * cos;
          const perspective = 2.4 / (2.4 + rz);
          return {
            x: cx + rx * sphereR * perspective,
            y: cy + y * sphereR * perspective,
            z: rz,
            scale: perspective,
          };
        })
        .sort((a, b) => a.z - b.z);

      for (const p of projected) {
        const depth = (p.z + 1) / 2; // 0 (far) → 1 (near)
        const dotR = 1.1 * p.scale;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, Math.max(dotR, 0.4), 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(0, 0, 0, ${0.12 + depth * 0.38})`;
        ctx!.fill();
      }

      angle += ROTATE_SPEED;
      rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className={styles.globe} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}

export default ParticleGlobe;
