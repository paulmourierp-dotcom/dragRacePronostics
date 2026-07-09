"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/Header";
import LoadingScreen from "@/components/LoadingScreen";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import RatingBar from "@/components/ui/RatingBar";
import Accordion from "@/components/ui/Accordion";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { UserData } from "@/types/user";
import { QueenData } from "@/types/gameData";
import { ResultData } from "@/types/result";
import { QueenRatingData } from "@/types/rating";
import { normalizeQueens, queenImageUrl } from "@/lib/queens";
import { statusForQueenInResult, QueenEpisodeStatus } from "@/lib/queenStatus";
import { communityAverage } from "@/lib/rating";

const STATUS_TONE: Record<QueenEpisodeStatus, "winner" | "top" | "bottom" | "safe"> = {
  winner: "winner",
  top: "top",
  bottom: "bottom",
  safe: "safe",
};

export default function QueenDetailPage() {
  const params = useParams<{ name: string }>();
  const queenName = decodeURIComponent(params.name);
  const router = useRouter();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [queens, setQueens] = useState<QueenData[]>([]);
  const [resultsHistory, setResultsHistory] = useState<ResultData[]>([]);
  const [myRatings, setMyRatings] = useState<QueenRatingData[]>([]);
  const [allRatings, setAllRatings] = useState<QueenRatingData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const [userDoc, queensSnap, resultsSnap, ratingsSnap] = await Promise.all([
        getDoc(doc(db, "users", user.uid)),
        getDoc(doc(db, "game-data", "w5fjPTmVyX0HZb3oqFW9")),
        getDocs(collection(db, "results")),
        getDocs(collection(db, "queenRatings")),
      ]);

      const myData = userDoc.data();
      setUserData(myData ? (myData as UserData) : null);

      if (queensSnap.exists()) {
        setQueens(normalizeQueens(queensSnap.data().queens || []));
      }

      setResultsHistory(
        resultsSnap.docs.map((d) => d.data() as ResultData).sort((a, b) => b.numero - a.numero)
      );

      const allRatingsData = ratingsSnap.docs.map((d) => d.data() as QueenRatingData);
      setAllRatings(allRatingsData);
      setMyRatings(allRatingsData.filter((r) => r.userId === user.uid));

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <AuthGuard>
        <LoadingScreen message="On feuillette le book de la Queen..." />
      </AuthGuard>
    );
  }

  const queen = queens.find((q) => q.name === queenName);

  if (!queen) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-page">
          <Header isAdmin={userData?.role === "admin"} />
          <div className="p-10 text-center text-ink-muted">Cette Queen est introuvable.</div>
        </main>
      </AuthGuard>
    );
  }

  const eliminatedResult = resultsHistory.find((r) => r.eliminee === queen.name);
  // Épisodes où elle est apparue : tous ceux publiés jusqu'à (et y compris) celui de son
  // élimination, ou tous les épisodes publiés si elle est encore active.
  const appearances = resultsHistory
    .filter((r) => !eliminatedResult || r.numero <= eliminatedResult.numero)
    .sort((a, b) => b.numero - a.numero);

  const timesWinner = appearances.filter((r) => r.winner === queen.name).length;
  const timesTop = appearances.filter((r) => r.top.includes(queen.name)).length;
  const timesBottom = appearances.filter((r) => r.bottom.includes(queen.name)).length;
  const avgUserRating = communityAverage(myRatings, queen.name);

  const latestAppearance = appearances[0] ?? null;
  const currentStatus = latestAppearance ? statusForQueenInResult(queen.name, latestAppearance) : null;

  return (
    <AuthGuard>
      <main className="min-h-screen bg-page">
        <Header isAdmin={userData?.role === "admin"} />

        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-9 pb-16">
          <button
            onClick={() => router.push("/queens")}
            className="text-sm font-bold text-brand mb-5 block"
          >
            ← Retour aux Queens
          </button>

          <div className="flex gap-7 flex-wrap mb-8">
            <div className="relative w-[180px] h-[180px] rounded-tile overflow-hidden flex-none">
              <Image
                src={queenImageUrl(queen.name)}
                alt={queen.name}
                fill
                sizes="180px"
                className={`object-cover ${queen.eliminee ? "grayscale brightness-75" : ""}`}
              />
            </div>
            <div className="flex-1 min-w-[240px]">
              <h1 className="font-display text-3xl font-extrabold text-ink mb-2">{queen.name}</h1>
              {eliminatedResult ? (
                <Badge tone="eliminee" className="mb-5">
                  {`Éliminée à l'épisode ${eliminatedResult.numero}`}
                </Badge>
              ) : currentStatus ? (
                <Badge tone={STATUS_TONE[currentStatus]} className="mb-5" />
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Card className="p-4 min-w-[110px]">
                  <div className="font-display text-2xl font-extrabold text-brand">
                    {avgUserRating != null ? avgUserRating.toFixed(1) : "—"}
                  </div>
                  <div className="text-xs font-semibold text-ink-muted">Moyenne cumulée /10</div>
                </Card>
                <Card className="p-4 min-w-[110px]">
                  <div className="font-display text-2xl font-extrabold text-brand">{timesTop}</div>
                  <div className="text-xs font-semibold text-ink-muted">Fois dans le top</div>
                </Card>
                <Card className="p-4 min-w-[110px]">
                  <div className="font-display text-2xl font-extrabold text-brand">{timesBottom}</div>
                  <div className="text-xs font-semibold text-ink-muted">Fois dans le bottom</div>
                </Card>
                <Card className="p-4 min-w-[110px]">
                  <div className="font-display text-2xl font-extrabold text-brand">{timesWinner}</div>
                  <div className="text-xs font-semibold text-ink-muted">Fois gagnante</div>
                </Card>
              </div>
            </div>
          </div>

          <div className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-4">
            Parcours épisode par épisode
          </div>

          {appearances.length === 0 ? (
            <p className="text-ink-muted">Aucun épisode diffusé pour le moment.</p>
          ) : (
            <div className="flex flex-col gap-3.5">
              {appearances.map((result) => {
                const status = statusForQueenInResult(queen.name, result);
                const myRatingDoc = myRatings.find((r) => r.episodeId === result.numero);
                const myValue = myRatingDoc?.ratings[queen.name] ?? null;
                const episodeRatings = allRatings.filter((r) => r.episodeId === result.numero);
                const community = communityAverage(episodeRatings, queen.name);

                return (
                  <Accordion
                    key={result.numero}
                    title={`Épisode ${result.numero}`}
                    subtitle={<Badge tone={STATUS_TONE[status]} />}
                    defaultOpen={result.numero === latestAppearance?.numero}
                  >
                    <div className="flex flex-wrap gap-7 items-center pt-1">
                      <RatingBar label="Ta note" value={myValue} tone="mine" />
                      <RatingBar label="Moyenne joueurs" value={community} tone="community" />
                      {myValue == null && (
                        <button
                          onClick={() => router.push(`/notation/${result.numero}`)}
                          className="text-sm font-bold text-brand bg-brand-tint px-3.5 py-2 rounded-button"
                        >
                          Noter cette prestation →
                        </button>
                      )}
                    </div>
                  </Accordion>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
