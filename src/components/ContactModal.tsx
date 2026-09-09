"use client";

import {
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, InstagramLogo, X } from "@phosphor-icons/react/dist/ssr";
import Button from "@/components/ui/Button";
import { CAL_BOOKING_URL } from "@/lib/booking";
import { getScroller } from "@/lib/scroller";
import styles from "./ContactModal.module.css";

const JOIN_AVATARS = [
  "/images/join-avatar-1.png",
  "/images/join-avatar-2.png",
  "/images/join-avatar-3.png",
  "/images/join-avatar-4.png",
];

type Stat = { value: string; label: string; caption: string };

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

export type ContactTab = "start" | "contact" | "join";

/** Everything focusable the tab trap should cycle through. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type ContactModalProps = {
  open: boolean;
  onClose: () => void;
  /** Which tab a CTA wants this opened on. */
  initialTab?: ContactTab;
};

/**
 * "Connect with us" — opened from SiteNav's Contact us pill and from every
 * "Talk to an Advisor" CTA on the page, via ContactModalProvider. Portaled
 * to document.body so its fixed backdrop/z-index never has to fight the
 * stacking contexts Hero's pinned layers already claim.
 */
export default function ContactModal({
  open,
  onClose,
  initialTab = "start",
}: ContactModalProps) {
  const [activeTab, setActiveTab] = useState<ContactTab>(initialTab);
  // What's actually rendered — lags one dissolve behind `activeTab` while a
  // tab switch is mid-transition, so the swap itself happens while the
  // content is faded out rather than popping instantly.
  const [contentTab, setContentTab] = useState<ContactTab>(initialTab);
  const [tabDissolving, setTabDissolving] = useState(false);

  const tabTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (tabTimer.current) clearTimeout(tabTimer.current);
  }, [open]);

  function selectTab(tab: ContactTab) {
    if (tab === activeTab) return;
    // The tab button itself highlights immediately; only the content below
    // it dissolves.
    if (tabTimer.current) clearTimeout(tabTimer.current);
    setActiveTab(tab);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setContentTab(tab);
      return;
    }

    setTabDissolving(true);
    tabTimer.current = setTimeout(() => {
      setContentTab(tab);
      setTabDissolving(false);
    }, DISSOLVE_MS);
  }

  const cardRef = useRef<HTMLDivElement>(null);

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
      // Each entry point starts on its requested screen.
      setActiveTab(initialTab);
      setContentTab(initialTab);
      setTabDissolving(false);
    } else {
      // No animationend ever fires once the exit animation itself is
      // suppressed by reduced-motion, so skip "closing" and unmount
      // immediately instead of waiting on an event that won't come.
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setPhase(reduceMotion ? "closed" : "closing");
    }
  }

  // Escape closes, Tab stays inside the dialog, and page scroll is locked
  // while open (including through the closing animation) so the page behind
  // can't scroll under the backdrop.
  useEffect(() => {
    if (phase === "closed") return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (phase !== "open") return;

      if (event.key === "Escape") {
        onClose();
        return;
      }

      // aria-modal only tells assistive tech the rest of the page is inert;
      // it does nothing for the Tab key, so the trap has to be explicit or
      // focus walks straight out into the page behind the backdrop.
      if (event.key !== "Tab") return;

      const card = cardRef.current;
      if (!card) return;

      const focusable = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === card)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    // Locks ScrollRoot's scroller, not body — body no longer scrolls (see
    // lib/scroller.ts), so hiding its overflow would leave the page free to
    // scroll on behind the backdrop.
    const scroller = getScroller() ?? document.body;
    const previousOverflow = scroller.style.overflow;
    scroller.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      scroller.style.overflow = previousOverflow;
    };
  }, [phase, onClose]);

  // Move focus into the dialog on open and hand it back to whatever opened
  // it on close — otherwise a keyboard user lands back at the top of the
  // document, nowhere near the CTA they just pressed.
  useEffect(() => {
    if (phase !== "open") return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    // The card itself, not its first control: the visitor should hear the
    // dialog's name before being dropped onto a radio group.
    cardRef.current?.focus();

    return () => previouslyFocused?.focus?.();
  }, [phase]);

  useEffect(() => {
    // A screen switch can remove the button that held focus.
    if (phase === "open" && !cardRef.current?.contains(document.activeElement)) {
      cardRef.current?.focus();
    }
  }, [contentTab, phase]);

  if (phase === "closed") return null;

  const closing = phase === "closing";
  const isBooking = contentTab === "contact";

  // Fires for both the backdrop's and the card's own animation (each has
  // its own listener below) — actually unmounts once the exit finishes.
  function handleAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (closing && event.target === event.currentTarget) setPhase("closed");
  }

  return createPortal(
    <div
      className={`${styles.backdrop} ${closing ? styles.backdropClosing : ""}`}
      onClick={onClose}
      onAnimationEnd={handleAnimationEnd}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        className={`${styles.card} ${isBooking ? styles.bookingCard : ""} ${closing ? styles.cardClosing : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-heading"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`${styles.photo} ${isBooking ? styles.portrait : ""} ${contentTab === "start" ? styles.photoStart : ""}`}>
          <Image
            src={isBooking ? "/images/aswin-portrait.jpg" : "/images/contact-sky.jpg"}
            alt={isBooking ? "Aswin PS, co-founder of Desh" : ""}
            fill
            sizes="(max-width: 900px) 100vw, 390px"
            className={styles.photoImage}
          />
          {contentTab === "join" && (
            <StatCarousel
              items={JOIN_STATS}
              forceHidden={tabDissolving}
            />
          )}
          {isBooking && (
            <div className={styles.profile}>
              <p className={styles.profileName}>Aswin PS</p>
              <p className={styles.profileRole}>Co-founder, Desh · Finance educator</p>
              <a className={styles.instagram} href="https://www.instagram.com/aswinonfinance/" target="_blank" rel="noopener noreferrer" aria-label="Aswin on Finance on Instagram (opens in a new tab)">
                <InstagramLogo size={22} aria-hidden="true" />
                @aswinonfinance
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </div>
          )}
        </div>

        <div className={`${styles.content} ${contentTab === "start" ? styles.contentStart : ""} ${isBooking ? styles.bookingContent : ""}`}>
          <div className={styles.header}>
            {isBooking ? <p className={styles.eyebrow}>Let’s talk</p> : <h2
              id="contact-modal-heading"
              className={`${styles.heading} ${tabDissolving ? styles.headingHidden : ""}`}
            >
              {contentTab === "start" ? (
                <>Home is more than one place.<br />Your future can be, too.</>
              ) : "Meet the community"}
            </h2>}
            <div className={styles.headerActions}>
              {contentTab === "join" ? (
                <button type="button" className={styles.back} onClick={() => selectTab("start")}>
                  Back
                </button>
              ) : null}
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

          {contentTab === "join" && <hr className={styles.divider} />}

          {contentTab === "start" ? (
            <div className={`${styles.startBody} ${tabDissolving ? styles.bodyHidden : ""}`}>
              <p className={styles.startCopy}>
                Let’s talk about what you want to build in India, abroad, and wherever life takes you.
              </p>
              <div className={styles.startActions}>
                <Button type="button" onClick={() => selectTab("contact")}>
                  Let’s talk <span aria-hidden="true">→</span>
                </Button>
                <p className={styles.communityPrompt}>
                  Still finding your bearings?{" "}
                  <button type="button" className={styles.communityLink} onClick={() => selectTab("join")}>
                    Meet the Desh community.
                  </button>
                </p>
              </div>
            </div>
          ) : contentTab === "contact" ? (
            <div className={`${styles.bookingBody} ${tabDissolving ? styles.bodyHidden : ""}`}>
              <h2 id="contact-modal-heading" className={styles.bookingHeading}>
                Your next step starts<br className={styles.desktopBreak} /> with a conversation.
              </h2>
              <p className={styles.bookingCopy}>
                You may know Aswin from his finance explainers. Meet the people
                behind Desh and explore what comes next for your money.
              </p>
              <div className={styles.bookingDetails}>
                <h3>A little clarity on your next move.</h3>
                <p className={styles.bookingCopy}>
                  Talk through your goals, ask your questions, and see how Desh can help.
                </p>
              </div>
              <div className={styles.bookingActions}>
                <Button href={CAL_BOOKING_URL} target="_blank" rel="noopener noreferrer" className={styles.bookingButton}>
                  Find a time to talk <ArrowRight size={24} aria-hidden="true" />
                </Button>
                <p className={styles.bookingCaption}>Choose a time on Cal.com</p>
              </div>
            </div>
          ) : (
            // The QR is the available community invitation.
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
                  Join our NRI community on WhatsApp.
                </p>
                <p className={styles.joinInstructions}>
                  Scan this code with your phone camera to open the community invite
                  in WhatsApp.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
