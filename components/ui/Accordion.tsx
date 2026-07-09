"use client";
import { ReactNode, useState } from "react";

interface AccordionProps {
  title: ReactNode;
  subtitle?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

// Chaque instance gère son propre état ouvert/fermé (non contrôlé) : plusieurs accordéons
// peuvent être ouverts simultanément, ce qui suffit pour tous les usages actuels
// (Historique, modale joueur, fiche Queen) et reste "fermé par défaut" par défaut.
export default function Accordion({ title, subtitle, defaultOpen = false, children }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-surface-border rounded-card overflow-hidden bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex justify-between items-center gap-3 px-5 py-4 text-left"
      >
        <span className="font-display font-bold text-ink">{title}</span>
        <span className="flex items-center gap-3">
          {subtitle}
          <span
            className="text-ink-faint text-sm transition-transform"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            ▼
          </span>
        </span>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}
