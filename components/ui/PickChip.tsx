"use client";

interface PickChipProps {
  label: string;
}

// Chip toujours violette, sans notion de correct/incorrect : sert à afficher un choix
// (pronostic en cours, récapitulatif) tant qu'il n'y a rien à comparer à un résultat officiel.
export default function PickChip({ label }: PickChipProps) {
  return (
    <span className="text-sm font-semibold px-2.5 py-1 rounded-pill bg-brand-tint text-brand">
      {label}
    </span>
  );
}
