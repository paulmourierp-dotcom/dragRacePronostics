"use client";
import Button from "@/components/Button";
import Modal from "@/components/ui/Modal";

export interface PendingActionItem {
  key: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

interface PendingActionsModalProps {
  items: PendingActionItem[];
  onClose: () => void;
}

// Réapparaît à chaque chargement du dashboard tant que les actions listées ne sont pas
// effectuées (pas de bouton "plus tard" persistant) : c'est volontaire, pour ne rien oublier.
export default function PendingActionsModal({ items, onClose }: PendingActionsModalProps) {
  return (
    <Modal onClose={onClose} maxWidth="sm">
      <h2 className="font-display text-xl font-bold text-ink mb-1">Avant de continuer</h2>
      <p className="text-sm text-ink-muted mb-4">
        Il te reste {items.length > 1 ? "quelques actions" : "une action"} à faire :
      </p>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.key} className="border border-surface-border rounded-card p-4 bg-page">
            <p className="font-bold text-ink">{item.title}</p>
            <p className="text-sm text-ink-soft mt-1 mb-3">{item.description}</p>
            <Button size="sm" onClick={item.onAction}>
              {item.actionLabel}
            </Button>
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-6">
        <button onClick={onClose} className="text-sm text-ink-muted font-semibold">
          Fermer
        </button>
      </div>
    </Modal>
  );
}
