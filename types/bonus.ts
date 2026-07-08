export type BonusQuestionType = "queens" | "options" | "texte";

// Question bonus définie par l'admin pour un épisode, stockée sur config/next_episode
// puis figée dans results/{numero} (avec `answer` en plus) une fois les résultats saisis.
export interface BonusQuestion {
  question: string;
  type: BonusQuestionType;
  // "queens" : sous-ensemble de queens choisi par l'admin (peut inclure des éliminées). "Aucune" est ajoutée à l'affichage.
  queensOptions?: string[];
  // "options" : liste définie par l'admin, "Aucune" y est toujours ajoutée automatiquement à la sauvegarde.
  options?: string[];
  points: number;
}

// Document results/{numero}.bonusQuestion : la question figée + la réponse gagnante.
export interface BonusResult extends BonusQuestion {
  answer: string;
}
