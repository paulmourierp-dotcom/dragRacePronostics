"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { UserData } from "@/types/user";
import { ConfigData } from "@/types/config";
import { CrownResultData } from "@/types/crown";
import { PredictionData } from "@/types/prediction";
import { ResultData } from "@/types/result";
import { QueenData } from "@/types/gameData";
import { QueenRatingData } from "@/types/rating";
import { normalizeQueens } from "@/lib/queens";
import { activeQueensAtEpisode } from "@/lib/episodeRoster";
import { isRatingComplete } from "@/lib/rating";
import Image from "next/image";
import Header from "@/components/Header";
import CrownPredictionModal from "@/components/CrownPredictionModal";
import PlayerDetailsModal from "@/components/PlayerDetailsModal";
import PendingActionsModal, { PendingActionItem } from "@/components/PendingActionsModal";
import Button from "@/components/Button";
import Card from "@/components/ui/Card";
import { useToast } from "@/contexts/ToastContext";

const formatDateDiffusion = (timestamp?: Timestamp) =>
  timestamp
    ? timestamp.toDate().toLocaleString("fr-FR", {
        dateStyle: "long",
        timeStyle: "short",
      })
    : "";

interface PlayerRow extends UserData {
  uid: string;
}

// Classement standard (ex-aequo) : deux scores égaux partagent le même rang,
// et le rang suivant saute d'autant (1, 2, 2, 4...). `players` doit déjà être trié par score desc.
const computeRanks = (players: { score?: number }[]): number[] => {
  const ranks: number[] = [];
  let lastScore: number | null = null;
  let lastRank = 0;
  players.forEach((p, i) => {
    const score = p.score ?? 0;
    if (lastScore === null || score !== lastScore) {
      lastRank = i + 1;
      lastScore = score;
    }
    ranks.push(lastRank);
  });
  return ranks;
};

export default function DashboardPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const router = useRouter();
  const [allPlayers, setAllPlayers] = useState<PlayerRow[]>([]);
  const [myRank, setMyRank] = useState<number>(0);
  const [selectedPlayer, setSelectedPlayer] = useState<(PlayerRow & { rank: number }) | null>(null);
  const [nextEpisodeData, setNextEpisodeData] = useState<ConfigData | null>(null);
  const [hasPrediction, setHasPrediction] = useState(false);
  const [queens, setQueens] = useState<string[]>([]);
  const [crownLocked, setCrownLocked] = useState(false);
  const [showCrownModal, setShowCrownModal] = useState(false);
  const [pendingItems, setPendingItems] = useState<PendingActionItem[]>([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [latestRatableEpisode, setLatestRatableEpisode] = useState<number | null>(null);
  const [latestRatableEpisodeRated, setLatestRatableEpisodeRated] = useState(false);
  const showToast = useToast();

    useEffect(() => {
        const fetchData = async () => {
          try {
            // 1. Récupérer mon profil
            const user = auth.currentUser;
            if (!user) return;

            const userDoc = await getDoc(doc(db, "users", user.uid));
            const myData = userDoc.data();
            if (myData) {
            // On caste 'myData' en 'UserData' uniquement si il existe
            setUserData(myData as UserData);
            } else {
            // Si le document est vide en base, on met 'null'
            setUserData(null);
            }

            // 2. Récupérer tous les joueurs triés par score
            const q = query(collection(db, "users"), orderBy("score", "desc"));
            const querySnapshot = await getDocs(q);
            const players: PlayerRow[] = [];
            querySnapshot.forEach((playerDoc) => players.push({ ...(playerDoc.data() as UserData), uid: playerDoc.id }));

            setAllPlayers(players);

            // 3. Calculer mon classement (gère les ex-aequo)
            const ranks = computeRanks(players);
            const myIndex = players.findIndex(p => p.uid === user.uid);
            setMyRank(myIndex === -1 ? 0 : ranks[myIndex]);

            const configSnap = await getDoc(doc(db, "config", "next_episode"));
            const nextEpisode = configSnap.exists() ? (configSnap.data() as ConfigData) : null;
            if (nextEpisode) {
            setNextEpisodeData(nextEpisode);
            }

            // 3bis. Savoir si j'ai déjà un pronostic enregistré pour cet épisode
            let myPrediction: PredictionData | null = null;
            if (nextEpisode?.numero != null) {
            const predictionSnap = await getDoc(doc(db, "predictions", `${user.uid}_ep${nextEpisode.numero}`));
            setHasPrediction(predictionSnap.exists());
            if (predictionSnap.exists()) myPrediction = predictionSnap.data() as PredictionData;
            } else {
            setHasPrediction(false);
            }

            // 4. Récupérer la liste des Queens (toutes, + actives pour le pronostic couronne)
            const queensSnap = await getDoc(doc(db, "game-data", "w5fjPTmVyX0HZb3oqFW9"));
            let allQueens: QueenData[] = [];
            if (queensSnap.exists()) {
            allQueens = normalizeQueens(queensSnap.data().queens || []);
            setQueens(allQueens.filter((qn) => !qn.eliminee).map((qn) => qn.name));
            }

            // 5. Savoir si les pronostics couronne sont verrouillés par l'admin, et si j'en ai déjà fait un
            const [crownResultSnap, crownPredictionSnap] = await Promise.all([
              getDoc(doc(db, "config", "crown_result")),
              getDoc(doc(db, "crownPredictions", user.uid)),
            ]);
            let isCrownLocked = false;
            if (crownResultSnap.exists()) {
              isCrownLocked = (crownResultSnap.data() as CrownResultData).locked ?? false;
              setCrownLocked(isCrownLocked);
            }

            // 5bis. Notation en attente : le plus ancien épisode publié pas encore entièrement noté
            // (alimente le rappel), et notation de l'épisode notable en ce moment (le plus récent
            // publié : la carte "Ton avis compte" y reste attachée, en "Modifier les notes" une fois
            // faite, jusqu'à ce qu'un épisode plus récent soit publié).
            // Isolé dans son propre try/catch : une erreur ici (ex. règle Firestore queenRatings pas
            // encore déployée) ne doit jamais empêcher le reste du dashboard (checklist bonus/épisode/
            // couronne, classement...) de s'afficher.
            let pendingEpisode: number | null = null;
            let latestEpisode: number | null = null;
            let latestEpisodeRated = false;
            try {
              const resultsSnap = await getDocs(collection(db, "results"));
              const resultsHistory = resultsSnap.docs
                .map((d) => d.data() as ResultData)
                .sort((a, b) => a.numero - b.numero);

              const ratingSnaps = await Promise.all(
                resultsHistory.map((r) => getDoc(doc(db, "queenRatings", `${user.uid}_ep${r.numero}`)))
              );
              for (let i = 0; i < resultsHistory.length; i++) {
                const result = resultsHistory[i];
                const roster = activeQueensAtEpisode(allQueens, resultsHistory, result.numero);
                const rating = ratingSnaps[i].exists() ? (ratingSnaps[i].data() as QueenRatingData) : null;
                if (!isRatingComplete(rating, roster)) {
                  pendingEpisode = result.numero;
                  break;
                }
              }

              if (resultsHistory.length > 0) {
                const latest = resultsHistory[resultsHistory.length - 1];
                const latestRoster = activeQueensAtEpisode(allQueens, resultsHistory, latest.numero);
                const latestRatingSnap = ratingSnaps[resultsHistory.length - 1];
                const latestRating = latestRatingSnap.exists() ? (latestRatingSnap.data() as QueenRatingData) : null;
                latestEpisode = latest.numero;
                latestEpisodeRated = isRatingComplete(latestRating, latestRoster);
              }
            } catch (error) {
              console.error("Erreur lors du calcul de la notation en attente :", error);
            }
            setLatestRatableEpisode(latestEpisode);
            setLatestRatableEpisodeRated(latestEpisodeRated);

            // 6. Rappels : question bonus réinitialisée, nouvel épisode à pronostiquer, couronne manquante, notation en attente.
            const items: PendingActionItem[] = [];

            if (myPrediction?.bonusAnswerPending) {
              items.push({
                key: "bonus",
                title: "Question bonus à refaire",
                description: `L'administrateur a modifié la question bonus de l'épisode ${nextEpisode?.numero}, ta réponse a été réinitialisée.`,
                actionLabel: "Répondre à la question bonus",
                onAction: () => router.push("/pronostics"),
              });
            }

            if (nextEpisode?.numero != null && !myPrediction) {
              let description = `Pronostique l'épisode ${nextEpisode.numero} avant sa diffusion.`;
              if (nextEpisode.numero > 1) {
                const previousPredSnap = await getDoc(
                  doc(db, "predictions", `${user.uid}_ep${nextEpisode.numero - 1}`)
                );
                if (previousPredSnap.exists()) {
                  const previousPoints = (previousPredSnap.data() as PredictionData).pointsEarned ?? 0;
                  description = `L'épisode ${nextEpisode.numero - 1} est terminé, tu as obtenu ${previousPoints} points ! Pronostique l'épisode ${nextEpisode.numero} avant sa diffusion.`;
                }
              }
              items.push({
                key: "episode",
                title: "Nouvel épisode à pronostiquer",
                description,
                actionLabel: `Pronostiquer l'épisode ${nextEpisode.numero}`,
                onAction: () => router.push("/pronostics"),
              });
            }

            if (!isCrownLocked && !crownPredictionSnap.exists()) {
              items.push({
                key: "crown",
                title: "Pronostic de la gagnante manquant",
                description: "Tu n'as pas encore pronostiqué la gagnante de la saison.",
                actionLabel: "Pronostiquer la gagnante",
                onAction: () => {
                  setShowPendingModal(false);
                  setShowCrownModal(true);
                },
              });
            }

            if (pendingEpisode != null) {
              items.push({
                key: "rating",
                title: `Ton avis sur l'épisode ${pendingEpisode}`,
                description: `Note la prestation de chaque Queen à l'épisode ${pendingEpisode}, ça ne prend qu'une minute.`,
                actionLabel: "Noter les Queens",
                onAction: () => router.push(`/notation/${pendingEpisode}`),
              });
            }

            setPendingItems(items);
            setShowPendingModal(items.length > 0);
          } catch (error) {
            console.error("Erreur :", error);
          }
        };

        fetchData();
    }, []);

  const ranks = computeRanks(allPlayers);
  const rankedPlayers = allPlayers.map((player, i) => ({ ...player, rank: ranks[i] }));
  const isTied = (rank: number) => ranks.filter((r) => r === rank).length > 1;

  // Revérifie l'épisode en base avant de rediriger : si l'admin est passé à l'épisode
  // suivant depuis que la page a été chargée, on prévient au lieu d'envoyer sur /pronostics.
  const handleGoToPronostics = async () => {
    const configSnap = await getDoc(doc(db, "config", "next_episode"));
    const freshConfig = configSnap.exists() ? (configSnap.data() as ConfigData) : null;

    if (nextEpisodeData && freshConfig && freshConfig.numero !== nextEpisodeData.numero) {
      showToast(
        `L'épisode ${nextEpisodeData.numero} est déjà terminé, l'épisode ${freshConfig.numero} est maintenant en cours.`,
        "error"
      );
      setNextEpisodeData(freshConfig);
      return;
    }

    router.push("/pronostics");
  };

  return (
    <main className="min-h-screen bg-page">
      <Header isAdmin={userData?.role === "admin"} />

      {/* Bienvenue */}
      <h1 className="font-display text-3xl font-extrabold p-6 text-ink">
        Bienvenue {userData?.surnom || "Queen"} 👋
      </h1>

      {/* Colonnes */}
      <div className="grid md:grid-cols-2 gap-6 p-6">
      {/* Colonne Gauche : Stats & Classement */}
        <section className="space-y-6">
            <Card>
            <div className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-4">Tes statistiques</div>
            <div className="flex gap-7 flex-wrap">
              <div>
                <div className="font-display text-3xl font-extrabold text-brand">{userData?.score || 0}</div>
                <div className="text-sm font-semibold text-ink-muted">points au total</div>
              </div>
              <div>
                <div className="font-display text-3xl font-extrabold text-ink">
                  {userData?.score === 0 ? "Non classé" : `${myRank}e`}
                </div>
                <div className="text-sm font-semibold text-ink-muted">classement général</div>
              </div>
            </div>
            </Card>

            <Card>
            <div className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-4">Classement</div>
            <div className="flex flex-col gap-0.5 max-h-[420px] overflow-y-auto">
                {rankedPlayers.map((player) => (
                  <div
                    key={player.uid}
                    onClick={() => setSelectedPlayer(player)}
                    className={`flex items-center gap-3.5 px-2.5 py-2.5 rounded-button cursor-pointer ${
                      player.uid === auth.currentUser?.uid ? "bg-page" : ""
                    }`}
                  >
                    <div className={`w-7 text-center font-display font-extrabold text-sm ${
                      player.rank === 1 ? "text-[#b45309]" : "text-ink-muted"
                    }`}>
                      {player.rank}e
                    </div>
                    <div className="flex-1 font-bold text-sm text-ink">
                      {player.rank === 1 && "👑 "}
                      {player.surnom}
                      {isTied(player.rank) ? " (ex æquo)" : ""}
                    </div>
                    <div className="font-display font-extrabold text-sm text-brand bg-brand-tint px-3 py-1 rounded-pill">
                      {player.score ?? 0} pts
                    </div>
                  </div>
                ))}
            </div>
            <div className="text-xs font-medium text-ink-faint mt-3">
              Clique sur un pseudo pour voir ses pronostics passés →
            </div>
            </Card>
        </section>

        <section className="space-y-6">
            <Card>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                  <div className="font-display text-xl font-bold text-ink">Prochain Épisode</div>
                  {hasPrediction && (
                    <span className="inline-flex items-center gap-1 text-verdict-correct-ink bg-verdict-correct-bg rounded-pill px-3 py-1 text-xs font-semibold">
                      ✓ Pronostic enregistré
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                    {/* Colonne Gauche : Infos */}
                    <div className="space-y-2">
                        <p className="text-ink font-bold text-lg">Saison 4</p>
                        <p className="font-display text-brand font-extrabold text-2xl">Épisode {nextEpisodeData?.numero}</p>
                        <div className="pt-4">
                            <p className="text-sm text-ink-muted">Diffusion prévue le :</p>
                            <p className="font-semibold text-ink-soft">{formatDateDiffusion(nextEpisodeData?.dateDiffusion)}</p>
                        </div>
                    </div>

                    {/* Colonne Droite : Miniature */}
                    <div className="relative w-full aspect-video overflow-hidden rounded-tile">
                    <Image
                        src="/miniature.jpg"
                        alt="Miniature prochain épisode"
                        fill
                        className="object-cover"
                        priority
                    />
                    </div>
                </div>

                <Button onClick={handleGoToPronostics} size="lg" className="mt-6">
                {hasPrediction ? "Modifier mon pronostic" : `Pronostiquer l'épisode ${nextEpisodeData?.numero ?? ""}`}
                </Button>
            </Card>

            <Card className="text-center">
                <Button onClick={() => setShowCrownModal(true)} disabled={crownLocked} size="lg">
                {crownLocked ? "Pronostics couronne clos" : "Pronostiquer la gagnante de la saison"}
                </Button>
            </Card>

            {latestRatableEpisode != null && (
              <Card>
                <div className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-2.5">Ton avis compte</div>
                <div className="font-display text-lg font-extrabold text-ink mb-1.5">
                  Note les Queens de l&apos;épisode {latestRatableEpisode}
                </div>
                <p className="text-sm text-ink-soft mb-4">
                  Donne une note sur 10 à chaque queen pour cet épisode, à chaud.
                </p>
                <Button size="lg" onClick={() => router.push(`/notation/${latestRatableEpisode}`)}>
                  {latestRatableEpisodeRated ? "Modifier les notes" : "Noter les Queens"}
                </Button>
              </Card>
            )}
        </section>
      </div>

      {showCrownModal && (
        <CrownPredictionModal
          queens={queens}
          locked={crownLocked}
          onClose={() => setShowCrownModal(false)}
        />
      )}

      {selectedPlayer && (
        <PlayerDetailsModal
          uid={selectedPlayer.uid}
          surnom={selectedPlayer.surnom}
          rank={selectedPlayer.rank}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

      {showPendingModal && pendingItems.length > 0 && (
        <PendingActionsModal items={pendingItems} onClose={() => setShowPendingModal(false)} />
      )}
    </main>
  );
}