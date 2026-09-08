"use client";

import {
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Check, X } from "@phosphor-icons/react/dist/ssr";
import Button from "@/components/ui/Button";
import { submitContact } from "@/lib/contact";
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

/** Exported so each CTA can name the reason it should preselect without
    re-typing a string that has to match one of these exactly. */
export const CONTACT_REASONS = {
  start: "Start my investment journey",
  india: "Explore Indian mutual funds",
  us: "Explore US stocks",
  documentation: "I need help in NRI documentation",
  portfolio: "Review my portfolio",
  other: "Something else",
} as const;

const REASONS: { label: string; full?: boolean }[] = [
  { label: CONTACT_REASONS.start, full: true },
  { label: CONTACT_REASONS.india },
  { label: CONTACT_REASONS.us },
  { label: CONTACT_REASONS.documentation },
  { label: CONTACT_REASONS.portfolio },
  { label: CONTACT_REASONS.other, full: true },
];

export type ContactTab = "start" | "contact" | "join";

type Fields = { name: string; email: string; phone: string; message: string };
type FieldName = keyof Fields;
type FieldErrors = Partial<Record<FieldName, string>>;

const EMPTY_FIELDS: Fields = { name: "", email: "", phone: "", message: "" };
/** Document order — used to focus the *first* thing that failed validation
    rather than whichever key happens to come out of the errors object. */
const FIELD_ORDER: FieldName[] = ["name", "email", "phone", "message"];

/** Deliberately loose: the point is to catch a typo'd address before it
    costs a lead, not to adjudicate RFC 5322. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(fields: Fields): FieldErrors {
  const errors: FieldErrors = {};

  if (!fields.name.trim()) {
    errors.name = "Please tell us your name.";
  }

  const email = fields.email.trim();
  if (!email) {
    errors.email = "We need an email address to reply to.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "That doesn't look like an email address.";
  }

  return errors;
}

/** Everything focusable the tab trap should cycle through. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type ContactModalProps = {
  open: boolean;
  onClose: () => void;
  /** Which tab a CTA wants this opened on. */
  initialTab?: ContactTab;
  /** Which radio option a CTA wants preselected. */
  initialReason?: string;
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
  initialReason,
}: ContactModalProps) {
  const [activeTab, setActiveTab] = useState<ContactTab>(initialTab);
  // What's actually rendered — lags one dissolve behind `activeTab` while a
  // tab switch is mid-transition, so the swap itself happens while the
  // content is faded out rather than popping instantly.
  const [contentTab, setContentTab] = useState<ContactTab>(initialTab);
  const [tabDissolving, setTabDissolving] = useState(false);

  function selectTab(tab: ContactTab) {
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

  const [reason, setReason] = useState<string>(initialReason ?? REASONS[0].label);
  const [fields, setFields] = useState<Fields>(EMPTY_FIELDS);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const cardRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

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
      // Every CTA opens this with its own intent, so an open re-seeds the
      // tab and reason rather than resuming wherever the last one left off.
      setActiveTab(initialTab);
      setContentTab(initialTab);
      setTabDissolving(false);
      if (initialReason) setReason(initialReason);
      // A sent enquiry is finished with; anything else is a half-typed one
      // worth keeping, since the commonest way back here is a backdrop
      // click closing the modal by accident.
      if (status === "sent") {
        setFields(EMPTY_FIELDS);
        setErrors({});
      }
      if (status !== "sending") setStatus("idle");
    } else {
      // No animationend ever fires once the exit animation itself is
      // suppressed by reduced-motion, so skip "closing" and unmount
      // immediately instead of waiting on an event that won't come.
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setPhase(reduceMotion ? "closed" : "closing");
    }
  }

  // Escape closes, Tab stays inside the dialog, and body scroll is locked
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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
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

  if (phase === "closed") return null;

  const closing = phase === "closing";
  const sending = status === "sending";

  // Fires for both the backdrop's and the card's own animation (each has
  // its own listener below) — actually unmounts once the exit finishes.
  function handleAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (closing && event.target === event.currentTarget) setPhase("closed");
  }

  function updateField(name: FieldName, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
    // Clear the complaint as soon as the visitor starts addressing it,
    // rather than leaving it up until the next submit.
    setErrors((current) => (current[name] ? { ...current, [name]: undefined } : current));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;

    const nextErrors = validate(fields);
    setErrors(nextErrors);

    const firstInvalid = FIELD_ORDER.find((name) => nextErrors[name]);
    if (firstInvalid) {
      formRef.current
        ?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)
        ?.focus();
      return;
    }

    setStatus("sending");
    try {
      await submitContact({
        reason,
        name: fields.name.trim(),
        email: fields.email.trim(),
        phone: fields.phone.trim(),
        message: fields.message.trim(),
      });
      setStatus("sent");
    } catch (error) {
      // Surfaced to the visitor as the error panel below; logged so a
      // misconfigured endpoint is findable rather than silent.
      console.error("Contact form submission failed", error);
      setStatus("error");
    }
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
              {contentTab === "start"
                ? "How would you like to connect?"
                : contentTab === "contact"
                  ? "Connect with us"
                  : "Join us"}
            </h2>
            <div className={styles.headerActions}>
              {contentTab !== "start" ? (
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

          <hr className={styles.divider} />

          {contentTab === "start" ? (
            <div className={styles.startBody}>
              <p className={styles.startCopy}>
                Pick the path that matches what you need. We&apos;ll keep the next step
                focused and avoid a form unless it helps.
              </p>
              <div className={styles.startOptions}>
                <button type="button" className={styles.startOption} onClick={() => selectTab("contact")}>
                  <span className={styles.startOptionKicker}>Talk to an advisor</span>
                  <span className={styles.startOptionTitle}>Send a quick enquiry</span>
                  <span className={styles.startOptionBody}>
                    Tell us what you need help with. We&apos;ll get back to you by email or
                    phone.
                  </span>
                </button>
                <button type="button" className={styles.startOption} onClick={() => selectTab("join")}>
                  <span className={styles.startOptionKicker}>Join the community</span>
                  <span className={styles.startOptionTitle}>Open the WhatsApp path</span>
                  <span className={styles.startOptionBody}>
                    Scan the QR code to join our NRI community on WhatsApp.
                  </span>
                </button>
              </div>
            </div>
          ) : contentTab === "contact" ? (
            status === "sent" ? (
              // Replaces the form rather than closing the modal: closing on
              // success reads as "did that actually go through?".
              <div className={styles.success} role="status">
                <span className={styles.successIcon} aria-hidden="true">
                  <Check size={28} weight="bold" />
                </span>
                <p className={styles.successHeading}>Thanks — that&apos;s with us.</p>
                <p className={styles.successBody}>
                  An advisor will get back to you at {fields.email.trim()} within 24–48
                  hours.
                </p>
                <Button type="button" onClick={onClose}>
                  Done
                </Button>
              </div>
            ) : (
              <form
                ref={formRef}
                className={`${styles.form} ${tabDissolving ? styles.formHidden : ""}`}
                onSubmit={handleSubmit}
                noValidate
              >
                <fieldset className={styles.fieldset} disabled={sending}>
                  <legend className={styles.srOnly}>What can we help with?</legend>
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

                  <div className={styles.fields}>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="contact-name">
                        Name
                      </label>
                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        placeholder="Your full name"
                        className={`${styles.input} ${errors.name ? styles.inputInvalid : ""}`}
                        value={fields.name}
                        onChange={(event) => updateField("name", event.target.value)}
                        aria-invalid={errors.name ? true : undefined}
                        aria-describedby={errors.name ? "contact-name-error" : undefined}
                      />
                      {errors.name && (
                        <p id="contact-name-error" className={styles.fieldError}>
                          {errors.name}
                        </p>
                      )}
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="contact-email">
                        Email
                      </label>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        className={`${styles.input} ${errors.email ? styles.inputInvalid : ""}`}
                        value={fields.email}
                        onChange={(event) => updateField("email", event.target.value)}
                        aria-invalid={errors.email ? true : undefined}
                        aria-describedby={errors.email ? "contact-email-error" : undefined}
                      />
                      {errors.email && (
                        <p id="contact-email-error" className={styles.fieldError}>
                          {errors.email}
                        </p>
                      )}
                    </div>

                    <div className={`${styles.field} ${styles.fieldFull}`}>
                      <label className={styles.label} htmlFor="contact-phone">
                        Phone <span className={styles.optional}>(optional)</span>
                      </label>
                      {/* type="tel", not a country dropdown: this audience is
                          spread across time zones and dialling codes, and a
                          free-text field they can paste +971… into beats a
                          picker they have to hunt through. */}
                      <input
                        id="contact-phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="Include your country code, e.g. +971 50 123 4567"
                        className={styles.input}
                        value={fields.phone}
                        onChange={(event) => updateField("phone", event.target.value)}
                      />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="contact-message">
                      Message <span className={styles.optional}>(optional)</span>
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      className={styles.textarea}
                      placeholder="Enter your message here"
                      rows={4}
                      value={fields.message}
                      onChange={(event) => updateField("message", event.target.value)}
                    />
                  </div>
                </fieldset>

                <div className={styles.footer}>
                  {status === "error" && (
                    <p className={styles.formError} role="alert">
                      That didn&apos;t send. Please try again, or use the community path
                      instead.
                    </p>
                  )}
                  <Button type="submit" disabled={sending}>
                    {sending ? "Sending…" : "Send message"}
                  </Button>
                </div>
              </form>
            )
          ) : (
            // The QR is the working path into the community; the button below
            // it still has no invite URL to point at.
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
                <button type="button" className={styles.joinCta} onClick={onClose}>
                  Join the community
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
