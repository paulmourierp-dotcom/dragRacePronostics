"use client";
import Button from "@/components/Button";

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Avant de continuer</h2>
        <p className="text-sm text-gray-500 mb-4">
          Il te reste {items.length > 1 ? "quelques actions" : "une action"} à faire :
        </p>

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.key} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
              <p className="font-bold text-gray-900">{item.title}</p>
              <p className="text-sm text-gray-600 mt-1 mb-3">{item.description}</p>
              <Button size="sm" onClick={item.onAction}>
                {item.actionLabel}
              </Button>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="text-sm text-gray-500 font-semibold">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
