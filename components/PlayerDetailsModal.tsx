"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { ConfigData } from "@/types/config";
import { PredictionData } from "@/types/prediction";
import { ResultData } from "@/types/result";
import PredictionBreakdown from "@/components/PredictionBreakdown";

interface PlayerDetailsModalProps {
  uid: string;
  surnom: string;
  rank: number;
  onClose: () => void;
}

interface EpisodeEntry {
  episodeId: number;
  prediction: PredictionData;
  result: ResultData | null;
}

export default function PlayerDetailsModal({ uid, surnom, rank, onClose }: PlayerDetailsModalProps) {
  const [entries, setEntries] = useState<EpisodeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [openEpisode, setOpenEpisode] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Le pronostic du prochain épisode (non encore diffusé) reste privé, comme sur /historique
      const nextEpisodeSnap = await getDoc(doc(db, "config", "next_episode"));
      const nextEpisodeNumero = nextEpisodeSnap.exists()
        ? (nextEpisodeSnap.data() as ConfigData).numero
        : null;

      const predsSnap = await getDocs(
        query(collection(db, "predictions"), where("userId", "==", uid))
      );
      const predictions = predsSnap.docs
        .map((d) => d.data() as PredictionData)
        .filter((p) => p.episodeId !== nextEpisodeNumero)
        .sort((a, b) => b.episodeId - a.episodeId);

      const results = await Promise.all(
        predictions.map((p) => getDoc(doc(db, "results", String(p.episodeId))))
      );

      setEntries(
        predictions.map((prediction, i) => ({
          episodeId: prediction.episodeId,
          prediction,
          result: results[i].exists() ? (results[i].data() as ResultData) : null,
        }))
      );
      setLoading(false);
    };

    fetchData();
  }, [uid]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900">{surnom}</h2>
        <p className="text-gray-600 font-semibold mb-4">
          Classement : {rank > 0 ? `${rank}e position` : "Non classé"}
        </p>

        {loading ? (
          <p className="text-gray-500">Chargement...</p>
        ) : entries.length === 0 ? (
          <p className="text-gray-500">Aucun pronostic pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {entries.map(({ episodeId, prediction, result }) => {
              const isOpen = openEpisode === episodeId;
              return (
                <div key={episodeId} className="border border-gray-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenEpisode(isOpen ? null : episodeId)}
                    className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 text-left"
                  >
                    <span className="font-bold text-gray-900">Épisode {episodeId}</span>
                    <span className="font-bold text-purple-700">
                      {result ? `${prediction.pointsEarned ?? 0} pts` : "En attente des résultats"}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="p-4">
                      <PredictionBreakdown prediction={prediction} result={result} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="bg-purple-600 text-white font-bold px-4 py-2 rounded-xl">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
