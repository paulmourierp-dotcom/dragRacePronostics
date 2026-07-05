"use client"
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/Header";
import { auth, db } from "@/lib/firebase";
import { ConfigData } from "@/types/config";
import { PredictionData } from "@/types/prediction";
import { UserData } from "@/types/user";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

type QueenChoice = "top" | "bottom" | "";

export default function PronosticPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [queens, setQueens] = useState<string[]>([]);
  const [episodeNum, setEpisodeNum] = useState<number | null>(null);
  const [dateDiffusion, setDateDiffusion] = useState<Date | null>(null);
  const [queensResults, setQueensResults] = useState<Record<string, "top" | "bottom">>({});
  const [winner, setWinner] = useState<string | null>(null);
  const [loser, setLoser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      const myData = userDoc.data();
      setUserData(myData ? (myData as UserData) : null);

      const [nextEpisodeSnap, queensSnap] = await Promise.all([
        getDoc(doc(db, "config", "next_episode")),
        getDoc(doc(db, "game-data", "w5fjPTmVyX0HZb3oqFW9")),
      ]);

      const nextEpisode = nextEpisodeSnap.exists() ? (nextEpisodeSnap.data() as ConfigData) : null;
      const numero = nextEpisode?.numero ?? null;
      setEpisodeNum(numero);
      setDateDiffusion(nextEpisode?.dateDiffusion ? nextEpisode.dateDiffusion.toDate() : null);

      if (queensSnap.exists()) {
        setQueens((queensSnap.data().queens as string[]) || []);
      }

      if (numero !== null) {
        const predictionSnap = await getDoc(doc(db, "predictions", `${user.uid}_ep${numero}`));
        if (predictionSnap.exists()) {
          const data = predictionSnap.data() as PredictionData;
          setQueensResults(data.queensResults || {});
          setWinner(data.winner ?? null);
          setLoser(data.eliminee ?? null);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const isPastDeadline = dateDiffusion !== null && dateDiffusion.getTime() < Date.now();

  const topCount = Object.values(queensResults).filter((v) => v === "top").length;
  const bottomCount = Object.values(queensResults).filter((v) => v === "bottom").length;
  const allSelected = topCount === 2 && bottomCount === 2;
  const topQueens = queens.filter((q) => queensResults[q] === "top");
  const bottomQueens = queens.filter((q) => queensResults[q] === "bottom");

  const isOptionDisabled = (queen: string, option: "top" | "bottom") => {
    const count = option === "top" ? topCount : bottomCount;
    return count >= 2 && queensResults[queen] !== option;
  };

  const handleQueenChange = (queen: string, value: QueenChoice) => {
    setQueensResults((prev) => {
      const updated = { ...prev };
      if (value === "") {
        delete updated[queen];
      } else {
        updated[queen] = value;
      }
      return updated;
    });

    // Une Queen qui change de statut ne peut plus rester gagnante/éliminée
    if (winner === queen && value !== "top") setWinner(null);
    if (loser === queen && value !== "bottom") setLoser(null);
  };

  const savePronostics = async () => {
    const user = auth.currentUser;
    if (!user || episodeNum === null || isPastDeadline) return;

    setSaving(true);
    try {
      await setDoc(
        doc(db, "predictions", `${user.uid}_ep${episodeNum}`),
        {
          userId: user.uid,
          episodeId: episodeNum,
          queensResults,
          winner,
          // nommé "eliminee" pour matcher le vocabulaire de lib/scoring.js
          eliminee: loser,
          updatedAt: new Date(),
        },
        { merge: true }
      );
      alert("Pronostics enregistrés !");
    } catch (error) {
      console.error("Erreur :", error);
      alert("Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="p-10 text-center text-gray-500">Chargement...</div>
      </AuthGuard>
    );
  }

  if (episodeNum === null) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-gray-50">
          <Header isAdmin={userData?.role === "admin"} />
          <div className="p-10 text-center text-gray-500">
            Aucun épisode à pronostiquer pour le moment.
          </div>
        </main>
      </AuthGuard>
    );
  }

  if (isPastDeadline) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-gray-50">
          <Header isAdmin={userData?.role === "admin"} />
          <div className="p-10 text-center text-gray-500">
            Les pronostics pour l&apos;épisode {episodeNum} sont clos : l&apos;épisode a déjà été diffusé.
          </div>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-50">
        <Header isAdmin={userData?.role === "admin"} />

        <div className="p-6 max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-gray-900">
            Pronostics - Épisode {episodeNum}
          </h1>

          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <table className="w-full text-center">
              <thead>
                <tr>
                  {queens.map((queen) => (
                    <th key={queen} className="p-2 text-gray-900 font-bold border-b border-gray-100">
                      {queen}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {queens.map((queen) => (
                    <td key={queen} className="p-2">
                      <select
                        value={queensResults[queen] || ""}
                        onChange={(e) => handleQueenChange(queen, e.target.value as QueenChoice)}
                        className="border border-gray-200 rounded p-1 text-gray-900"
                      >
                        <option value="">--</option>
                        <option value="top" disabled={isOptionDisabled(queen, "top")}>Top</option>
                        <option value="bottom" disabled={isOptionDisabled(queen, "bottom")}>Bottom</option>
                      </select>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {allSelected && (
            <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Gagnante &amp; Éliminée</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Gagnante (parmi le Top)
                  </label>
                  <select
                    value={winner || ""}
                    onChange={(e) => setWinner(e.target.value || null)}
                    className="w-full border border-gray-200 rounded p-2 text-gray-900"
                  >
                    <option value="">--</option>
                    {topQueens.map((q) => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Éliminée (parmi le Bottom)
                  </label>
                  <select
                    value={loser || ""}
                    onChange={(e) => setLoser(e.target.value || null)}
                    className="w-full border border-gray-200 rounded p-2 text-gray-900"
                  >
                    <option value="">--</option>
                    {bottomQueens.map((q) => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={savePronostics}
              disabled={saving}
              className="flex items-center gap-2 bg-purple-600 text-white font-bold px-4 py-2 rounded-xl disabled:opacity-50"
            >
              💾 {saving ? "Enregistrement..." : "Sauvegarder"}
            </button>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
