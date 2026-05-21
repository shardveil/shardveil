"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AnnouncementType = "info" | "warning" | "critical";

interface Announcement {
  id: string;
  message: string;
  type: AnnouncementType;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "shardveil:announcement";
const DISMISSED_KEY = "shardveil:announcement:dismissed";

const typeStyles: Record<AnnouncementType, string> = {
  info: "bg-shard-900 border-shard-700 text-content-primary",
  warning: "bg-gold-900 border-gold-700 text-content-primary",
  critical: "bg-blood-900 border-blood-700 text-content-primary",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed: Announcement = JSON.parse(raw) as Announcement;
      const dismissed = localStorage.getItem(DISMISSED_KEY);

      if (dismissed === parsed.id) return;

      setAnnouncement(parsed);
    } catch {
      // Malformed JSON — ignore
    }
  }, []);

  if (!announcement) return null;

  function handleDismiss() {
    if (!announcement) return;
    localStorage.setItem(DISMISSED_KEY, announcement.id);
    setAnnouncement(null);
  }

  return (
    <div
      role="alert"
      className={`flex items-center justify-between gap-4 border-b px-4 py-2.5 text-sm font-body ${typeStyles[announcement.type]}`}
    >
      <p className="flex-1 text-center">{announcement.message}</p>
      <button
        aria-label="Dismiss announcement"
        onClick={handleDismiss}
        className="shrink-0 rounded p-1 transition-colors hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
