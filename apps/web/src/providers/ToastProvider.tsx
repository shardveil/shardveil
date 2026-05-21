"use client";

import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

export function ToastProvider() {
  const [mounted, setMounted] = useState(false);

  // Hydration safety: only render Toaster on client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Toaster
      position="top-right"
      gutter={8}
      containerStyle={{ top: 72 }}
      toastOptions={{
        duration: 4000,
        style: {
          background: "#1e1540",
          color: "#f0e8ff",
          border: "1px solid rgba(124,58,237,0.3)",
          borderRadius: "8px",
          padding: "12px 16px",
          fontSize: "14px",
          fontFamily: "Inter, sans-serif",
          maxWidth: "360px",
        },
        success: {
          iconTheme: {
            primary: "#22c55e",
            secondary: "#1e1540",
          },
        },
        error: {
          duration: 6000,
          iconTheme: {
            primary: "#dc2626",
            secondary: "#1e1540",
          },
        },
      }}
    />
  );
}
