"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/Header";
import LoadingScreen from "@/components/LoadingScreen";
import PredictionBreakdown from "@/components/PredictionBreakdown";
import Card from "@/components/ui/Card";
import Accordion from "@/components/ui/Accordion";
import PickRow from "@/components/ui/PickRow";
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where, Timestamp } from "firebase/firestore";
import { UserData } from "@/types/user";
import { ConfigData } from "@/types/config";
import { PredictionData } from "@/types/prediction";
import { ResultData } from "@/types/result";
import { QueenData } from "@/types/gameData";
import { normalizeQueens } from "@/lib/queens";
import { activeQueensAtEpisode } from "@/lib/episodeRoster";

interface HistoryEntry {
  episodeId: number;
  prediction: PredictionData;
  result: ResultData;
}

const formatDateDiffusion = (timestamp?: Timestamp) =>
  timestamp
    ? timestamp.toDate().toLocaleString("fr-FR", {
        dateStyle: "long",
        timeStyle: "short",
      })
    : "";

export default function HistoriquePage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [allQueens, setAllQueens] = useState<QueenData[]>([]);
  const [resultsHistory, setResultsHistory] = useState<ResultData[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextEpisode, setNextEpisode] = useState<ConfigData | null>(null);
  const [draftPrediction, setDraftPrediction] = useState<PredictionData | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const [userDoc, nextEpisodeSnap, queensSnap] = await Promise.all([
          getDoc(doc(db, "users", user.uid)),
          getDoc(doc(db, "config", "next_episode")),
          getDoc(doc(db, "game-data", "w5fjPTmVyX0HZb3oqFW9")),
        ]);

        const myData = userDoc.data();
        setUserData(myData ? (myData as UserData) : null);

        const nextEpisodeConfig = nextEpisodeSnap.exists() ? (nextEpisodeSnap.data() as ConfigData) : null;
        setNextEpisode(nextEpisodeConfig);

        const queens = queensSnap.exists() ? normalizeQueens(queensSnap.data().queens || []) : [];
        setAllQueens(queens);

        const [predsSnap, resultsSnap] = await Promise.all([
          getDocs(query(collection(db, "predictions"), where("userId", "==", user.uid))),
          getDocs(collection(db, "results")),
        ]);
        const predictions = predsSnap.docs.map((d) => d.data() as PredictionData);
        const fetchedResultsHistory = resultsSnap.docs.map((d) => d.data() as ResultData);
        setResultsHistory(fetchedResultsHistory);
        const resultByEpisode = new Map(fetchedResultsHistory.map((r) => [r.numero, r]));

        const pastEntries: HistoryEntry[] = predictions
          .map((prediction) => {
            const result = resultByEpisode.get(prediction.episodeId);
            return result ? { episodeId: prediction.episodeId, prediction, result } : null;
          })
          .filter((e): e is HistoryEntry => e !== null)
          .sort((a, b) => b.episodeId - a.episodeId);

        setEntries(pastEntries);

        if (nextEpisodeConfig?.numero != null) {
          const draft = predictions.find((p) => p.episodeId === nextEpisodeConfig.numero) ?? null;
          setDraftPrediction(draft);
        }
      } catch (error) {
        console.error("Erreur :", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const draftCategories = draftPrediction
    ? [
        {
          label: "Bottom",
          values: Object.entries(draftPrediction.queensResults)
            .filter(([, v]) => v === "bottom")
            .map(([q]) => q),
        },
        { label: "Éliminée", values: draftPrediction.eliminee ? [draftPrediction.eliminee] : [] },
        {
          label: "Top",
          values: Object.entries(draftPrediction.queensResults)
            .filter(([, v]) => v === "top")
            .map(([q]) => q),
        },
        { label: "Gagnante", values: draftPrediction.winner ? [draftPrediction.winner] : [] },
        { label: "Mini-défi", values: draftPrediction.miniDefi ? [draftPrediction.miniDefi] : [] },
        { label: "Maxi-défi", values: draftPrediction.maxiDefi ? [draftPrediction.maxiDefi] : [] },
        ...(nextEpisode?.bonusQuestion
          ? [{ label: nextEpisode.bonusQuestion.question, values: draftPrediction.bonusAnswer ? [draftPrediction.bonusAnswer] : [] }]
          : []),
      ]
    : [];

  return (
    <AuthGuard>
      <main className="min-h-screen bg-page">
        <Header isAdmin={userData?.role === "admin"} />

        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-9 pb-16">
          <h1 className="font-display text-3xl font-extrabold text-ink mb-7">
            Historique &amp; pronostic en cours
          </h1>

          {loading ? (
            <LoadingScreen message="On compile les scores des dernières lip-syncs..." />
          ) : (
            <div className="space-y-9">
              <Card className="p-0 overflow-hidden">
                <div className="flex justify-between items-center gap-3 flex-wrap px-6 py-5 bg-brand-tint">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-brand mb-0.5">
                      Prochain épisode
                    </div>
                    <div className="font-display text-lg font-extrabold text-ink">
                      Épisode {nextEpisode?.numero ?? "—"}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1.5 rounded-pill ${
                      draftPrediction
                        ? "bg-verdict-correct-bg text-verdict-correct-ink"
                        : "bg-status-bottom-bg text-status-bottom-ink"
                    }`}
                  >
                    {draftPrediction ? "✓ Pronostic enregistré" : "Pronostic à faire"}
                  </span>
                </div>

                <div className="px-6 py-5">
                  {!nextEpisode ? (
                    <p className="text-ink-muted">Aucun épisode à pronostiquer pour le moment.</p>
                  ) : !draftPrediction ? (
                    <p className="text-ink-muted">
                      Tu n&apos;as pas encore pronostiqué cet épisode. Diffusion prévue le{" "}
                      {formatDateDiffusion(nextEpisode.dateDiffusion)}.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {draftCategories.map((cat) => (
                        <PickRow key={cat.label} label={cat.label} values={cat.values} />
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => router.push("/pronostics")}
                    className="text-sm font-bold text-brand mt-4"
                  >
                    Modifier le pronostic →
                  </button>
                </div>
              </Card>

              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-4">
                  Historique
                </div>
                {entries.length === 0 ? (
                  <div className="p-6 text-center text-ink-muted bg-surface rounded-card border border-surface-border">
                    Aucun épisode diffusé pour le moment.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3.5">
                    {entries.map(({ episodeId, prediction, result }, i) => (
                      <Accordion
                        key={episodeId}
                        defaultOpen={i === 0}
                        title={`Épisode ${episodeId}`}
                        subtitle={
                          <span className="font-display text-sm font-extrabold text-brand bg-brand-tint px-3 py-1 rounded-pill">
                            {prediction.pointsEarned ?? 0} pts
                          </span>
                        }
                      >
                        <PredictionBreakdown
                          prediction={prediction}
                          result={result}
                          activeQueens={activeQueensAtEpisode(allQueens, resultsHistory, episodeId)}
                          showOfficial
                        />
                      </Accordion>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
