import { Timestamp } from "firebase/firestore";

// Document Firestore : crownPredictions/{uid} — pronostic saison d'un utilisateur (avant l'épisode 1)
export interface CrownPredictionData {
  userId: string;
  queenPredicted: string;
  createdAt: Timestamp;
}

// Document Firestore : config/crown_result — la gagnante réelle de la saison (saisie en fin de saison)
export interface CrownResultData {
  winner: string;
  publishedAt: Timestamp;
}
