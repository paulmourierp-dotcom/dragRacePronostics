import { Timestamp } from "firebase/firestore";

// Document Firestore : results/{numero} — résultats officiels d'un épisode, saisis par l'admin
export interface ResultData {
  numero: number;
  top: [string, string];
  bottom: [string, string];
  eliminee: string;
  winner: string;
  miniDefi: string;
  maxiDefi: string;
  publishedAt: Timestamp;
}
