"use client";

interface StepHeaderProps {
  step: number;
  totalSteps: number;
  title: string;
  points: number;
  multiplier?: number;
  onBack?: () => void;
}

export default function StepHeader({ step, totalSteps, title, points, multiplier, onBack }: StepHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        {onBack ? (
          <button onClick={onBack} className="text-sm text-ink-muted font-semibold flex items-center gap-1">
            ← Retour
          </button>
        ) : (
          <span />
        )}
        <span className="text-xs font-bold text-ink-faint uppercase tracking-wide">
          Étape {step}/{totalSteps}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
        <span className="inline-flex items-center gap-1 bg-brand-tint text-brand rounded-pill px-3 py-1 text-xs font-bold whitespace-nowrap">
          🏆 {points} pts{multiplier ? ` x${multiplier}` : ""}
        </span>
      </div>
    </div>
  );
}
