import { Timestamp } from "firebase/firestore";

export interface ScoringRules {
  top: number;
  bottom: number;
  safe: number;
  gagnante: number;
  eliminee: number;
  miniDefi: number;
  maxiDefi: number;
}

// Document Firestore : results/{numero} — résultats officiels d'un épisode, saisis par l'admin
export interface ResultData {
  numero: number;
  top: [string, string];
  bottom: [string, string];
  eliminee: string;
  winner: string;
  miniDefi: string;
  maxiDefi: string;
  // Barème utilisé pour calculer pointsEarned de cet épisode, modifiable épisode par épisode
  scoringRules: ScoringRules;
  publishedAt: Timestamp;
}
