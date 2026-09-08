/**
 * Submission plumbing for ContactModal's "Connect with us" form.
 *
 * The destination lives in the environment rather than in this file because
 * it's still an open call (a route added to src/worker.ts, a hosted form
 * service, or a CRM webhook) — whichever it lands on, only the env value
 * changes and nothing here or in the modal moves.
 *
 * NEXT_PUBLIC_ is not a style choice: next.config sets output: "export", so
 * there is no server to POST through. The request leaves the browser
 * directly and the endpoint has to be inlined at build time.
 */
const ENDPOINT = process.env.NEXT_PUBLIC_CONTACT_ENDPOINT;

export type ContactPayload = {
  /** Which of the modal's radio options the visitor picked. */
  reason: string;
  name: string;
  email: string;
  /** Optional — blank when the visitor skipped it. */
  phone: string;
  /** Optional — blank when the visitor skipped it. */
  message: string;
};

/**
 * Posts one enquiry. Rejects on anything that means "this lead did not get
 * through" — including no endpoint being configured, which is a real failure
 * and not something to swallow: silently dropping the enquiry is exactly the
 * behaviour this replaces.
 */
export async function submitContact(payload: ContactPayload): Promise<void> {
  if (!ENDPOINT) {
    throw new Error(
      "NEXT_PUBLIC_CONTACT_ENDPOINT is not set — the contact form has nowhere to submit to.",
    );
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, submittedAt: new Date().toISOString() }),
  });

  if (!response.ok) {
    throw new Error(`Contact endpoint responded ${response.status}`);
  }
}
