import type { Metadata } from "next";
import BookingExperience from "./BookingExperience";

export const metadata: Metadata = {
  title: "Book a conversation | Desh",
  description: "Choose a time for a relaxed 30-minute conversation with Aswin from Desh.",
};

export default function BookPage() {
  return <BookingExperience />;
}
