/**
 * Minimal Worker in front of the static export.
 *
 * Cloudflare's asset serving does not implement HTTP Range requests right
 * now — verified empirically, both via direct asset serving and by proxying
 * through env.ASSETS.fetch() from a Worker script: every Range request,
 * including Safari's `bytes=0-1` capability probe, came back as a plain 200
 * with the full body instead of 206. WebKit refuses to treat a resource as
 * seekable unless that probe succeeds, which is what broke the bloom scrub
 * on Safari/iOS — Chrome tends to tolerate it by buffering the whole file,
 * Safari does not.
 *
 * So Range support is implemented by hand here for video files: fetch the
 * full asset (already edge-cached by Cloudflare, so this is not an origin
 * round-trip) and slice out the requested byte range ourselves.
 */
export interface Env {
  ASSETS: { fetch: typeof fetch };
}

const RANGEABLE = /\.(mp4|webm|mov|m4v)$/i;

/**
 * Cloudflare's asset layer only marks content-hashed files (/_next/static/*)
 * as immutable; everything served under its original name — every clip in
 * /videos and every image in /images — falls back to
 * `public, max-age=0, must-revalidate`, so the browser re-fetches all of it
 * on every single visit. For video that is the whole file each time, since
 * serveRange() builds its 206 by hand and so has no 304 shortcut to fall
 * back on. A day of hands-off caching removes that, and is short enough
 * that replacing a file in place (same name, as these all are) still
 * propagates within a day rather than being pinned for a year the way a
 * true `immutable` would.
 */
const MEDIA_CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800";
const CACHEABLE_MEDIA = /\.(mp4|webm|mov|m4v|webp|avif|png|jpe?g|gif|svg|woff2?)$/i;

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // www is a declared custom domain purely so a DNS record exists for it;
    // the canonical host is the apex, so send visitors there.
    if (url.hostname === "www.getdesh.com") {
      url.hostname = "getdesh.com";
      return Response.redirect(url.toString(), 301);
    }

    if (!RANGEABLE.test(url.pathname)) {
      return withMediaCache(await env.ASSETS.fetch(request), url.pathname);
    }

    const range = request.headers.get("Range");
    if (range) return serveRange(request, env, range);

    // No Range header yet — the browser's very first request, before it
    // knows whether this resource is seekable at all. Advertise support so
    // later Range requests actually get attempted (Safari in particular
    // will not bother otherwise).
    const full = await env.ASSETS.fetch(request);
    if (!full.ok) return full;
    const headers = new Headers(full.headers);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", MEDIA_CACHE_CONTROL);
    return new Response(full.body, { status: full.status, headers });
  },
};

export default worker;

async function serveRange(request: Request, env: Env, range: string): Promise<Response> {
  // Strip Range so the asset layer always hands back a clean, full 200.
  const full = await env.ASSETS.fetch(new Request(request.url, { method: "GET" }));
  if (!full.ok) return full;

  const contentType = full.headers.get("Content-Type") ?? "application/octet-stream";
  const buffer = await full.arrayBuffer();
  const size = buffer.byteLength;

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (match[1] === "" && match[2] === "")) {
    return new Response("Malformed Range header", { status: 400 });
  }

  let start = match[1] === "" ? 0 : Number(match[1]);
  let end = match[2] === "" ? size - 1 : Number(match[2]);
  // A suffix range ("-500") asks for the last N bytes, expressed via an
  // empty start rather than a negative one.
  if (match[1] === "" && match[2] !== "") {
    start = Math.max(0, size - end);
    end = size - 1;
  }
  end = Math.min(end, size - 1);

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
    return new Response("Range Not Satisfiable", {
      status: 416,
      headers: { "Content-Range": `bytes */${size}` },
    });
  }

  const slice = buffer.slice(start, end + 1);
  return new Response(slice, {
    status: 206,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(slice.byteLength),
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": MEDIA_CACHE_CONTROL,
    },
  });
}

/**
 * Re-stamps Cache-Control on the static media that the asset layer leaves
 * uncached (see MEDIA_CACHE_CONTROL). Anything else — HTML, the hashed
 * /_next/static bundles, 304s and errors — is passed straight through with
 * whatever headers it already had.
 */
function withMediaCache(response: Response, pathname: string): Response {
  if (!response.ok || !CACHEABLE_MEDIA.test(pathname)) return response;
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", MEDIA_CACHE_CONTROL);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
