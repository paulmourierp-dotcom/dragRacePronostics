"use client";
import { PredictionData } from "@/types/prediction";
import { ResultData } from "@/types/result";
import Chip from "@/components/ui/Chip";

interface CategoryRow {
  key: string;
  label: string;
  mine: { label: string; correct: boolean }[];
  official: string[];
  points: number;
}

interface PredictionBreakdownProps {
  prediction: PredictionData;
  result: ResultData;
  // Roster des Queens actives à cet épisode, nécessaire pour reconstruire les choix "safe"
  // implicites (ni top ni bottom) — voir computeEpisodePoints dans app/admin/page.tsx, qui
  // applique exactement le même fallback `queensResults[queen] ?? "safe"`.
  activeQueens: string[];
  // Historique affiche une colonne "Résultat officiel" en plus des chips du joueur ; la modale
  // joueur (espace plus réduit) n'affiche que les chips colorées du joueur.
  showOfficial?: boolean;
}

export default function PredictionBreakdown({
  prediction,
  result,
  activeQueens,
  showOfficial = false,
}: PredictionBreakdownProps) {
  const rules = result.scoringRules;

  const topGuesses = Object.entries(prediction.queensResults)
    .filter(([, v]) => v === "top")
    .map(([queen]) => queen);
  const bottomGuesses = Object.entries(prediction.queensResults)
    .filter(([, v]) => v === "bottom")
    .map(([queen]) => queen);
  const safeGuesses = activeQueens.filter(
    (q) => !topGuesses.includes(q) && !bottomGuesses.includes(q)
  );
  const officialSafe = activeQueens.filter(
    (q) => !result.top.includes(q) && !result.bottom.includes(q)
  );

  const groupRow = (
    key: string,
    label: string,
    guesses: string[],
    official: string[],
    pointsPerQueen: number
  ): CategoryRow => {
    const correctCount = guesses.filter((q) => official.includes(q)).length;
    return {
      key,
      label,
      mine: guesses.map((q) => ({ label: q, correct: official.includes(q) })),
      official,
      points: correctCount * pointsPerQueen,
    };
  };

  const singleRow = (
    key: string,
    label: string,
    guess: string | null,
    official: string,
    pointsIfCorrect: number
  ): CategoryRow => {
    const correct = guess != null && guess === official;
    return {
      key,
      label,
      mine: guess != null ? [{ label: guess, correct }] : [],
      official: [official],
      points: correct ? pointsIfCorrect : 0,
    };
  };

  const rows: CategoryRow[] = [
    groupRow("bottom", "Bottom", bottomGuesses, result.bottom, rules.bottom),
    groupRow("top", "Top", topGuesses, result.top, rules.top),
    groupRow("safe", "Safe", safeGuesses, officialSafe, rules.safe),
    singleRow("eliminee", "Éliminée", prediction.eliminee, result.eliminee, rules.eliminee),
    singleRow("gagnante", "Gagnante", prediction.winner, result.winner, rules.gagnante),
    singleRow("miniDefi", "Mini-Défi", prediction.miniDefi, result.miniDefi, rules.miniDefi),
    singleRow("maxiDefi", "Maxi-Défi", prediction.maxiDefi, result.maxiDefi, rules.maxiDefi),
  ];

  if (result.bonusQuestion) {
    const bonusCorrect = prediction.bonusAnswer != null && Boolean(prediction.bonusCorrect);
    rows.push({
      key: "bonus",
      label: `${result.bonusQuestion.question} (bonus)`,
      mine: prediction.bonusAnswer != null ? [{ label: prediction.bonusAnswer, correct: bonusCorrect }] : [],
      official: [result.bonusQuestion.answer],
      points: bonusCorrect ? result.bonusQuestion.points : 0,
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div
          key={row.key}
          className={`grid ${
            showOfficial ? "grid-cols-1 sm:grid-cols-[110px_1fr_1fr_60px]" : "grid-cols-1 sm:grid-cols-[110px_1fr_60px]"
          } gap-3 items-center py-2.5 px-3 bg-page rounded-button`}
        >
          <div className="text-xs font-bold text-ink-soft">{row.label}</div>
          <div className="flex flex-wrap gap-1.5">
            {row.mine.length === 0 ? (
              <span className="text-sm text-ink-faint">—</span>
            ) : (
              row.mine.map((chip, i) => <Chip key={`${chip.label}-${i}`} label={chip.label} correct={chip.correct} />)
            )}
          </div>
          {showOfficial && (
            <div className="flex flex-wrap gap-1.5">
              {row.official.map((name) => (
                <Chip key={name} label={name} correct={null} />
              ))}
            </div>
          )}
          <div
            className={`font-display text-sm font-extrabold text-right ${
              row.points > 0 ? "text-verdict-correct-ink" : "text-verdict-incorrect-ink"
            }`}
          >
            +{row.points}
          </div>
        </div>
      ))}
      {showOfficial && (
        <div className="flex gap-3 text-xs font-semibold text-ink-faint px-3 pt-1">
          <div className="flex-1" style={{ paddingLeft: 110 }}>Mon pronostic</div>
          <div className="flex-1">Résultat officiel</div>
        </div>
      )}
    </div>
  );
}
