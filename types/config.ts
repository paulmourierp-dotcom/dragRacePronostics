import { Timestamp } from "firebase/firestore";
import { BonusQuestion } from "./bonus";

export interface ConfigData {
  numero: number;
  dateDiffusion: Timestamp;
  // Question bonus de l'épisode `numero`, définie par l'admin. Absente tant qu'aucune n'a été créée.
  bonusQuestion?: BonusQuestion;
  // Nombre max de Queens sélectionnables dans le top, resp. le bottom (2 ou 3, indépendants
  // l'un de l'autre). Absent = DEFAULT_MAX_QUEENS.
  maxTop?: number;
  maxBottom?: number;
}