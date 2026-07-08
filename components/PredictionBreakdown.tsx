"use client";
import { PredictionData } from "@/types/prediction";
import { ResultData } from "@/types/result";

// correct === null : pas encore de résultat officiel (aucun avis à donner)
export function Chip({ label, correct }: { label: string; correct: boolean | null }) {
  const style =
    correct === null
      ? "bg-gray-100 text-gray-600 border-gray-200"
      : correct
      ? "bg-green-100 text-green-800 border-green-300"
      : "bg-red-100 text-red-800 border-red-300";
  return (
    <span className={`text-sm font-semibold px-2 py-1 rounded border ${style}`}>
      {label}
    </span>
  );
}

function GuessRow({ label, guess, correct }: { label: string; guess: string | null; correct: boolean | null }) {
  return (
    <div>
      <p className="text-sm font-bold text-gray-700 mb-1">{label}</p>
      {guess ? <Chip label={guess} correct={correct} /> : <span className="text-sm text-gray-400">—</span>}
    </div>
  );
}

interface PredictionBreakdownProps {
  prediction: PredictionData;
  result: ResultData | null;
}

export default function PredictionBreakdown({ prediction, result }: PredictionBreakdownProps) {
  const topGuesses = Object.entries(prediction.queensResults)
    .filter(([, v]) => v === "top")
    .map(([queen]) => queen);

  const bottomGuesses = Object.entries(prediction.queensResults)
    .filter(([, v]) => v === "bottom")
    .map(([queen]) => queen);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm font-bold text-gray-700 mb-1">Top pronostiqué</p>
          <div className="flex flex-wrap gap-2">
            {topGuesses.length === 0 ? (
              <span className="text-sm text-gray-400">—</span>
            ) : (
              topGuesses.map((queen) => (
                <Chip
                  key={queen}
                  label={queen}
                  correct={result ? result.top.includes(queen) : null}
                />
              ))
            )}
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-700 mb-1">Bottom pronostiqué</p>
          <div className="flex flex-wrap gap-2">
            {bottomGuesses.length === 0 ? (
              <span className="text-sm text-gray-400">—</span>
            ) : (
              bottomGuesses.map((queen) => (
                <Chip
                  key={queen}
                  label={queen}
                  correct={result ? result.bottom.includes(queen) : null}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <GuessRow
          label="Gagnante"
          guess={prediction.winner}
          correct={result ? prediction.winner === result.winner : null}
        />
        <GuessRow
          label="Éliminée"
          guess={prediction.eliminee}
          correct={result ? prediction.eliminee === result.eliminee : null}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <GuessRow
          label="Mini-Défi"
          guess={prediction.miniDefi}
          correct={result ? prediction.miniDefi === result.miniDefi : null}
        />
        <GuessRow
          label="Maxi-Défi"
          guess={prediction.maxiDefi}
          correct={result ? prediction.maxiDefi === result.maxiDefi : null}
        />
      </div>

      {result?.bonusQuestion && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <GuessRow
            label={`${result.bonusQuestion.question} (bonus, ${result.bonusQuestion.points} pts)`}
            guess={prediction.bonusAnswer ?? null}
            correct={prediction.bonusAnswer != null ? Boolean(prediction.bonusCorrect) : null}
          />
        </div>
      )}
    </>
  );
}
