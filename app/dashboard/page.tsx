"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
// import { doc, getDoc, orderBy } from "firebase/firestore";
import { doc, getDoc, collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { UserData } from "@/types/user"; // Ajuste le chemin selon ton dossier
import { ConfigData } from "@/types/config"; // Ajuste le chemin selon ton dossier
import { CrownResultData } from "@/types/crown";
import { normalizeQueens } from "@/lib/queens";
import Image from 'next/image';
import Header from "@/components/Header";
import CrownPredictionModal from "@/components/CrownPredictionModal";
import PlayerDetailsModal from "@/components/PlayerDetailsModal";
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
  const [queens, setQueens] = useState<string[]>([]);
  const [crownLocked, setCrownLocked] = useState(false);
  const [showCrownModal, setShowCrownModal] = useState(false);
  const showToast = useToast();

    useEffect(() => {
        const fetchData = async () => {
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
            if (configSnap.exists()) {
            setNextEpisodeData(configSnap.data() as ConfigData);
            }

            // 4. Récupérer la liste des Queens encore en course (pour le pronostic couronne)
            const queensSnap = await getDoc(doc(db, "game-data", "w5fjPTmVyX0HZb3oqFW9"));
            if (queensSnap.exists()) {
            const activeQueens = normalizeQueens(queensSnap.data().queens || [])
              .filter((q) => !q.eliminee)
              .map((q) => q.name);
            setQueens(activeQueens);
            }

            // 5. Savoir si les pronostics couronne sont verrouillés par l'admin
            const crownResultSnap = await getDoc(doc(db, "config", "crown_result"));
            if (crownResultSnap.exists()) {
            setCrownLocked((crownResultSnap.data() as CrownResultData).locked ?? false);
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
    <main className="min-h-screen bg-gray-50">
      <Header isAdmin={userData?.role === "admin"} />

      {/* Bienvenue */}
      <h1 className="text-3xl font-bold p-6 text-gray-900">Bienvenue {userData?.surnom || "Queen"} !</h1>

      {/* Colonnes */}
      <div className="grid md:grid-cols-2 gap-6 p-6">
      {/* Colonne Gauche : Stats & Classement */}
        <section className="space-y-6">
            <div className="bg-white p-6 rounded shadow border border-gray-200 rounded-xl">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Tes Statistiques</h2>
            <p className="text-gray-800">Score total : {userData?.score || 0} points</p>
            <p className="text-gray-800 font-semibold">Classement : {userData?.score === 0 ? "Non classé" : `${myRank}e position`}</p>
            </div>

            {/* Podium */}
            <div className="bg-white p-6 rounded shadow border border-gray-200 rounded-xl">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Podium</h2>
            <div className="flex justify-around items-end mb-8">
                {rankedPlayers.slice(0, 3).map((player) => (
                <div key={player.uid} className="text-center flex flex-col items-center">
                    {/* Ajout de la couronne pour le(s) 1er(s), même en cas d'ex-aequo */}
                    {player.rank === 1 && <span className="text-3xl mb-1">👑</span>}
                    <button
                      onClick={() => setSelectedPlayer(player)}
                      className="font-bold text-lg hover:underline"
                    >
                      {player.surnom}
                    </button>
                    <div className="bg-purple-600 text-white px-4 py-2 rounded mt-1">
                    {(player.score ?? 0) > 0 ? `${player.score} pts` : "0 pts"}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {player.rank}e place{isTied(player.rank) ? " (ex æquo)" : ""}
                    </div>
                </div>
                ))}
            </div>

            {/* Liste des autres avec classement */}
            <ul className="divide-y divide-gray-100">
                {rankedPlayers.slice(3).map((player) => (
                <li key={player.uid} className="py-2 flex justify-between">
                    <span className="font-medium">
                    <span className="text-gray-400 mr-3">
                      {player.rank}e{isTied(player.rank) ? " (ex æquo)" : ""}
                    </span>
                    <button onClick={() => setSelectedPlayer(player)} className="hover:underline">
                      {player.surnom}
                    </button>
                    </span>
                    <span className="font-bold">
                    {(player.score ?? 0) > 0 ? `${player.score} pts` : "0 pts"}
                    </span>
                </li>
                ))}
            </ul>
            </div>
        </section>

        <section className="space-y-6">
            <section className="bg-white p-6 rounded-[15px] shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold mb-6 text-gray-950">Prochain Épisode</h2>
                
                <div className="grid grid-cols-2 gap-6 items-center">
                    {/* Colonne Gauche : Infos */}
                    <div className="space-y-2">
                        <p className="text-gray-900 font-bold text-lg">Saison 4</p>
                        <p className="text-purple-700 font-bold text-2xl">Épisode {nextEpisodeData?.numero}</p>
                        <div className="pt-4">
                            <p className="text-sm text-gray-500">Diffusion prévue le :</p>
                            <p className="font-semibold text-gray-800">{formatDateDiffusion(nextEpisodeData?.dateDiffusion)}</p>
                        </div>
                        <p className="text-sm text-purple-700 font-bold mt-2">Pronostics de l&apos;épisode {nextEpisodeData?.numero} ouverts jusqu&apos;à la diffusion :</p>
                        <p className="text-sm text-purple-700 font-bold mt-2">{formatDateDiffusion(nextEpisodeData?.dateDiffusion)}</p>
                    </div>

                    {/* Colonne Droite : Miniature */}
                    <div className="relative w-full aspect-video overflow-hidden rounded-[15px]">
                    <Image 
                        src="/miniature.jpg" 
                        alt="Miniature prochain épisode"
                        fill
                        className="object-cover"
                        priority
                    />
                    </div>
                </div>

                <button
                onClick={handleGoToPronostics}
                className="bg-purple-600 text-white w-full py-4 rounded-xl font-bold mt-6"
                >
                Pronostiquer l&apos;épisode {nextEpisodeData?.numero}
                </button>
            </section>

            <div className="bg-white p-6 rounded shadow text-center rounded-xl">
                <button
                onClick={() => setShowCrownModal(true)}
                disabled={crownLocked}
                className="bg-purple-600 text-white w-full py-4 rounded font-bold text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                {crownLocked ? "Pronostics couronne clos" : "Pronostiquer la gagnante de la saison"}
                </button>
            </div>
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
    </main>
  );
}