import type { Metadata } from "next";
import { Inter, IBM_Plex_Serif, Petit_Formal_Script } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// Swapped from GeneralSans-Regular.otf to Mona Sans (GitHub's open-source
// typeface, SIL OFL) — kept on the same --font-heading variable so no
// component CSS had to change its font-family reference.
const monaSans = localFont({
  src: "./fonts/MonaSans-Regular.woff2",
  variable: "--font-heading",
  weight: "400",
  style: "normal",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Body-prose accent, matching Intercom's serif-for-copy pattern. Only used
// on actual paragraph copy (see each section's .subtext/.tagline) — UI
// chrome (nav, buttons, forms) stays on Inter.
const ibmPlexSerif = IBM_Plex_Serif({
  variable: "--font-body",
  weight: "300",
  subsets: ["latin"],
});

// Decorative first-letter treatment on section headings — see each
// section's own .heading CSS for how the opening letter is split into its
// own span. Only ships weight 400/normal (the only static cut Google
// offers for this face), which is what a single drop cap needs anyway.
const petitFormalScript = Petit_Formal_Script({
  variable: "--font-script",
  weight: "400",
  subsets: ["latin"],
});

// metadataBase is what lets the relative og:image path below resolve to an
// absolute URL — scrapers (WhatsApp, iMessage, Twitter) will not follow a
// relative one, so without it the card renders blank.
export const metadata: Metadata = {
  metadataBase: new URL("https://getdesh.com"),
  title: "Desh | Wealth guidance for global Indians",
  description:
    "Build a portfolio across Indian mutual funds and US stocks with dedicated guidance for NRIs.",
  openGraph: {
    type: "website",
    url: "https://getdesh.com",
    siteName: "Desh",
    title: "Desh | Wealth guidance for global Indians",
    description:
      "Build a portfolio across Indian mutual funds and US stocks with dedicated guidance for NRIs.",
    locale: "en_IN",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Desh landscape artwork with chairs by a river",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Desh | Wealth guidance for global Indians",
    description:
      "Build a portfolio across Indian mutual funds and US stocks with dedicated guidance for NRIs.",
    images: ["/images/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${monaSans.variable} ${inter.variable} ${ibmPlexSerif.variable} ${petitFormalScript.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
