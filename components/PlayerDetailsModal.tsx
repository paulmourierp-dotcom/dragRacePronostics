"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
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
  prediction: PredictionData | null;
  result: ResultData;
}

export default function PlayerDetailsModal({ uid, surnom, rank, onClose }: PlayerDetailsModalProps) {
  const [entries, setEntries] = useState<EpisodeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [openEpisode, setOpenEpisode] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // On part de tous les épisodes déjà résultés (pas des pronostics du joueur) : un
      // épisode scoré doit apparaître même si ce joueur n'a jamais pronostiqué dessus.
      const [resultsSnap, predsSnap] = await Promise.all([
        getDocs(collection(db, "results")),
        getDocs(query(collection(db, "predictions"), where("userId", "==", uid))),
      ]);

      const predictionByEpisode = new Map<number, PredictionData>();
      predsSnap.docs.forEach((d) => {
        const prediction = d.data() as PredictionData;
        predictionByEpisode.set(prediction.episodeId, prediction);
      });

      const scoredEntries = resultsSnap.docs
        .map((d) => d.data() as ResultData)
        .map((result) => ({
          episodeId: result.numero,
          prediction: predictionByEpisode.get(result.numero) ?? null,
          result,
        }))
        .sort((a, b) => b.episodeId - a.episodeId);

      setEntries(scoredEntries);
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
          <p className="text-gray-500">Aucun épisode résulté pour le moment.</p>
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
                    <span className="font-bold text-purple-700">{prediction?.pointsEarned ?? 0} pts</span>
                  </button>
                  {isOpen && (
                    <div className="p-4">
                      {prediction ? (
                        <PredictionBreakdown prediction={prediction} result={result} />
                      ) : (
                        <p className="text-sm text-gray-500">
                          Ce joueur n&apos;a pas effectué de pronostic dans le temps imparti.
                        </p>
                      )}
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
