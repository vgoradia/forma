"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9fafb",
          color: "#111827",
          fontFamily: "system-ui, sans-serif",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#374151", fontSize: "0.95rem", lineHeight: 1.5 }}>
            Forma hit an unexpected error. You can try again.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: "8px",
              border: 0,
              borderRadius: "12px",
              background: "#5558e6",
              color: "#ffffff",
              fontWeight: 600,
              padding: "12px 20px",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
