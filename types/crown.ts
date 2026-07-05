import { Timestamp } from "firebase/firestore";

// Document Firestore : crownPredictions/{uid} — pronostic saison d'un utilisateur (avant l'épisode 1)
export interface CrownPredictionData {
  userId: string;
  queenPredicted: string;
  createdAt: Timestamp;
}

// Document Firestore : config/crown_result — état du pronostic couronne pour la saison
export interface CrownResultData {
  // Verrouille l'écriture de crownPredictions côté règles Firestore, indépendamment du winner
  locked?: boolean;
  // Renseignés uniquement une fois la saison terminée
  winner?: string;
  publishedAt?: Timestamp;
}
