"use client";
import { useId } from "react";

const MESSAGES = [
  "Les Queens s'habillent, le show va commencer...",
  "Sashay, chargement en cours...",
  "Le rideau va se lever, un peu de patience Queen...",
  "On ajuste la perruque avant l'entrée en piste...",
];

interface LoadingScreenProps {
  message?: string;
}

// Dérive un index déterministe (donc identique serveur/client, pas de mismatch d'hydratation)
// à partir de useId() plutôt que Math.random() (impur, interdit pendant le rendu ici).
function messageIndexFromId(id: string, count: number) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % count;
}

export default function LoadingScreen({ message }: LoadingScreenProps) {
  const id = useId();
  const text = message ?? MESSAGES[messageIndexFromId(id, MESSAGES.length)];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-page p-6">
      <img src="/logo.png" alt="Logo" className="h-24 w-auto animate-drag-pulse" />
      <p className="text-brand font-bold text-lg text-center max-w-sm">{text}</p>
    </div>
  );
}
