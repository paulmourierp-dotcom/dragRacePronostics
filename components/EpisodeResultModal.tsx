"use client";
import { ResultData } from "@/types/result";
import Button from "@/components/Button";

interface EpisodeResultModalProps {
  result: ResultData;
  onClose: () => void;
}

export default function EpisodeResultModal({ result, onClose }: EpisodeResultModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Résultats officiels - Épisode {result.numero}
        </h2>

        <ul className="space-y-2 text-gray-800">
          <li><span className="font-bold">Top :</span> {result.top.join(", ")}</li>
          <li><span className="font-bold">Bottom :</span> {result.bottom.join(", ")}</li>
          <li><span className="font-bold">Gagnante :</span> {result.winner}</li>
          <li><span className="font-bold">Éliminée :</span> {result.eliminee}</li>
          <li><span className="font-bold">Mini-Défi :</span> {result.miniDefi}</li>
          <li><span className="font-bold">Maxi-Défi :</span> {result.maxiDefi}</li>
        </ul>

        <div className="flex justify-end mt-6">
          <Button onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  );
}
