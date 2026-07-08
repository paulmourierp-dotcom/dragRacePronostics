import { Timestamp } from "firebase/firestore";
import { BonusQuestion } from "./bonus";

export interface ConfigData {
  numero: number;
  dateDiffusion: Timestamp;
  // Question bonus de l'épisode `numero`, définie par l'admin. Absente tant qu'aucune n'a été créée.
  bonusQuestion?: BonusQuestion;
}