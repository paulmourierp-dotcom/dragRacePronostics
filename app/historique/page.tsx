"use client";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/Header";
import EpisodeResultModal from "@/components/EpisodeResultModal";
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { UserData } from "@/types/user";
import { ConfigData } from "@/types/config";
import { PredictionData } from "@/types/prediction";
import { ResultData } from "@/types/result";

interface HistoryEntry {
  episodeId: number;
  prediction: PredictionData;
  result: ResultData | null;
}

// null = pas encore de résultat officiel (aucun avis à donner)
function Chip({ label, correct }: { label: string; correct: boolean | null }) {
  const style =
    correct === null
      ? "bg-gray-100 text-gray-600 border-gray-200"
      : correct
      ? "bg-green-100 text-green-800 border-green-300"
      : "bg-red-100 text-red-800 border-red-300";
  return (
    <span className={`text-sm font-semibold px-2 py-1 rounded border ${style}`}>
      {label}
    </span>
  );
}

function GuessRow({ label, guess, correct }: { label: string; guess: string | null; correct: boolean | null }) {
  return (
    <div>
      <p className="text-sm font-bold text-gray-700 mb-1">{label}</p>
      {guess ? <Chip label={guess} correct={correct} /> : <span className="text-sm text-gray-400">—</span>}
    </div>
  );
}

export default function HistoriquePage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalResult, setModalResult] = useState<ResultData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const [userDoc, nextEpisodeSnap] = await Promise.all([
        getDoc(doc(db, "users", user.uid)),
        getDoc(doc(db, "config", "next_episode")),
      ]);

      const myData = userDoc.data();
      setUserData(myData ? (myData as UserData) : null);

      const nextEpisodeNumero = nextEpisodeSnap.exists()
        ? (nextEpisodeSnap.data() as ConfigData).numero
        : null;

      const predsSnap = await getDocs(
        query(collection(db, "predictions"), where("userId", "==", user.uid))
      );
      const predictions = predsSnap
        .docs.map((d) => d.data() as PredictionData)
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
  }, []);

  const topGuesses = (prediction: PredictionData) =>
    Object.entries(prediction.queensResults)
      .filter(([, v]) => v === "top")
      .map(([queen]) => queen);

  const bottomGuesses = (prediction: PredictionData) =>
    Object.entries(prediction.queensResults)
      .filter(([, v]) => v === "bottom")
      .map(([queen]) => queen);

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-50">
        <Header isAdmin={userData?.role === "admin"} />

        <div className="p-6 max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-gray-900">Historique des pronostics</h1>

          {loading ? (
            <div className="p-10 text-center text-gray-500">Chargement...</div>
          ) : entries.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              Aucun pronostic dans l&apos;historique pour le moment.
            </div>
          ) : (
            <div className="space-y-6">
              {entries.map(({ episodeId, prediction, result }) => (
                <div key={episodeId} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Épisode {episodeId}</h2>
                    <div className="flex items-center gap-3">
                      {result ? (
                        <span className="font-bold text-purple-700">
                          {prediction.pointsEarned ?? 0} pts
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">En attente des résultats</span>
                      )}
                      <button
                        onClick={() => result && setModalResult(result)}
                        disabled={!result}
                        className="text-sm px-3 py-1 rounded border border-gray-200 text-gray-700 font-semibold disabled:opacity-40"
                      >
                        Voir les résultats
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-bold text-gray-700 mb-1">Top pronostiqué</p>
                      <div className="flex flex-wrap gap-2">
                        {topGuesses(prediction).length === 0 ? (
                          <span className="text-sm text-gray-400">—</span>
                        ) : (
                          topGuesses(prediction).map((queen) => (
                            <Chip
                              key={queen}
                              label={queen}
                              correct={result ? result.top.includes(queen) : null}
                            />
                          ))
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-700 mb-1">Bottom pronostiqué</p>
                      <div className="flex flex-wrap gap-2">
                        {bottomGuesses(prediction).length === 0 ? (
                          <span className="text-sm text-gray-400">—</span>
                        ) : (
                          bottomGuesses(prediction).map((queen) => (
                            <Chip
                              key={queen}
                              label={queen}
                              correct={result ? result.bottom.includes(queen) : null}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <GuessRow
                      label="Gagnante"
                      guess={prediction.winner}
                      correct={result ? prediction.winner === result.winner : null}
                    />
                    <GuessRow
                      label="Éliminée"
                      guess={prediction.eliminee}
                      correct={result ? prediction.eliminee === result.eliminee : null}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <GuessRow
                      label="Mini-Défi"
                      guess={prediction.miniDefi}
                      correct={result ? prediction.miniDefi === result.miniDefi : null}
                    />
                    <GuessRow
                      label="Maxi-Défi"
                      guess={prediction.maxiDefi}
                      correct={result ? prediction.maxiDefi === result.maxiDefi : null}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {modalResult && (
        <EpisodeResultModal result={modalResult} onClose={() => setModalResult(null)} />
      )}
    </AuthGuard>
  );
}
