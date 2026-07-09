import { QueenData } from "@/types/gameData";

// game-data.queens a historiquement été un string[] ; on accepte encore ce format
// pour ne pas casser les documents Firestore existants tant qu'ils n'ont pas été
// resauvegardés depuis /admin.
export const normalizeQueens = (raw: unknown[]): QueenData[] =>
  raw.map((q) =>
    typeof q === "string" ? { name: q, eliminee: false } : (q as QueenData)
  );

// Convention de nommage des fichiers dans public/ : le nom de la Queen sans espaces,
// URL-encodé (ex. "La Harpie" -> "/LaHarpie.jpeg").
export const queenImageUrl = (name: string) => `/${encodeURIComponent(name.replace(/\s+/g, ""))}.jpeg`;
