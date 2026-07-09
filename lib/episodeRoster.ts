import { QueenData } from "@/types/gameData";
import { ResultData } from "@/types/result";

// Reconstruit la liste des Queens encore actives EN ENTRANT dans l'épisode `episodeNum`,
// à partir de l'historique complet des résultats déjà publiés (pas du flag `eliminee`
// actuel, qui reflète l'état ACTUEL, pas l'état à l'époque). Une Queen éliminée à
// l'épisode N ou plus tard était encore active à l'épisode N.
export function activeQueensAtEpisode(
  queens: QueenData[],
  resultsHistory: ResultData[],
  episodeNum: number
): string[] {
  return queens
    .filter((q) => {
      if (!q.eliminee) return true;
      const eliminatedAtEpisode = resultsHistory.find((r) => r.eliminee === q.name)?.numero;
      return eliminatedAtEpisode !== undefined && eliminatedAtEpisode >= episodeNum;
    })
    .map((q) => q.name);
}
