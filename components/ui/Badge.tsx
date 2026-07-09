"use client";
import { ReactNode } from "react";

export type StatusTone = "winner" | "top" | "safe" | "bottom" | "eliminee";

const TONE_CLASSES: Record<StatusTone, string> = {
  winner: "bg-status-winner-bg text-status-winner-ink",
  top: "bg-status-top-bg text-status-top-ink",
  safe: "bg-status-safe-bg text-status-safe-ink",
  bottom: "bg-status-bottom-bg text-status-bottom-ink",
  eliminee: "bg-status-eliminee-bg text-status-eliminee-ink",
};

export const STATUS_LABELS: Record<StatusTone, string> = {
  winner: "Gagnante",
  top: "Top",
  safe: "Safe",
  bottom: "Bottom",
  eliminee: "Éliminée",
};

interface BadgeProps {
  tone: StatusTone;
  children?: ReactNode;
  className?: string;
}

export default function Badge({ tone, children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-bold whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`}
    >
      {children ?? STATUS_LABELS[tone]}
    </span>
  );
}
