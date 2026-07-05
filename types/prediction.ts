export interface PredictionData {
  userId: string;
  episodeId: number;
  queensResults: Record<string, "top" | "bottom">;
  winner: string | null;
  eliminee: string | null;
  pointsEarned?: number;
  updatedAt?: Date;
}
