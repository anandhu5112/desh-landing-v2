import type { Metadata } from "next";
import ManifestoPage from "./ManifestoPage";

export const metadata: Metadata = {
  title: "Manifesto | Desh",
  description:
    "From our families in Kerala to Indians around the world: why we are building Desh, a financial home for Indians abroad.",
  openGraph: {
    type: "article",
    url: "https://getdesh.com/manifesto",
    siteName: "Desh",
    title: "Manifesto | Desh",
    description:
      "From our families in Kerala to Indians around the world: why we are building Desh, a financial home for Indians abroad.",
  },
};

export default function Manifesto() {
  return <ManifestoPage />;
}
