import { ResultData } from "@/types/result";

export type QueenEpisodeStatus = "winner" | "top" | "bottom" | "safe";

// Statut d'une Queen POUR UN résultat d'épisode donné (pas "actuel", juste "à cet épisode-là").
export function statusForQueenInResult(queen: string, result: ResultData): QueenEpisodeStatus {
  if (result.winner === queen) return "winner";
  if (result.top.includes(queen)) return "top";
  if (result.bottom.includes(queen)) return "bottom";
  return "safe";
}
