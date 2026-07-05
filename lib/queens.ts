import { QueenData } from "@/types/gameData";

// game-data.queens a historiquement été un string[] ; on accepte encore ce format
// pour ne pas casser les documents Firestore existants tant qu'ils n'ont pas été
// resauvegardés depuis /admin.
export const normalizeQueens = (raw: unknown[]): QueenData[] =>
  raw.map((q) =>
    typeof q === "string" ? { name: q, eliminee: false } : (q as QueenData)
  );
