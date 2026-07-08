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
          className={`px-4 py-3 rounded-xl border-2 font-semibold text-sm transition ${
            value === option
              ? "border-purple-600 bg-purple-50 text-purple-700"
              : "border-gray-200 text-gray-700"
          }`}
        >
          {option}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onSelect("Autre")}
        className={`px-4 py-3 rounded-xl border-2 font-semibold text-sm transition ${
          value === "Autre" ? "border-purple-600 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-700"
        }`}
      >
        Autre
      </button>
    </div>
  );
}
