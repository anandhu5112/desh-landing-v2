"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

const OBSERVER_OPTIONS: IntersectionObserverInit = { threshold: 0.4 };

/**
 * Fires once — a heading that's already played its scroll-reveal shouldn't
 * replay it just because the user scrolled away and back.
 */
export function useInView<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, OBSERVER_OPTIONS);

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, inView];
}
