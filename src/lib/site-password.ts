/* ── Site password resolution ──
   One place decides whether the deployment is gated:
   - SITE_PASSWORD env var, when set, always wins (per-deployment override).
   - Otherwise every PRODUCTION build is gated with the default below — the
     shared link is never accidentally open (the gate kept getting lost in
     dashboard config; in code it ships with every deploy).
   - Local dev stays ungated. */

export const DEFAULT_SITE_PASSWORD = "fuseiq2026";

export function getSitePassword(): string | undefined {
  return (
    process.env.SITE_PASSWORD ||
    (process.env.NODE_ENV === "production" ? DEFAULT_SITE_PASSWORD : undefined)
  );
}
