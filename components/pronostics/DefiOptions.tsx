"use client";

interface DefiOptionsProps {
  options: string[];
  value: string | null;
  onSelect: (value: string) => void;
}

export default function DefiOptions({ options, value, onSelect }: DefiOptionsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(option)}
          className={`px-5 py-3.5 rounded-button border-2 font-semibold text-sm transition ${
            value === option
              ? "border-brand bg-brand-tint text-brand"
              : "border-surface-border text-ink-soft bg-surface"
          }`}
        >
          {option}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onSelect("Autre")}
        className={`px-5 py-3.5 rounded-button border-2 font-semibold text-sm transition ${
          value === "Autre" ? "border-brand bg-brand-tint text-brand" : "border-surface-border text-ink-soft bg-surface"
        }`}
      >
        Autre
      </button>
    </div>
  );
}
