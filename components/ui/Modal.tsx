"use client";
import { ReactNode } from "react";

const MAX_WIDTH_CLASSES = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
} as const;

interface ModalProps {
  onClose: () => void;
  maxWidth?: keyof typeof MAX_WIDTH_CLASSES;
  children: ReactNode;
}

export default function Modal({ onClose, maxWidth = "sm", children }: ModalProps) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-surface rounded-card shadow-card p-6 w-full ${MAX_WIDTH_CLASSES[maxWidth]} max-h-[85vh] overflow-y-auto`}
      >
        {children}
      </div>
    </div>
  );
}
