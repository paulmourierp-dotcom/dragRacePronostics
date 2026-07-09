"use client";
import { ReactNode } from "react";

const MAX_WIDTH_CLASSES = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
} as const;

interface ModalProps {
  maxWidth?: keyof typeof MAX_WIDTH_CLASSES;
  children: ReactNode;
}

// Pas de fermeture au clic sur le backdrop : certaines modales contiennent un formulaire
// non sauvegardé, la fermeture doit toujours passer par une action explicite (bouton dans children).
export default function Modal({ maxWidth = "sm", children }: ModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-surface rounded-card shadow-card p-6 w-full ${MAX_WIDTH_CLASSES[maxWidth]} max-h-[85vh] overflow-y-auto`}
      >
        {children}
      </div>
    </div>
  );
}
