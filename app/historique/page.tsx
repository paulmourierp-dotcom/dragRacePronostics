"use client";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/Header";
import EpisodeResultModal from "@/components/EpisodeResultModal";
import PredictionBreakdown from "@/components/PredictionBreakdown";
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

  const renderEntry = ({ episodeId, prediction, result }: HistoryEntry) => (
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

      <PredictionBreakdown prediction={prediction} result={result} />
    </div>
  );

  const inProgress = entries.filter((e) => e.result === null);
  const finished = entries.filter((e) => e.result !== null);

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
            <div className="space-y-10">
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Pronostics en cours</h2>
                {inProgress.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
                    Aucun pronostic en attente de résultats.
                  </div>
                ) : (
                  <div className="space-y-6">{inProgress.map(renderEntry)}</div>
                )}
              </section>

              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Pronostics terminés</h2>
                {finished.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
                    Aucun pronostic terminé pour le moment.
                  </div>
                ) : (
                  <div className="space-y-6">{finished.map(renderEntry)}</div>
                )}
              </section>
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
