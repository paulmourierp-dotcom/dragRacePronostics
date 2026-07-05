// Document Firestore : game-data/{id} — queens.name doit correspondre au nom de fichier dans public/ (ex. "LaHarpie" -> /LaHarpie.jpeg)
export interface QueenData {
  name: string;
  eliminee: boolean;
}

export interface GameData {
  queens: QueenData[];
  minidefis: string[];
  maxidefis: string[];
}
