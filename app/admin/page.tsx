"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { UserData } from "@/types/user";
import { CrownResultData } from "@/types/crown";
import { QueenData } from "@/types/gameData";
import { PredictionData } from "@/types/prediction";
import { ResultData, ScoringRules } from "@/types/result";
import { CrownPredictionData } from "@/types/crown";
import { normalizeQueens } from "@/lib/queens";
import { SCORING_RULES } from "@/lib/scoring";
import Header from "@/components/Header";
import QueensSelectTable, { QueenChoice } from "@/components/QueensSelectTable";

interface UserRow extends UserData {
  uid: string;
  hasPredicted: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");

// Formate un Timestamp Firestore pour la valeur d'un <input type="datetime-local">
const toDatetimeLocalValue = (timestamp: Timestamp) => {
  const d = timestamp.toDate();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const computeEpisodePoints = (
  prediction: PredictionData,
  result: ResultData,
  activeQueens: string[]
): number => {
  const rules = result.scoringRules;
  let points = 0;

  for (const queen of activeQueens) {
    const actual: "top" | "bottom" | "safe" = result.top.includes(queen)
      ? "top"
      : result.bottom.includes(queen)
      ? "bottom"
      : "safe";
    const guessed = prediction.queensResults[queen] ?? "safe";
    if (guessed === actual) {
      points += rules[actual];
    }
  }

  if (prediction.winner === result.winner) points += rules.gagnante;
  if (prediction.eliminee === result.eliminee) points += rules.eliminee;
  if (prediction.miniDefi === result.miniDefi) points += rules.miniDefi;
  if (prediction.maxiDefi === result.maxiDefi) points += rules.maxiDefi;

  return points;
};

// Recalcule le score total d'un joueur = somme de tous ses pointsEarned
// (pronostics d'épisodes + pronostic couronne), et le persiste sur users/{uid}.score.
const recomputeUserScore = async (uid: string): Promise<number> => {
  const [predsSnap, crownSnap] = await Promise.all([
    getDocs(query(collection(db, "predictions"), where("userId", "==", uid))),
    getDoc(doc(db, "crownPredictions", uid)),
  ]);

  let total = 0;
  predsSnap.forEach((predDoc) => {
    total += (predDoc.data() as PredictionData).pointsEarned || 0;
  });
  if (crownSnap.exists()) {
    total += (crownSnap.data() as CrownPredictionData).pointsEarned || 0;
  }

  await updateDoc(doc(db, "users", uid), { score: total });
  return total;
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [episodeNum, setEpisodeNum] = useState(1);
  const [dateDiffusion, setDateDiffusion] = useState("");
  const [queensList, setQueensList] = useState<QueenData[]>([]);
  const [miniDefisList, setMiniDefisList] = useState<string[]>([]);
  const [maxiDefisList, setMaxiDefisList] = useState<string[]>([]);
  const [crownWinner, setCrownWinner] = useState("");
  const [crownLocked, setCrownLocked] = useState(false);
  const [crownPoints, setCrownPoints] = useState(SCORING_RULES.crown);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [resultsQueensStatus, setResultsQueensStatus] = useState<Record<string, QueenChoice>>({});
  const [resultsWinner, setResultsWinner] = useState<string | null>(null);
  const [resultsEliminee, setResultsEliminee] = useState<string | null>(null);
  const [resultsMiniDefi, setResultsMiniDefi] = useState<string | null>(null);
  const [resultsMaxiDefi, setResultsMaxiDefi] = useState<string | null>(null);
  const defaultScoringRules: ScoringRules = {
    top: SCORING_RULES.top,
    bottom: SCORING_RULES.bottom,
    safe: SCORING_RULES.safe,
    gagnante: SCORING_RULES.gagnante,
    eliminee: SCORING_RULES.eliminee,
    miniDefi: SCORING_RULES.miniDefi,
    maxiDefi: SCORING_RULES.maxiDefi,
  };
  const [scoringRules, setScoringRules] = useState<ScoringRules>(defaultScoringRules);
  const [savingResults, setSavingResults] = useState(false);
  const [resultsHistory, setResultsHistory] = useState<ResultData[]>([]);
  const router = useRouter();

  // Recharge le formulaire "Résultats de l'épisode" pour un numéro donné : reprend les
  // résultats déjà saisis s'ils existent (édition), sinon repart d'un formulaire vierge
  // (nouvel épisode : aucune Queen ni barème hérité de l'épisode précédent).
  const loadResultsForEpisode = async (numero: number) => {
    const resultDoc = await getDoc(doc(db, "results", String(numero)));
    if (resultDoc.exists()) {
      const data = resultDoc.data() as ResultData;
      const status: Record<string, QueenChoice> = {};
      data.top.forEach((q) => { status[q] = "top"; });
      data.bottom.forEach((q) => { status[q] = "bottom"; });
      setResultsQueensStatus(status);
      setResultsWinner(data.winner);
      setResultsEliminee(data.eliminee);
      setResultsMiniDefi(data.miniDefi);
      setResultsMaxiDefi(data.maxiDefi);
      setScoringRules(data.scoringRules || defaultScoringRules);
    } else {
      setResultsQueensStatus({});
      setResultsWinner(null);
      setResultsEliminee(null);
      setResultsMiniDefi(null);
      setResultsMaxiDefi(null);
      setScoringRules(defaultScoringRules);
    }
  };

  const handleAddQueenRow = () => {
    setQueensList((prev) => [...prev, { name: "", eliminee: false }]);
  };

  const handleQueenNameChange = (index: number, name: string) => {
    setQueensList((prev) => prev.map((q, i) => (i === index ? { ...q, name } : q)));
  };

  const handleQueenEliminationToggle = (index: number, eliminee: boolean) => {
    setQueensList((prev) => prev.map((q, i) => (i === index ? { ...q, eliminee } : q)));
  };

  const handleRemoveQueenRow = (index: number) => {
    setQueensList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveQueens = async () => {
    const newValue = queensList
      .map((q) => ({ ...q, name: q.name.trim() }))
      .filter((q) => q.name !== "");

    try {
      await updateDoc(doc(db, "game-data", "w5fjPTmVyX0HZb3oqFW9"), {
        queens: newValue
      });

      alert("La liste des Queens a été mise à jour avec succès !");
      setQueensList(newValue);
    } catch (error) {
      console.error("Erreur :", error);
      alert("Erreur lors de la sauvegarde.");
    }
  };

  const handleSaveMiniDefis = async () => {
    // On récupère la valeur actuelle dans le textarea
    const textarea = document.getElementById('miniDefisArea') as HTMLTextAreaElement;
    const newValue = textarea.value.split('\n').filter(name => name.trim() !== "");

    try {
      // Mise à jour dans Firebase
      await updateDoc(doc(db, "game-data", "w5fjPTmVyX0HZb3oqFW9"), {
        minidefis: newValue
      });
      
      // Feedback visuel
      alert("La liste des Mini-Defis a été mise à jour avec succès !");
      
      // Optionnel : mettre à jour le state local pour refléter le changement
      setMiniDefisList(newValue);
    } catch (error) {
      console.error("Erreur :", error);
      alert("Erreur lors de la sauvegarde.");
    }
  };

  const handleSaveMaxiDefis = async () => {
    // On récupère la valeur actuelle dans le textarea
    const textarea = document.getElementById('maxiDefisArea') as HTMLTextAreaElement;
    const newValue = textarea.value.split('\n').filter(name => name.trim() !== "");

    try {
      // Mise à jour dans Firebase
      await updateDoc(doc(db, "game-data", "w5fjPTmVyX0HZb3oqFW9"), {
        maxidefis: newValue
      });
      
      // Feedback visuel
      alert("La liste des Maxi-Defis a été mise à jour avec succès !");
      
      // Optionnel : mettre à jour le state local pour refléter le changement
      setMaxiDefisList(newValue);
    } catch (error) {
      console.error("Erreur :", error);
      alert("Erreur lors de la sauvegarde.");
    }
  };

  useEffect(() => {
    const checkAdmin = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists() && userDoc.data().role === "admin") {
        setIsAdmin(true);
        // Charger les données initiales
        const configDoc = await getDoc(doc(db, "config", "next_episode"));
        const numero: number | null = configDoc.exists() ? configDoc.data().numero : null;
        if (configDoc.exists()) {
          setEpisodeNum(numero as number);
          const ts = configDoc.data().dateDiffusion as Timestamp | undefined;
          if (ts) setDateDiffusion(toDatetimeLocalValue(ts));
        }

        const listsSnap = await getDoc(doc(db, "game-data", "w5fjPTmVyX0HZb3oqFW9"));
        if (listsSnap.exists()) {
          const data = listsSnap.data();
          setQueensList(normalizeQueens(data.queens || []));
          setMiniDefisList(data.minidefis || []);
          setMaxiDefisList(data.maxidefis || []);
        }

        const crownResultDoc = await getDoc(doc(db, "config", "crown_result"));
        if (crownResultDoc.exists()) {
          const data = crownResultDoc.data() as CrownResultData;
          setCrownWinner(data.winner || "");
          setCrownLocked(data.locked ?? false);
          setCrownPoints(data.points ?? SCORING_RULES.crown);
        }

        // Résultats déjà saisis pour l'épisode en cours (pour édition/correction)
        if (numero !== null) {
          await loadResultsForEpisode(numero);
        }

        // Historique de tous les résultats déjà publiés (pour la partie non modifiable)
        const resultsHistorySnap = await getDocs(collection(db, "results"));
        setResultsHistory(
          resultsHistorySnap.docs
            .map((d) => d.data() as ResultData)
            .sort((a, b) => b.numero - a.numero)
        );

        // Charger la liste des joueurs, avec leur uid et s'ils ont déjà pronostiqué l'épisode en cours
        const usersSnap = await getDocs(collection(db, "users"));
        const usersList: UserRow[] = usersSnap.docs.map((userSnapDoc) => {
          const data = userSnapDoc.data();
          return {
            uid: userSnapDoc.id,
            surnom: data.surnom || "Anonyme",
            email: data.email,
            score: data.score ?? 0,
            role: data.role || "user",
            hasPredicted: false,
          };
        });

        if (numero !== null) {
          const predictionChecks = await Promise.all(
            usersList.map((u) => getDoc(doc(db, "predictions", `${u.uid}_ep${numero}`)))
          );
          usersList.forEach((u, i) => {
            u.hasPredicted = predictionChecks[i].exists();
          });
        }

        setUsers(usersList);
      } else {
        router.push("/dashboard");
      }
      setLoading(false);
    };

    checkAdmin();
  }, [router]);

  const handleSaveCrownWinner = async () => {
    try {
      const payload: { locked: boolean; points: number; winner?: string; publishedAt?: Timestamp } = {
        locked: crownLocked,
        points: crownPoints,
      };
      // On ne renseigne winner/publishedAt que si une gagnante a été choisie,
      // pour ne pas écraser la date de publication en ne faisant que verrouiller.
      if (crownWinner) {
        payload.winner = crownWinner;
        payload.publishedAt = Timestamp.now();
      }

      await setDoc(doc(db, "config", "crown_result"), payload, { merge: true });

      if (crownWinner) {
        // Note le score couronne de chaque joueur puis recalcule leur total
        const batch = writeBatch(db);
        const crownPredsSnap = await getDocs(collection(db, "crownPredictions"));
        const affectedUserIds: string[] = [];
        crownPredsSnap.forEach((predDoc) => {
          const prediction = predDoc.data() as CrownPredictionData;
          const points = prediction.queenPredicted === crownWinner ? crownPoints : 0;
          batch.update(predDoc.ref, { pointsEarned: points });
          affectedUserIds.push(prediction.userId);
        });
        await batch.commit();

        const newScores: Record<string, number> = {};
        for (const uid of affectedUserIds) {
          newScores[uid] = await recomputeUserScore(uid);
        }
        setUsers((prev) => prev.map((u) => (u.uid in newScores ? { ...u, score: newScores[u.uid] } : u)));
      }

      alert("Informations de la couronne enregistrées !");
    } catch (error) {
      console.error("Erreur :", error);
      alert("Erreur lors de la sauvegarde.");
    }
  };

  const resultsActiveQueens = queensList.filter((q) => !q.eliminee).map((q) => q.name);
  const resultsTopQueens = resultsActiveQueens.filter((q) => resultsQueensStatus[q] === "top");
  const resultsBottomQueens = resultsActiveQueens.filter((q) => resultsQueensStatus[q] === "bottom");
  const resultsAllSelected = resultsTopQueens.length === 2 && resultsBottomQueens.length === 2;

  const handleResultsQueenChange = (queen: string, value: QueenChoice) => {
    setResultsQueensStatus((prev) => ({ ...prev, [queen]: value }));
    if (resultsWinner === queen && value !== "top") setResultsWinner(null);
    if (resultsEliminee === queen && value !== "bottom") setResultsEliminee(null);
  };

  const handleSaveResults = async () => {
    if (
      resultsTopQueens.length !== 2 ||
      resultsBottomQueens.length !== 2 ||
      !resultsWinner ||
      !resultsEliminee ||
      !resultsMiniDefi ||
      !resultsMaxiDefi
    ) {
      alert("Remplis entièrement les résultats (2 Top, 2 Bottom, Gagnante, Éliminée, Mini-Défi, Maxi-Défi) avant d'enregistrer.");
      return;
    }

    setSavingResults(true);
    try {
      const resultData: ResultData = {
        numero: episodeNum,
        top: [resultsTopQueens[0], resultsTopQueens[1]],
        bottom: [resultsBottomQueens[0], resultsBottomQueens[1]],
        eliminee: resultsEliminee,
        winner: resultsWinner,
        miniDefi: resultsMiniDefi,
        maxiDefi: resultsMaxiDefi,
        scoringRules,
        publishedAt: Timestamp.now(),
      };

      const updatedQueensList = queensList.map((q) =>
        q.name === resultsEliminee ? { ...q, eliminee: true } : q
      );

      const batch = writeBatch(db);
      batch.set(doc(db, "results", String(episodeNum)), resultData);
      batch.update(doc(db, "game-data", "w5fjPTmVyX0HZb3oqFW9"), { queens: updatedQueensList });

      const predsSnap = await getDocs(
        query(collection(db, "predictions"), where("episodeId", "==", episodeNum))
      );
      const affectedUserIds = new Set<string>();
      predsSnap.forEach((predDoc) => {
        const prediction = predDoc.data() as PredictionData;
        const points = computeEpisodePoints(prediction, resultData, resultsActiveQueens);
        batch.update(predDoc.ref, { pointsEarned: points });
        affectedUserIds.add(prediction.userId);
      });

      await batch.commit();
      setQueensList(updatedQueensList);
      setResultsHistory((prev) => [resultData, ...prev.filter((r) => r.numero !== episodeNum)]);

      // Recalcule le score total de chaque joueur concerné
      const newScores: Record<string, number> = {};
      for (const uid of affectedUserIds) {
        newScores[uid] = await recomputeUserScore(uid);
      }

      setUsers((prev) => prev.map((u) => (u.uid in newScores ? { ...u, score: newScores[u.uid] } : u)));

      alert("Résultats enregistrés et scores calculés !");
    } catch (error) {
      console.error("Erreur :", error);
      alert("Erreur lors de l'enregistrement des résultats.");
    } finally {
      setSavingResults(false);
    }
  };

  const handleUpdateEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "config", "next_episode"), {
        numero: episodeNum,
        dateDiffusion: Timestamp.fromDate(new Date(dateDiffusion))
      });
      // Le formulaire "Résultats" est réinitialisé (ou recharge les résultats déjà saisis
      // pour ce numéro) : il ne doit jamais garder les sélections de l'épisode précédent.
      await loadResultsForEpisode(episodeNum);
      alert("Épisode mis à jour !");
    } catch (err) {
      alert("Erreur lors de la mise à jour");
    }
  };

  if (loading) return <div className="p-10 text-white text-center">Chargement...</div>;
  if (!isAdmin) return null;

  return (
    <>
      <Header isAdmin={isAdmin} />
      <div className="min-h-screen bg-cover bg-center" style={{ backgroundImage: "url('/fond-login.png')" }}>
        <div className="min-h-screen bg-gray-950/80 backdrop-blur-sm p-6 md:p-12">
          
          <h1 className="text-4xl font-bold text-white mb-10 text-center">Administration</h1>

          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
            
            {/* Section : Gestion Épisode */}
            <section className="bg-white/95 p-8 rounded-[15px] shadow-lg">
              <h2 className="text-2xl font-bold text-gray-950 mb-6">Prochain Épisode</h2>
              <form onSubmit={handleUpdateEpisode} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Numéro épisode</label>
                  <input 
                    type="number" 
                    value={episodeNum}
                    onChange={(e) => setEpisodeNum(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border border-gray-200 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Date de diffusion</label>
                  <input
                    type="datetime-local"
                    value={dateDiffusion}
                    onChange={(e) => setDateDiffusion(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Les pronostics se ferment automatiquement à cette date/heure.
                  </p>
                </div>
                <button type="submit" className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition">
                  Mettre à jour
                </button>
              </form>
            </section>

            {/* Section : Liste des Joueurs */}
            <section className="bg-white/95 p-8 rounded-[15px] shadow-lg">
              <h2 className="text-2xl font-bold text-gray-950 mb-6">Joueurs inscrits</h2>
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-gray-100">
                    <tr>
                      <th className="py-2 text-gray-500 font-bold uppercase text-xs">Surnom</th>
                      <th className="py-2 text-gray-500 font-bold uppercase text-xs text-center">Pronostic réalisé</th>
                      <th className="py-2 text-gray-500 font-bold uppercase text-xs text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map(u => (
                      <tr key={u.uid}>
                        <td className="py-3 text-gray-900 font-medium">{u.surnom}</td>
                        <td className="py-3 text-center">{u.hasPredicted ? "✅" : "❌"}</td>
                        <td className="py-3 text-gray-900 font-bold text-right">{u.score ?? 0} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-white/95 p-8 rounded-[15px] shadow-lg">
              <h2 className="text-2xl font-bold text-gray-950 mb-4">Gestion des Queens</h2>
              <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
                {queensList.map((queen, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={queen.name}
                      onChange={(e) => handleQueenNameChange(index, e.target.value)}
                      placeholder="Nom de la Queen"
                      className="flex-1 p-2 rounded-lg border border-gray-200 text-gray-900"
                    />
                    <label className="flex items-center gap-1 text-sm text-gray-700 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={queen.eliminee}
                        onChange={(e) => handleQueenEliminationToggle(index, e.target.checked)}
                        className="w-4 h-4"
                      />
                      Éliminée
                    </label>
                    <button
                      onClick={() => handleRemoveQueenRow(index)}
                      className="text-red-600 font-bold px-2"
                      title="Retirer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddQueenRow}
                className="w-full bg-gray-200 text-gray-900 font-bold py-2 rounded-xl mb-2"
              >
                + Ajouter une Queen
              </button>
              <button
                onClick={handleSaveQueens}
                className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl"
              >
                Sauvegarder la liste des Queens
              </button>
            </section>

            <section className="bg-white/95 p-8 rounded-[15px] shadow-lg">
              <h2 className="text-2xl font-bold text-gray-950 mb-4">Gestion des Mini-Defis</h2>
              <textarea 
                defaultValue={miniDefisList.join('\n')}
                className="w-full h-32 p-3 rounded-xl border border-gray-200 mb-4"
                id="miniDefisArea"
                placeholder="Un Mini-Defi par ligne"
              />
              <button 
                onClick={handleSaveMiniDefis}
                className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl"
              >
                Sauvegarder la liste des Mini-Defis
              </button>
            </section>

            <section className="bg-white/95 p-8 rounded-[15px] shadow-lg">
              <h2 className="text-2xl font-bold text-gray-950 mb-4">Gestion des Maxi-Defis</h2>
              <textarea 
                defaultValue={maxiDefisList.join('\n')}
                className="w-full h-32 p-3 rounded-xl border border-gray-200 mb-4"
                id="maxiDefisArea"
                placeholder="Un Maxi-Defi par ligne"
              />
              <button
                onClick={handleSaveMaxiDefis}
                className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl"
              >
                Sauvegarder la liste des Maxi-Defis
              </button>
            </section>

            <section className="bg-white/95 p-8 rounded-[15px] shadow-lg">
              <h2 className="text-2xl font-bold text-gray-950 mb-4">👑 Gagnante de la saison</h2>
              <select
                value={crownWinner}
                onChange={(e) => setCrownWinner(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 text-gray-900 mb-4"
              >
                <option value="">-- Choisis une Queen --</option>
                {queensList.filter((q) => !q.eliminee).map((queen) => (
                  <option key={queen.name} value={queen.name}>{queen.name}</option>
                ))}
              </select>

              <label className="flex items-center gap-2 mb-4 text-gray-900 font-medium">
                <input
                  type="checkbox"
                  checked={crownLocked}
                  onChange={(e) => setCrownLocked(e.target.checked)}
                  className="w-4 h-4"
                />
                🔒 Bloquer les pronostics couronne des joueurs
              </label>

              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">Points si bien pronostiquée</label>
                <input
                  type="number"
                  value={crownPoints}
                  onChange={(e) => setCrownPoints(Number(e.target.value))}
                  className="w-full p-3 rounded-xl border border-gray-200 text-gray-900"
                />
              </div>

              <button
                onClick={handleSaveCrownWinner}
                className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl"
              >
                Sauvegarder
              </button>
              <p className="text-xs text-gray-500 mt-2">
                La gagnante n&apos;est à renseigner qu&apos;une fois la saison terminée. La case à cocher
                bloque immédiatement les pronostics couronne des joueurs (ex. dès la diffusion de l&apos;épisode 1),
                indépendamment de la gagnante.
              </p>
            </section>

            <section className="bg-white/95 p-8 rounded-[15px] shadow-lg md:col-span-2">
              <h2 className="text-2xl font-bold text-gray-950 mb-2">Résultats de l&apos;épisode {episodeNum}</h2>
              <p className="text-xs text-gray-500 mb-4">
                Reprend le même tableau que celui rempli par les joueurs. À l&apos;enregistrement, la Queen éliminée
                est automatiquement marquée comme telle dans la Gestion des Queens, et les scores de tous les
                joueurs ayant pronostiqué cet épisode sont recalculés.
              </p>

              <QueensSelectTable
                queens={resultsActiveQueens}
                values={resultsQueensStatus}
                onChange={handleResultsQueenChange}
              />

              <div className="mt-4">
                <p className="text-sm font-bold text-gray-700 mb-2">Barème de points pour cet épisode</p>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {(
                    [
                      ["top", "Top"],
                      ["bottom", "Bottom"],
                      ["safe", "Safe"],
                      ["gagnante", "Gagnante"],
                      ["eliminee", "Éliminée"],
                      ["miniDefi", "Mini-Défi"],
                      ["maxiDefi", "Maxi-Défi"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-xs font-bold text-gray-700 mb-1">{label}</label>
                      <input
                        type="number"
                        value={scoringRules[key]}
                        onChange={(e) =>
                          setScoringRules((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                        }
                        className="w-full p-2 rounded-lg border border-gray-200 text-gray-900"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Mini-Défi</label>
                  <select
                    value={resultsMiniDefi || ""}
                    onChange={(e) => setResultsMiniDefi(e.target.value || null)}
                    className="w-full p-2 rounded-lg border border-gray-200 text-gray-900"
                  >
                    <option value="">--</option>
                    {miniDefisList.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Maxi-Défi</label>
                  <select
                    value={resultsMaxiDefi || ""}
                    onChange={(e) => setResultsMaxiDefi(e.target.value || null)}
                    className="w-full p-2 rounded-lg border border-gray-200 text-gray-900"
                  >
                    <option value="">--</option>
                    {maxiDefisList.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              {resultsAllSelected && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Gagnante (parmi le Top)</label>
                    <select
                      value={resultsWinner || ""}
                      onChange={(e) => setResultsWinner(e.target.value || null)}
                      className="w-full p-2 rounded-lg border border-gray-200 text-gray-900"
                    >
                      <option value="">--</option>
                      {resultsTopQueens.map((q) => (
                        <option key={q} value={q}>{q}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Éliminée (parmi le Bottom)</label>
                    <select
                      value={resultsEliminee || ""}
                      onChange={(e) => setResultsEliminee(e.target.value || null)}
                      className="w-full p-2 rounded-lg border border-gray-200 text-gray-900"
                    >
                      <option value="">--</option>
                      {resultsBottomQueens.map((q) => (
                        <option key={q} value={q}>{q}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <button
                onClick={handleSaveResults}
                disabled={savingResults}
                className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl mt-4 disabled:opacity-50"
              >
                {savingResults ? "Calcul des scores en cours..." : "Enregistrer les résultats et calculer les scores"}
              </button>
            </section>

            <section className="bg-white/95 p-8 rounded-[15px] shadow-lg md:col-span-2">
              <h2 className="text-2xl font-bold text-gray-950 mb-2">Historique des résultats</h2>
              <p className="text-xs text-gray-500 mb-4">
                Résultats déjà publiés pour les épisodes précédents. Non modifiables : passe par la
                section ci-dessus tant que l&apos;épisode est encore l&apos;épisode en cours.
              </p>

              {resultsHistory.filter((r) => r.numero < episodeNum).length === 0 ? (
                <p className="text-sm text-gray-500">Aucun résultat publié pour le moment.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-gray-100">
                      <tr>
                        <th className="py-2 pr-4 text-gray-500 font-bold uppercase text-xs">Épisode</th>
                        <th className="py-2 pr-4 text-gray-500 font-bold uppercase text-xs">Top</th>
                        <th className="py-2 pr-4 text-gray-500 font-bold uppercase text-xs">Bottom</th>
                        <th className="py-2 pr-4 text-gray-500 font-bold uppercase text-xs">Gagnante</th>
                        <th className="py-2 pr-4 text-gray-500 font-bold uppercase text-xs">Éliminée</th>
                        <th className="py-2 pr-4 text-gray-500 font-bold uppercase text-xs">Mini-Défi</th>
                        <th className="py-2 text-gray-500 font-bold uppercase text-xs">Maxi-Défi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {resultsHistory
                        .filter((r) => r.numero < episodeNum)
                        .map((r) => (
                          <tr key={r.numero}>
                            <td className="py-3 pr-4 text-gray-900 font-bold">{r.numero}</td>
                            <td className="py-3 pr-4 text-gray-900">{r.top.join(", ")}</td>
                            <td className="py-3 pr-4 text-gray-900">{r.bottom.join(", ")}</td>
                            <td className="py-3 pr-4 text-gray-900">{r.winner}</td>
                            <td className="py-3 pr-4 text-gray-900">{r.eliminee}</td>
                            <td className="py-3 pr-4 text-gray-900">{r.miniDefi}</td>
                            <td className="py-3 text-gray-900">{r.maxiDefi}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

          </div>
        </div>
      </div>
    </>
  );
}

// **N'oublie pas** de créer manuellement un document `next_episode` dans une collection `config` sur Firebase pour que le formulaire puisse lire les données au départ.