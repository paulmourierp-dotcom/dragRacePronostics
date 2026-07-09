"use client";

interface ChipProps {
  label: string;
  // null : pas encore de résultat officiel (aucun avis à donner)
  correct: boolean | null;
}

export default function Chip({ label, correct }: ChipProps) {
  const style =
    correct === null
      ? "bg-verdict-neutral-bg text-verdict-neutral-ink"
      : correct
      ? "bg-verdict-correct-bg text-verdict-correct-ink"
      : "bg-verdict-incorrect-bg text-verdict-incorrect-ink";
  return (
    <span className={`text-sm font-semibold px-2.5 py-1 rounded-pill ${style}`}>
      {label}
    </span>
  );
}
