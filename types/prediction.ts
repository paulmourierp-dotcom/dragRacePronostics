export interface PredictionData {
  userId: string;
  episodeId: number;
  queensResults: Record<string, "top" | "bottom" | "safe">;
  winner: string | null;
  eliminee: string | null;
  miniDefi: string | null;
  maxiDefi: string | null;
  // Réponse à la question bonus de l'épisode (absente si l'épisode n'en a pas).
  bonusAnswer?: string | null;
  // true si l'admin a modifié/réinitialisé la question bonus après cette réponse : l'utilisateur doit y répondre à nouveau.
  bonusAnswerPending?: boolean;
  // Renseigné à la saisie des résultats. Pour le type "texte", peut être corrigé manuellement par l'admin (faute d'orthographe...).
  bonusCorrect?: boolean;
  pointsEarned?: number;
  updatedAt?: Date;
}
