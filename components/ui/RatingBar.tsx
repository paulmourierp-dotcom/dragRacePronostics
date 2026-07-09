"use client";

interface RatingBarProps {
  label: string;
  value: number | null;
  tone: "mine" | "community";
}

const TONE_FILL: Record<RatingBarProps["tone"], string> = {
  mine: "bg-rating-mine",
  community: "bg-rating-community",
};

export default function RatingBar({ label, value, tone }: RatingBarProps) {
  return (
    <div className="min-w-[160px]">
      <div className="flex justify-between text-xs font-semibold text-ink-muted mb-1.5">
        <span>{label}</span>
        <span className="text-ink font-bold">{value != null ? `${value}/10` : "Non notée"}</span>
      </div>
      <div className="h-[7px] rounded-pill bg-rating-track overflow-hidden">
        <div
          className={`h-full rounded-pill ${TONE_FILL[tone]}`}
          style={{ width: `${value != null ? value * 10 : 0}%` }}
        />
      </div>
    </div>
  );
}
