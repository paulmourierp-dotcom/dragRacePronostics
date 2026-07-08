"use client";
import { useState } from "react";
import QueenGrid from "@/components/pronostics/QueenGrid";
import Button from "@/components/Button";
import { BonusQuestion } from "@/types/bonus";

interface BonusQuestionStepProps {
  bonusQuestion: BonusQuestion;
  value: string | null;
  onSelect: (value: string) => void;
}

export default function BonusQuestionStep({ bonusQuestion, value, onSelect }: BonusQuestionStepProps) {
  const isCustomValue = Boolean(value) && bonusQuestion.type === "texte";
  const [freeText, setFreeText] = useState(isCustomValue ? (value as string) : "");

  if (bonusQuestion.type === "queens") {
    const options = [...(bonusQuestion.queensOptions ?? []), "Aucune"];
    return (
      <QueenGrid
        queens={options}
        selected={value ? [value] : []}
        max={1}
        onChange={(next) => onSelect(next[0] ?? "")}
      />
    );
  }

  if (bonusQuestion.type === "options") {
    const options = bonusQuestion.options ?? ["Aucune"];
    return (
      <div className="flex flex-wrap gap-3">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={`px-4 py-3 rounded-xl border-2 font-semibold text-sm transition ${
              value === option ? "border-purple-600 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-700"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={freeText}
        onChange={(e) => setFreeText(e.target.value)}
        placeholder="Ta réponse"
        className="flex-1 border border-gray-200 rounded-xl p-3 text-gray-900"
      />
      <Button size="md" disabled={!freeText.trim()} onClick={() => onSelect(freeText.trim())}>
        Valider
      </Button>
    </div>
  );
}
