import type { Metadata } from "next";
import ManifestoPage from "./ManifestoPage";

export const metadata: Metadata = {
  title: "Manifesto | Desh",
  description:
    "Indians abroad deserve better. A letter from our founders on building Desh so distance never breaks your connection to India.",
  openGraph: {
    type: "article",
    url: "https://getdesh.com/manifesto",
    siteName: "Desh",
    title: "Manifesto | Desh",
    description:
      "Indians abroad deserve better. A letter from our founders on building Desh so distance never breaks your connection to India.",
  },
};

export default function Manifesto() {
  return <ManifestoPage />;
}
