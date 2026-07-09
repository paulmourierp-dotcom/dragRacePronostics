import { Timestamp } from "firebase/firestore";

// Document Firestore : queenRatings/{uid}_ep{numero} — notation subjective d'un joueur sur
// la prestation de chaque Queen à un épisode donné. Purement informatif : n'affecte jamais
// pointsEarned/score (voir lib/scoring.js, app/admin/page.tsx#computeEpisodePoints — non touché).
export interface QueenRatingData {
  userId: string;
  episodeId: number;
  ratings: Record<string, number>; // nomQueen -> note entière 0-10
  updatedAt: Timestamp;
}
