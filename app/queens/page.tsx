"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/Header";
import LoadingScreen from "@/components/LoadingScreen";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { UserData } from "@/types/user";
import { QueenData } from "@/types/gameData";
import { ResultData } from "@/types/result";
import { normalizeQueens, queenImageUrl } from "@/lib/queens";
import { statusForQueenInResult, QueenEpisodeStatus } from "@/lib/queenStatus";

const DOT_CLASSES: Record<QueenEpisodeStatus, string> = {
  winner: "bg-status-winner-ink",
  top: "bg-status-top-ink",
  bottom: "bg-status-bottom-ink",
  safe: "bg-status-safe-ink",
};

export default function QueensPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [queens, setQueens] = useState<QueenData[]>([]);
  const [resultsHistory, setResultsHistory] = useState<ResultData[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const [userDoc, queensSnap, resultsSnap] = await Promise.all([
        getDoc(doc(db, "users", user.uid)),
        getDoc(doc(db, "game-data", "w5fjPTmVyX0HZb3oqFW9")),
        getDocs(collection(db, "results")),
      ]);

      const myData = userDoc.data();
      setUserData(myData ? (myData as UserData) : null);

      if (queensSnap.exists()) {
        setQueens(normalizeQueens(queensSnap.data().queens || []));
      }

      setResultsHistory(
        resultsSnap.docs.map((d) => d.data() as ResultData).sort((a, b) => b.numero - a.numero)
      );

      setLoading(false);
    };

    fetchData();
  }, []);

  const mostRecentResult = resultsHistory[0] ?? null;

  return (
    <AuthGuard>
      <main className="min-h-screen bg-page">
        <Header isAdmin={userData?.role === "admin"} />

        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-9 pb-16">
          <h1 className="font-display text-3xl font-extrabold text-ink mb-1.5">Les Queens</h1>
          <p className="text-ink-soft mb-7">
            Clique sur une queen pour voir son parcours, ta note et la moyenne des joueurs.
          </p>

          {loading ? (
            <LoadingScreen message="On sort les looks du dressing..." />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {queens.map((queen) => {
                const eliminatedResult = resultsHistory.find((r) => r.eliminee === queen.name);
                const status = mostRecentResult
                  ? statusForQueenInResult(queen.name, mostRecentResult)
                  : null;

                return (
                  <button
                    key={queen.name}
                    type="button"
                    onClick={() => router.push(`/queens/${encodeURIComponent(queen.name)}`)}
                    className="relative rounded-tile overflow-hidden aspect-square border border-surface-border shadow-card text-left"
                  >
                    <Image
                      src={queenImageUrl(queen.name)}
                      alt={queen.name}
                      fill
                      sizes="(max-width: 640px) 45vw, 220px"
                      className={`object-cover ${queen.eliminee ? "grayscale brightness-75" : ""}`}
                    />

                    {queen.eliminee && eliminatedResult && (
                      <div className="absolute top-2.5 left-2.5 right-2.5 bg-status-eliminee-ink/90 text-white font-display text-[10px] font-bold tracking-wide text-center py-1.5 px-1 rounded-button">
                        ÉLIMINÉE ÉP.{eliminatedResult.numero}
                      </div>
                    )}

                    {!queen.eliminee && status && (
                      <span
                        className={`absolute top-2.5 right-2.5 w-3 h-3 rounded-full border-2 border-white ${DOT_CLASSES[status]}`}
                      />
                    )}

                    <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-xs sm:text-sm font-bold text-center py-1.5 px-1">
                      {queen.name}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
