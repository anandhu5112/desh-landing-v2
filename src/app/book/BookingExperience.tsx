"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Cal, { getCalApi, type EmbedEvent } from "@calcom/embed-react";
import { ArrowLeft, ArrowUpRight, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { CAL_BOOKING_URL } from "@/lib/booking";
import styles from "./page.module.css";

const CAL_LINK = CAL_BOOKING_URL.replace(/^https?:\/\/(?:www\.)?cal\.com\//, "").split(/[?#]/)[0];
const CAL_NAMESPACE = "desh-booking";
const COMMUNITY_URL =
  "https://chat.whatsapp.com/KmasCJMGJ42Bqn9a4PkMw6?s=cl&p=i&ilr=4";

export default function BookingExperience() {
  const [booking, setBooking] = useState<
    { complete: false } | { complete: true; startTime?: string }
  >({ complete: false });

  useEffect(() => {
    let active = true;
    let calApi: Awaited<ReturnType<typeof getCalApi>> | undefined;

    const onBookingSuccess = (
      event: EmbedEvent<"bookingSuccessfulV2">,
    ) => {
      setBooking({ complete: true, startTime: event.detail.data.startTime });
    };

    void getCalApi({ namespace: CAL_NAMESPACE }).then((api) => {
      if (!active) return;
      calApi = api;
      api("ui", {
        theme: "light",
        layout: "month_view",
        hideEventTypeDetails: false,
      });
      api("on", { action: "bookingSuccessfulV2", callback: onBookingSuccess });
    });

    return () => {
      active = false;
      calApi?.("off", {
        action: "bookingSuccessfulV2",
        callback: onBookingSuccess,
      });
    };
  }, []);

  const bookedTime = booking.complete && booking.startTime
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(booking.startTime))
    : null;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={18} aria-hidden="true" />
          Back to Desh
        </Link>
        <Link href="/" aria-label="Desh home">
          <Image
            src="/images/desh-logo-mark.svg"
            alt="Desh"
            width={63}
            height={21}
            className={styles.logo}
            priority
          />
        </Link>
      </header>

      {booking.complete ? (
        <section className={styles.success} aria-labelledby="booking-success-heading">
          <div className={styles.successCopy}>
            <CheckCircle size={34} weight="fill" aria-hidden="true" />
            <p className={styles.eyebrow}>You’re booked</p>
            <h1 id="booking-success-heading">See you soon.</h1>
            <p className={styles.lede}>
              {bookedTime ? `Your conversation is set for ${bookedTime}. ` : "Your conversation is set. "}
              We’ve sent the details to your inbox.
            </p>
            <div className={styles.communityCopy}>
              <h2>Come meet the community.</h2>
              <p>
                Join 999+ global Indians learning, sharing, and building wealth
                with more clarity.
              </p>
            </div>
            <a
              className={styles.communityButton}
              href={COMMUNITY_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Join the WhatsApp community
              <ArrowUpRight size={20} aria-hidden="true" />
            </a>
          </div>
          <a
            className={styles.qrCard}
            href={COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open the Desh WhatsApp community invite"
          >
            <Image
              src="/images/qr-code.png"
              alt="QR code for the Desh WhatsApp community"
              width={280}
              height={280}
            />
            <span>Scan with your phone</span>
          </a>
        </section>
      ) : (
        <section className={styles.booking} aria-labelledby="booking-heading">
          <div className={styles.intro}>
            <p className={styles.eyebrow}>30-minute conversation</p>
            <h1 id="booking-heading">Choose a time that works for you.</h1>
            <p>
              Share a few details, including your WhatsApp number, and your slot
              is yours.
            </p>
          </div>
          <div className={styles.calShell}>
            <Cal
              namespace={CAL_NAMESPACE}
              calLink={CAL_LINK}
              config={{ layout: "month_view", "ui.color-scheme": "light" }}
              className={styles.cal}
            />
          </div>
        </section>
      )}
    </main>
  );
}
