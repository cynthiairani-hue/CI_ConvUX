"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#394859" }}>Something went wrong</h2>
            <p style={{ marginTop: 8, fontSize: 14, color: "#8492A6" }}>{error.message}</p>
            <button
              onClick={reset}
              style={{ marginTop: 16, padding: "8px 20px", fontSize: 14, fontWeight: 500, borderRadius: 8, border: "none", background: "#394859", color: "#fff", cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
