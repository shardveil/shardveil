"use client";

import { type ReactNode } from "react";

import { AuthGate } from "@/components/auth/AuthGate";
import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { NetworkBanner } from "@/components/layout/NetworkBanner";
import { Sidebar } from "@/components/layout/Sidebar";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

// ─── Game layout ──────────────────────────────────────────────────────────────

export default function GameLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <NetworkBanner />
      <AnnouncementBanner />
      <div className="flex min-h-screen bg-surface-base">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-auto p-6 animate-page-fade-in">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
          <Footer />
        </div>
      </div>
    </AuthGate>
  );
}
