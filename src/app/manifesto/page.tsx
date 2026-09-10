import type { Metadata } from "next";
import ManifestoPage from "./ManifestoPage";

export const metadata: Metadata = {
  title: "Manifesto | Desh",
  description:
    "Why we started Desh: a financial home for Indians abroad, built around their lives rather than adapted to them as an afterthought.",
  openGraph: {
    type: "article",
    url: "https://getdesh.com/manifesto",
    siteName: "Desh",
    title: "Manifesto | Desh",
    description:
      "Why we started Desh: a financial home for Indians abroad, built around their lives rather than adapted to them as an afterthought.",
  },
};

export default function Manifesto() {
  return <ManifestoPage />;
}
