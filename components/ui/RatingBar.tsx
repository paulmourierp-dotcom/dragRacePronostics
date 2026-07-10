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
  // Arrondi à 1 décimale max : `communityAverage` renvoie un flottant brut (ex. 7.333...),
  // alors qu'une note individuelle est déjà un entier — dans les deux cas, Math.round supprime
  // aussi les artefacts de flottant et le zéro final (7 au lieu de 7.0).
  const displayValue = value != null ? Math.round(value * 10) / 10 : null;
  return (
    <div className="min-w-[160px]">
      <div className="flex justify-between text-xs font-semibold text-ink-muted mb-1.5">
        <span>{label}</span>
        <span className="text-ink font-bold">{displayValue != null ? `${displayValue}/10` : "Non notée"}</span>
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
