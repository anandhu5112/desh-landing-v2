"use client";

import { useEffect, useState, type AnimationEvent, type FormEvent } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X } from "@phosphor-icons/react/dist/ssr";
import Button from "@/components/ui/Button";
import styles from "./ContactModal.module.css";

const JOIN_AVATARS = [
  "/images/join-avatar-1.png",
  "/images/join-avatar-2.png",
  "/images/join-avatar-3.png",
  "/images/join-avatar-4.png",
];

type Stat = { value: string; label: string; caption: string };

const CONTACT_STATS: Stat[] = [
  {
    value: "₹1 Crore+",
    label: "Assets Guided",
    caption: "Building wealth with a disciplined, long-term investment approach.",
  },
  {
    value: "100+",
    label: "Happy NRI Investors",
    caption: "Trusted by NRIs worldwide to invest in India's growth.",
  },
  {
    value: "Always",
    label: "Human Support",
    caption: "Real advisors, real conversations, whenever you need them.",
  },
];

/** First entry is the tab's original, unchanged stat — the other two are new. */
const JOIN_STATS: Stat[] = [
  { value: "999+", label: "Active NRI Investors", caption: "Learn. Connect. Grow together." },
  {
    value: "100%",
    label: "Personalized Guidance",
    caption: "No generic recommendations—every portfolio is tailored to your goals.",
  },
  {
    value: "24–48 hrs",
    label: "Response Time",
    caption: "Quick assistance for investments, documentation, and portfolio reviews.",
  },
];

/** How long one stat stays on screen before dissolving into the next. */
const STAT_INTERVAL_MS = 4000;
/** How long the dissolve itself takes — shared with the tab-switch dissolve
    below so every crossfade in this modal moves at the same speed. */
const DISSOLVE_MS = 300;

/**
 * Rotates through `items`, dissolving from one to the next rather than
 * cutting. `forceHidden` lets the parent hold it invisible during a tab
 * switch, so the content swap underneath happens while nothing is showing.
 */
function StatCarousel({ items, forceHidden }: { items: Stat[]; forceHidden: boolean }) {
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  // Same "adjust state during render when a prop changes" pattern this file
  // already uses for prevOpen/phase above — a tab switch hands this a
  // completely different array, so reset to its first item rather than
  // carrying over an index that may not exist (or means something else) in
  // the new set.
  const [prevItems, setPrevItems] = useState(items);

  if (items !== prevItems) {
    setPrevItems(items);
    setIndex(0);
    setFading(false);
  }

  useEffect(() => {
    if (items.length <= 1) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const id = window.setInterval(() => {
      if (reduceMotion) {
        setIndex((i) => (i + 1) % items.length);
        return;
      }
      setFading(true);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % items.length);
        setFading(false);
      }, DISSOLVE_MS);
    }, STAT_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [items]);

  const current = items[index];

  return (
    <div className={`${styles.stat} ${fading || forceHidden ? styles.statHidden : ""}`}>
      <p className={styles.statValue}>{current.value}</p>
      <p className={styles.statLabel}>{current.label}</p>
      <p className={styles.statCaption}>{current.caption}</p>
    </div>
  );
}

const REASONS: { label: string; full?: boolean }[] = [
  { label: "Start my investment journey", full: true },
  { label: "Explore Indian mutual funds" },
  { label: "I want to Invest in US stocks" },
  { label: "I need help in NRI documentation" },
  { label: "Review my portfolio" },
  { label: "Something else", full: true },
];

type ContactModalProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * "Connect with us" — opened from SiteNav's Contact us pill. Portaled to
 * document.body so its fixed backdrop/z-index never has to fight the
 * stacking contexts Hero's pinned layers already claim.
 */
export default function ContactModal({ open, onClose }: ContactModalProps) {
  const [activeTab, setActiveTab] = useState<"contact" | "join">("contact");
  // What's actually rendered — lags one dissolve behind `activeTab` while a
  // tab switch is mid-transition, so the swap itself happens while the
  // content is faded out rather than popping instantly.
  const [contentTab, setContentTab] = useState<"contact" | "join">("contact");
  const [tabDissolving, setTabDissolving] = useState(false);

  function selectTab(tab: "contact" | "join") {
    if (tab === activeTab) return;
    // The tab button itself highlights immediately; only the content below
    // it dissolves.
    setActiveTab(tab);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setContentTab(tab);
      return;
    }

    setTabDissolving(true);
    window.setTimeout(() => {
      setContentTab(tab);
      setTabDissolving(false);
    }, DISSOLVE_MS);
  }

  const [reason, setReason] = useState<string>(REASONS[0].label);
  // Stays "closing" through the fade-out-down animation instead of
  // unmounting the instant `open` flips false, so the exit has time to play.
  const [phase, setPhase] = useState<"closed" | "open" | "closing">(
    open ? "open" : "closed",
  );
  // Tracks the last committed `open` so a prop change can be caught and
  // reacted to during render (React's "adjusting state when a prop
  // changes" pattern) instead of bouncing through an effect for something
  // that isn't synchronizing with an external system.
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPhase("open");
    } else {
      // No animationend ever fires once the exit animation itself is
      // suppressed by reduced-motion, so skip "closing" and unmount
      // immediately instead of waiting on an event that won't come.
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setPhase(reduceMotion ? "closed" : "closing");
    }
  }

  // Escape closes; body scroll is locked while open (including through the
  // closing animation) so the page behind can't scroll under the backdrop.
  useEffect(() => {
    if (phase === "closed") return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && phase === "open") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [phase, onClose]);

  if (phase === "closed") return null;

  const closing = phase === "closing";

  // Fires for both the backdrop's and the card's own animation (each has
  // its own listener below) — actually unmounts once the exit finishes.
  function handleAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (closing && event.target === event.currentTarget) setPhase("closed");
  }

  // No backend to send to yet — closing on submit is the honest stand-in
  // for "message sent" rather than faking a network call.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onClose();
  }

  return createPortal(
    <div
      className={`${styles.backdrop} ${closing ? styles.backdropClosing : ""}`}
      onClick={onClose}
      onAnimationEnd={handleAnimationEnd}
    >
      <div
        className={`${styles.card} ${closing ? styles.cardClosing : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-heading"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.photo}>
          <Image
            src="/images/contact-sky.jpg"
            alt=""
            fill
            sizes="322px"
            className={styles.photoImage}
          />
          <StatCarousel
            items={contentTab === "contact" ? CONTACT_STATS : JOIN_STATS}
            forceHidden={tabDissolving}
          />
        </div>

        <div className={styles.content}>
          <div className={styles.header}>
            <h2
              id="contact-modal-heading"
              className={`${styles.heading} ${tabDissolving ? styles.headingHidden : ""}`}
            >
              {contentTab === "contact" ? "Connect with us" : "Join us"}
            </h2>
            <div className={styles.headerActions}>
              <div className={styles.tabs}>
                <button
                  type="button"
                  className={`${styles.tab} ${activeTab === "contact" ? styles.tabActive : ""}`}
                  onClick={() => selectTab("contact")}
                >
                  Contact us
                </button>
                <button
                  type="button"
                  className={`${styles.tab} ${activeTab === "join" ? styles.tabActive : ""}`}
                  onClick={() => selectTab("join")}
                >
                  Join us
                </button>
              </div>
              <button
                type="button"
                className={styles.close}
                onClick={onClose}
                aria-label="Close"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
          </div>

          <hr className={styles.divider} />

          {contentTab === "contact" ? (
            <form
              className={`${styles.form} ${tabDissolving ? styles.formHidden : ""}`}
              onSubmit={handleSubmit}
            >
              <div className={styles.options}>
                {REASONS.map(({ label, full }) => (
                  <label
                    key={label}
                    className={`${styles.option} ${full ? styles.optionFull : ""}`}
                  >
                    <span className={styles.radioBox}>
                      <input
                        type="radio"
                        name="reason"
                        value={label}
                        checked={reason === label}
                        onChange={() => setReason(label)}
                        className={styles.radioInput}
                      />
                      <span className={styles.radioDot} aria-hidden="true" />
                    </span>
                    {label}
                  </label>
                ))}
              </div>

              <textarea
                className={styles.textarea}
                placeholder="Enter your message here"
                rows={4}
              />

              <div className={styles.footer}>
                <Button type="submit">Send message</Button>
              </div>
            </form>
          ) : (
            // No backend to join against yet — closing on click is the same
            // honest stand-in handleSubmit above uses for "message sent".
            <div className={`${styles.joinBody} ${tabDissolving ? styles.joinBodyHidden : ""}`}>
              <Image
                src="/images/qr-code.png"
                alt="QR code to join the Desh NRI community"
                width={380}
                height={380}
                className={styles.qrLarge}
              />
              <div className={styles.joinTextCol}>
                <div className={styles.avatarsRow}>
                  <div className={styles.avatarStack}>
                    {JOIN_AVATARS.map((src) => (
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
                  <span className={styles.plusBadge}>+999</span>
                </div>
                <p className={styles.joinHeading}>
                  Join our exclusive NRI WhatsApp community.
                </p>
                <button type="button" className={styles.joinCta} onClick={onClose}>
                  Join Our Community
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
