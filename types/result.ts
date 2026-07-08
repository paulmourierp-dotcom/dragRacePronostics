import { Timestamp } from "firebase/firestore";
import { BonusResult } from "./bonus";

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
  top: string[];
  bottom: string[];
  // Nombre max de Queens autorisées en top/bottom pour cet épisode (figé à la saisie, comme scoringRules).
  maxTopBottom: number;
  eliminee: string;
  winner: string;
  miniDefi: string;
  maxiDefi: string;
  // Barème utilisé pour calculer pointsEarned de cet épisode, modifiable épisode par épisode
  scoringRules: ScoringRules;
  publishedAt: Timestamp;
  // Question bonus figée au moment de la saisie des résultats (copiée depuis config/next_episode).
  bonusQuestion?: BonusResult;
}
