"use client";

import { useId, useState } from "react";

import styles from "./FaqSection.module.css";

/**
 * "Frequently Asked Questions" — Figma node 379:15514. Copied, not shared:
 * same house rule as every other section.
 */
const FAQS = [
  {
    question: "Who can invest through Desh?",
    answer:
      "NRIs, OCIs, and PIOs holding a valid passport can invest with Desh. We support investors across the US, UK, UAE, Singapore, Australia, and most other jurisdictions.",
  },
  {
    question: "Do I need to be in India to start investing?",
    answer:
      "No. You can complete the entire onboarding process remotely and manage your investments from anywhere in the world.",
  },
  {
    question: "What investment options do you offer?",
    answer:
      "Indian mutual funds and US stocks, alongside curated portfolios built around your goals, time horizon, and risk appetite.",
  },
  {
    question: "Will I get a dedicated advisor?",
    answer:
      "Yes. Every investor is paired with a dedicated advisor you can reach whenever you need guidance — not a rotating support queue.",
  },
  {
    question: "Can I start a SIP from overseas?",
    answer:
      "Yes. You can set up and manage a SIP entirely online from your NRE or NRO account, with contributions debited automatically each month.",
  },
  {
    question: "Is my money held by Desh?",
    answer:
      "No. Your money never sits with us — investments are held directly with SEBI-regulated fund houses and custodians in your own name.",
  },
];

/** Figma shows the second item open on load (node 379:15523). */
const INITIALLY_OPEN = 1;

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(INITIALLY_OPEN);
  const ids = useId();

  return (
    <section className={styles.section}>
      <div className={`grid ${styles.panel}`}>
        <div className={styles.container}>
          <h2 className={styles.heading}>Frequently Asked Questions</h2>

          <div className={styles.list}>
            {FAQS.map((faq, index) => {
              const isOpen = index === openIndex;
              const panelId = `${ids}-panel-${index}`;
              const buttonId = `${ids}-button-${index}`;

              return (
                <div key={faq.question} className={styles.item}>
                  <h3 className={styles.questionHeading}>
                    <button
                      id={buttonId}
                      type="button"
                      className={styles.trigger}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenIndex(isOpen ? null : index)}
                    >
                      <span className={styles.question}>{faq.question}</span>
                      {/* Two strokes: the horizontal one stays, the vertical
                          one rotates away, so "+" becomes "×" rather than
                          swapping between two separate icons. */}
                      <span
                        className={`${styles.icon} ${isOpen ? styles.iconOpen : ""}`}
                        aria-hidden="true"
                      >
                        <span className={styles.iconBar} />
                        <span className={styles.iconBar} />
                      </span>
                    </button>
                  </h3>

                  {/* Stays mounted at every state — display:none (what the
                      `hidden` attribute would set) can't be transitioned, so
                      driving visibility that way made the reveal pop instead
                      of animate. Height is animated via grid-template-rows
                      instead (see .answerWrap); inert keeps the collapsed
                      panel out of tab order and the accessibility tree
                      without needing a display change. */}
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className={`${styles.answerWrap} ${isOpen ? styles.answerWrapOpen : ""}`}
                    inert={!isOpen}
                  >
                    <div className={styles.answerInner}>
                      <p className={styles.answer}>{faq.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Relocated from Footer's photo overlay — the same copy, now
              black-on-white in this section's own whitespace instead of
              white text sitting on the hill artwork. */}
          <p className={styles.closingTagline}>
            A modern investing experience built for NRIs who want a clean, credible path
            into Indian mutual funds &amp; US stocks without getting buried in paperwork,
            confusion, or bad advice.
          </p>
        </div>
      </div>
    </section>
  );
}
