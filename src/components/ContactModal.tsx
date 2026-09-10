"use client";

import {
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import dynamic from "next/dynamic";
import { ArrowRight, ArrowUpRight, Clock, InstagramLogo, VideoCamera, X } from "@phosphor-icons/react/dist/ssr";
import Button from "@/components/ui/Button";
import { COMMUNITY_URL } from "@/lib/contact";
import { getScroller } from "@/lib/scroller";
import styles from "./ContactModal.module.css";

const BookingExperience = dynamic(() => import("@/app/book/BookingExperience"), {
  ssr: false,
  loading: () => <p className={styles.calendarLoading} role="status">Loading your calendar…</p>,
});

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
    caption: "No generic recommendations. Every portfolio is tailored to your goals.",
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

export type ContactTab = "start" | "contact" | "join" | "calendar";

/** Everything focusable the tab trap should cycle through. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

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

    // The invitation and the calendar are two layers of the same card, stacked
    // on top of each other and crossfaded in CSS (see .stepLayer and
    // .calendarStage). Committing `contentTab` right away is what starts that
    // fade, so this pair must not wait out the swap-while-invisible dissolve
    // the other tabs use — waiting would fade the invitation to nothing and
    // only then begin fading the calendar in.
    const stacked =
      (tab === "calendar" && activeTab === "contact") ||
      (tab === "contact" && activeTab === "calendar");

    if (stacked || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setContentTab(tab);
      setTabDissolving(false);
      return;
    }

    setTabDissolving(true);
    tabTimer.current = setTimeout(() => {
      setContentTab(tab);
      setTabDissolving(false);
    }, DISSOLVE_MS);
  }

  const cardRef = useRef<HTMLDivElement>(null);
  // In the booking flow the card is a fixed frame and this layer is what
  // scrolls, so a step change has to rewind it and not just the card.
  const stepLayerRef = useRef<HTMLDivElement>(null);

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

      // Both step layers stay mounted through the crossfade, so the one that
      // isn't showing is marked inert — the browser keeps it out of the tab
      // order, and the trap has to agree or Tab lands on an invisible control.
      const focusable = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((element) => !element.closest("[inert]"));
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
    cardRef.current?.scrollTo?.({ top: 0 });
    stepLayerRef.current?.scrollTo?.({ top: 0 });
    // A screen switch can remove the button that held focus.
    if (phase === "open" && !cardRef.current?.contains(document.activeElement)) {
      cardRef.current?.focus();
    }
  }, [contentTab, phase]);

  if (phase === "closed") return null;

  const closing = phase === "closing";
  // The calendar is layered over the invitation rather than replacing it, so
  // the invitation stays rendered (and keeps the card its size) on both steps.
  const isCalendar = contentTab === "calendar";
  const isBooking = contentTab === "contact" || isCalendar;

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
        // Lenis intercepts touchmove wholesale when it drives touch scrolling
        // itself (see judderExperiment), and would swallow this card's own
        // overflow-y: auto with it. The wheel path already honours this
        // attribute; touch needs it stated on the element too.
        data-lenis-prevent
        role="dialog"
        aria-modal="true"
        aria-labelledby={isCalendar ? undefined : "contact-modal-heading"}
        aria-label={isCalendar ? "Book a conversation with Desh" : undefined}
        aria-describedby={isBooking && !isCalendar ? "contact-modal-description" : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          ref={stepLayerRef}
          className={styles.stepLayer}
          data-lenis-prevent
          inert={isCalendar}
          aria-hidden={isCalendar || undefined}
        >
        <div className={`${styles.photo} ${isBooking ? styles.portrait : ""} ${contentTab === "start" ? styles.photoStart : ""}`}>
          <Image
            src={isBooking ? "/images/aswin-portrait.jpg" : "/images/contact-sky.jpg"}
            alt={isBooking ? "Aswin PS, co-founder of Desh" : ""}
            fill
            sizes={isBooking ? "(max-width: 700px) 100vw, 360px" : "(max-width: 900px) 100vw, 322px"}
            className={styles.photoImage}
          />
          {contentTab === "join" && (
            <StatCarousel
              items={JOIN_STATS}
              forceHidden={tabDissolving}
            />
          )}
          {isBooking && (
            <>
              <div className={styles.portraitBrand}>
                {/* A div, not a span: .portraitBrand span styles (and hides,
                    on mobile) the tagline underneath. */}
                <div className={styles.portraitLockup}>
                  {/* Decorative: the logotype beside it already carries the name. */}
                  <Image
                    src="/images/desh-logo-symbol.svg"
                    alt=""
                    width={62}
                    height={58}
                    className={styles.portraitSymbol}
                    aria-hidden="true"
                  />
                  <Image src="/images/desh-logo-mark.svg" alt="Desh" width={63} height={21} />
                </div>
                <span>A little closer to what’s next.</span>
              </div>
              <div className={styles.profile}>
                <p className={styles.profileName}>Aswin PS</p>
                <p className={styles.profileRole}>Co-founder, Desh · Finance educator</p>
                <a className={styles.profileSocial} href="https://www.instagram.com/aswinonfinance/" target="_blank" rel="noopener noreferrer">
                  <InstagramLogo size={17} aria-hidden="true" />
                  @aswinonfinance
                  <ArrowUpRight size={16} aria-hidden="true" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
            </>
          )}
        </div>

        <div className={`${styles.content} ${contentTab === "start" ? styles.contentStart : ""} ${isBooking ? styles.bookingContent : ""}`}>
          <div className={styles.header}>
            {isBooking ? null : <h2
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
          ) : isBooking ? (
            <div className={`${styles.bookingBody} ${tabDissolving ? styles.bodyHidden : ""}`}>
              <p className={styles.eyebrow}>A conversation with your favourite financial advisor</p>
              <h2 id="contact-modal-heading" className={styles.bookingHeading}>
                A familiar face.<br />A clearer next step.
              </h2>
              <p id="contact-modal-description" className={styles.bookingCopy}>
                You know Aswin from @aswinonfinance. Now, make the conversation about you.
              </p>
              <div className={styles.bookingMeta} aria-label="Call details">
                <span><Clock size={18} aria-hidden="true" />30 minutes</span>
                <span><VideoCamera size={18} aria-hidden="true" />Video call</span>
              </div>
              {/* Said before the booking, not after it: Desh can't onboard
                  residents of these two countries, so the call would be a
                  dead end. */}
              <p className={styles.bookingNote}>
                Desh does not currently serve residents of the United&nbsp;States or Canada.
              </p>
              <div className={styles.bookingActions}>
                <Button type="button" className={styles.bookingButton} onClick={() => selectTab("calendar")}>
                  Choose a time <ArrowRight size={21} aria-hidden="true" />
                </Button>
              </div>
            </div>
          ) : (
            // The QR is the available community invitation.
            <div className={`${styles.joinBody} ${tabDissolving ? styles.joinBodyHidden : ""}`}>
              <div className={styles.qrLargeWrap}>
                <Image
                  src="/images/qr-code.svg"
                  alt="QR code to join the Desh NRI community"
                  width={380}
                  height={380}
                  className={styles.qrLarge}
                />
              </div>
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
                <p className={styles.joinInstructionsMobile}>
                  Connect with fellow NRIs, share questions, and learn more about investing
                  back home.
                </p>
                <Button
                  href={COMMUNITY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.joinButton}
                >
                  Join community
                </Button>
              </div>
            </div>
          )}
        </div>
        </div>

        {/* Mounted as soon as the invitation is (not only once it is asked
            for), so Cal has loaded its month by the time anyone crosses over
            — arriving at an empty white panel is the one thing no amount of
            easing can smooth over. */}
        {isBooking && (
          <div
            className={`${styles.calendarStage} ${isCalendar ? styles.calendarStageActive : ""}`}
            data-lenis-prevent
            inert={!isCalendar}
            aria-hidden={!isCalendar || undefined}
          >
            <button type="button" className={styles.calendarBack} onClick={() => selectTab("contact")}>
              <ArrowRight size={16} style={{ transform: "rotate(180deg)" }} aria-hidden="true" /> Back
            </button>
            <BookingExperience embedded />
            <button type="button" className={`${styles.close} ${styles.calendarClose}`} onClick={onClose} aria-label="Close">
              <X size={16} weight="bold" />
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
