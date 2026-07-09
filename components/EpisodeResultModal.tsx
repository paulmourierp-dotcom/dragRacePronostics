"use client";
import { ResultData } from "@/types/result";
import Button from "@/components/Button";
import Modal from "@/components/ui/Modal";

interface EpisodeResultModalProps {
  result: ResultData;
  onClose: () => void;
}

export default function EpisodeResultModal({ result, onClose }: EpisodeResultModalProps) {
  return (
    <Modal onClose={onClose} maxWidth="sm">
      <h2 className="font-display text-xl font-bold text-ink mb-4">
        Résultats officiels - Épisode {result.numero}
      </h2>

      <ul className="space-y-2 text-ink-soft">
        <li><span className="font-bold text-ink">Top :</span> {result.top.join(", ")}</li>
        <li><span className="font-bold text-ink">Bottom :</span> {result.bottom.join(", ")}</li>
        <li><span className="font-bold text-ink">Gagnante :</span> {result.winner}</li>
        <li><span className="font-bold text-ink">Éliminée :</span> {result.eliminee}</li>
        <li><span className="font-bold text-ink">Mini-Défi :</span> {result.miniDefi}</li>
        <li><span className="font-bold text-ink">Maxi-Défi :</span> {result.maxiDefi}</li>
      </ul>

      <div className="flex justify-end mt-6">
        <Button onClick={onClose}>Fermer</Button>
      </div>
    </Modal>
  );
}
