"use client";

// TODO: Module 21 — report to Sentry here
// NOTE: global-error.tsx replaces the root layout entirely — no providers
// or CSS globals are available. Use inline styles only.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#0d0014",
          color: "#f0e6ff",
          fontFamily: "sans-serif",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "2rem",
          margin: 0,
        }}
      >
        {/* Decorative rune */}
        <div
          aria-hidden
          style={{ fontSize: "4rem", color: "#b91c1c", marginBottom: "1.5rem" }}
        >
          ⚔
        </div>

        <h1
          style={{
            fontSize: "2rem",
            fontWeight: "bold",
            color: "#f87171",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "0.75rem",
          }}
        >
          Fatal Error
        </h1>

        <p
          style={{
            color: "#a78bfa",
            fontSize: "0.875rem",
            marginBottom: "0.5rem",
            maxWidth: "28rem",
          }}
        >
          The root veil has shattered. The portal cannot be opened.
        </p>

        {error.message && (
          <p
            style={{
              color: "#9ca3af",
              fontSize: "0.75rem",
              fontFamily: "monospace",
              background: "#1a0030",
              border: "1px solid #3b1f6b",
              borderRadius: "0.375rem",
              padding: "0.5rem 0.75rem",
              marginBottom: "0.5rem",
              maxWidth: "28rem",
              wordBreak: "break-word",
            }}
          >
            {error.message}
          </p>
        )}

        {error.digest && (
          <p
            style={{
              color: "#6b7280",
              fontSize: "0.75rem",
              marginBottom: "1.5rem",
            }}
          >
            Error ID:{" "}
            <span style={{ fontFamily: "monospace", color: "#d97706" }}>
              {error.digest}
            </span>
          </p>
        )}

        {!error.digest && <div style={{ marginBottom: "1.5rem" }} />}

        <button
          onClick={reset}
          style={{
            padding: "0.625rem 1.5rem",
            background: "#991b1b",
            color: "#fff",
            border: "1px solid #b91c1c",
            borderRadius: "0.375rem",
            fontSize: "0.875rem",
            fontWeight: "500",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#b91c1c";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#991b1b";
          }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
