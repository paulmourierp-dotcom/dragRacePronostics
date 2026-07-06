"use client";

const MESSAGES = [
  "Les Queens s'habillent, le show va commencer...",
  "Sashay, chargement en cours...",
  "Le rideau va se lever, un peu de patience Queen...",
  "On ajuste la perruque avant l'entrée en piste...",
];

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message }: LoadingScreenProps) {
  const text = message ?? MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50 p-6">
      <img src="/logo.png" alt="Logo" className="h-24 w-auto animate-drag-pulse" />
      <p className="text-purple-700 font-bold text-lg text-center max-w-sm">{text}</p>
    </div>
  );
}
