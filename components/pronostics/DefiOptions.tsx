"use client";
import { useState } from "react";
import Button from "@/components/Button";

interface DefiOptionsProps {
  options: string[];
  value: string | null;
  onSelect: (value: string) => void;
}

export default function DefiOptions({ options, value, onSelect }: DefiOptionsProps) {
  const isCustomValue = Boolean(value) && !options.includes(value as string);
  const [showCustom, setShowCustom] = useState(isCustomValue);
  const [customValue, setCustomValue] = useState(isCustomValue ? (value as string) : "");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setShowCustom(false);
              onSelect(option);
            }}
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
          onClick={() => setShowCustom(true)}
          className={`px-4 py-3 rounded-xl border-2 font-semibold text-sm transition ${
            showCustom ? "border-purple-600 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-700"
          }`}
        >
          Autre
        </button>
      </div>

      {showCustom && (
        <div className="flex gap-2">
          <input
            type="text"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="Précise ta réponse"
            className="flex-1 border border-gray-200 rounded-xl p-3 text-gray-900"
          />
          <Button size="md" disabled={!customValue.trim()} onClick={() => onSelect(customValue.trim())}>
            Valider
          </Button>
        </div>
      )}
    </div>
  );
}
