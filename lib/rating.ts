import { QueenRatingData } from "@/types/rating";

// "Notation effectuée" = TOUTES les Queens actives à cet épisode ont une entrée dans
// `ratings` (une notation partielle ne compte pas comme faite — décision produit explicite).
export function isRatingComplete(
  rating: QueenRatingData | null | undefined,
  activeQueens: string[]
): boolean {
  if (activeQueens.length === 0) return true;
  if (!rating) return false;
  return activeQueens.every((q) => typeof rating.ratings[q] === "number");
}

// Moyenne communautaire des notes de TOUS les joueurs pour une Queen sur un ensemble de
// notations donné (à filtrer par épisode par l'appelant si besoin).
export function communityAverage(allRatings: QueenRatingData[], queenName: string): number | null {
  const values = allRatings
    .map((r) => r.ratings[queenName])
    .filter((v): v is number => typeof v === "number");
  return values.length === 0 ? null : values.reduce((s, v) => s + v, 0) / values.length;
}
