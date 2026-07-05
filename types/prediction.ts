export interface PredictionData {
  userId: string;
  episodeId: number;
  queensResults: Record<string, "top" | "bottom" | "safe">;
  winner: string | null;
  eliminee: string | null;
  miniDefi: string | null;
  maxiDefi: string | null;
  pointsEarned?: number;
  updatedAt?: Date;
}
