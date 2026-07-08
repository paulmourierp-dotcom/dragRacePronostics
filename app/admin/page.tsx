"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
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
import { BonusQuestion } from "@/types/bonus";
import { normalizeQueens } from "@/lib/queens";
import { SCORING_RULES, DEFAULT_MAX_QUEENS } from "@/lib/scoring";
import { normalizeAnswer } from "@/lib/textNormalize";
import Header from "@/components/Header";
import LoadingScreen from "@/components/LoadingScreen";
import NextEpisodeModal from "@/components/NextEpisodeModal";
import BonusQuestionEditor from "@/components/BonusQuestionEditor";
import Button from "@/components/Button";
import QueenGrid from "@/components/pronostics/QueenGrid";
import DefiOptions from "@/components/pronostics/DefiOptions";
import { useToast } from "@/contexts/ToastContext";

type QueenChoice = "top" | "bottom" | "safe";

interface BonusReviewEntry {
  uid: string;
  surnom: string;
  answer: string;
  correct: boolean;
}

interface UserRow extends UserData {
  uid: string;
  hasPredicted: boolean;
  hasCrownPrediction: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");

// Formate une Date pour la valeur d'un <input type="datetime-local">
const formatDatetimeLocal = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

// Formate un Timestamp Firestore pour la valeur d'un <input type="datetime-local">
const toDatetimeLocalValue = (timestamp: Timestamp) => formatDatetimeLocal(timestamp.toDate());

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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

// Compare la réponse bonus du joueur à la réponse gagnante (normalisée, pour tolérer les
// petites variantes de saisie en texte libre). Le résultat de "correct" reste modifiable
// manuellement par l'admin ensuite (cas d'une faute d'orthographe qu'on veut quand même valider).
const computeBonusPoints = (prediction: PredictionData, result: ResultData): { points: number; correct: boolean } => {
  const bonus = result.bonusQuestion;
  if (!bonus || prediction.bonusAnswer == null) return { points: 0, correct: false };
  const correct = normalizeAnswer(prediction.bonusAnswer) === normalizeAnswer(bonus.answer);
  return { points: correct ? bonus.points : 0, correct };
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
  const [maxTop, setMaxTop] = useState(DEFAULT_MAX_QUEENS);
  const [maxBottom, setMaxBottom] = useState(DEFAULT_MAX_QUEENS);
  const [resultsMaxTop, setResultsMaxTop] = useState(DEFAULT_MAX_QUEENS);
  const [resultsMaxBottom, setResultsMaxBottom] = useState(DEFAULT_MAX_QUEENS);
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
  const [bonusQuestion, setBonusQuestion] = useState<BonusQuestion | null>(null);
  // Épisode auquel appartient `bonusQuestion` : permet de savoir s'il faut la réinitialiser
  // quand on avance vers un nouvel épisode (config/next_episode est un doc unique réutilisé).
  const [bonusQuestionEpisodeNum, setBonusQuestionEpisodeNum] = useState<number | null>(null);
  const [resultsBonusQuestion, setResultsBonusQuestion] = useState<BonusQuestion | null>(null);
  const [resultsBonusAnswer, setResultsBonusAnswer] = useState("");
  const [bonusReview, setBonusReview] = useState<BonusReviewEntry[]>([]);
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
  const showToast = useToast();
  const [resultsHistory, setResultsHistory] = useState<ResultData[]>([]);
  // Épisode actuellement affiché/modifié dans la section "Résultats de l'épisode" : peut différer
  // de `episodeNum` (l'épisode en cours dans "Prochain Épisode") quand on corrige un épisode passé.
  const [resultsEpisodeNum, setResultsEpisodeNum] = useState(1);
  const [showNextEpisodeModal, setShowNextEpisodeModal] = useState(false);
  const [nextEpisodeDraftNum, setNextEpisodeDraftNum] = useState(1);
  const [nextEpisodeDraftDate, setNextEpisodeDraftDate] = useState("");
  const router = useRouter();

  // Recharge le formulaire "Résultats de l'épisode" pour un numéro donné : reprend les
  // résultats déjà saisis s'ils existent (édition), sinon repart d'un formulaire vierge
  // (nouvel épisode : aucune Queen ni barème hérité de l'épisode précédent).
  // `pendingBonusQuestion` : question bonus telle que configurée dans config/next_episode, utilisée
  // uniquement quand l'épisode demandé n'a pas encore de résultats publiés (sinon on lit results/{numero}).
  const loadResultsForEpisode = async (
    numero: number,
    pendingBonusQuestion: BonusQuestion | null = null,
    pendingMaxTop: number = maxTop,
    pendingMaxBottom: number = maxBottom
  ) => {
    setResultsEpisodeNum(numero);
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
      setResultsMaxTop(data.maxTop ?? DEFAULT_MAX_QUEENS);
      setResultsMaxBottom(data.maxBottom ?? DEFAULT_MAX_QUEENS);
      setResultsBonusQuestion(data.bonusQuestion ?? null);
      setResultsBonusAnswer(data.bonusQuestion?.answer ?? "");

      if (data.bonusQuestion?.type === "texte") {
        const predsSnap = await getDocs(query(collection(db, "predictions"), where("episodeId", "==", numero)));
        const review: BonusReviewEntry[] = predsSnap.docs
          .map((d) => d.data() as PredictionData)
          .filter((p): p is PredictionData & { bonusAnswer: string } => Boolean(p.bonusAnswer))
          .map((p) => ({
            uid: p.userId,
            surnom: users.find((u) => u.uid === p.userId)?.surnom ?? p.userId,
            answer: p.bonusAnswer,
            correct: Boolean(p.bonusCorrect),
          }))
          .sort((a, b) => Number(a.correct) - Number(b.correct));
        setBonusReview(review);
      } else {
        setBonusReview([]);
      }
    } else {
      setResultsQueensStatus({});
      setResultsWinner(null);
      setResultsEliminee(null);
      setResultsMiniDefi(null);
      setResultsMaxiDefi(null);
      setScoringRules(defaultScoringRules);
      setResultsMaxTop(pendingMaxTop);
      setResultsMaxBottom(pendingMaxBottom);
      setResultsBonusQuestion(pendingBonusQuestion);
      setResultsBonusAnswer("");
      setBonusReview([]);
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

      showToast("La liste des Queens a été mise à jour avec succès !", "success");
      setQueensList(newValue);
    } catch (error) {
      console.error("Erreur :", error);
      showToast("Erreur lors de la sauvegarde.", "error");
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
      showToast("La liste des Mini-Defis a été mise à jour avec succès !", "success");

      // Optionnel : mettre à jour le state local pour refléter le changement
      setMiniDefisList(newValue);
    } catch (error) {
      console.error("Erreur :", error);
      showToast("Erreur lors de la sauvegarde.", "error");
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
      showToast("La liste des Maxi-Defis a été mise à jour avec succès !", "success");

      // Optionnel : mettre à jour le state local pour refléter le changement
      setMaxiDefisList(newValue);
    } catch (error) {
      console.error("Erreur :", error);
      showToast("Erreur lors de la sauvegarde.", "error");
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
        const loadedBonusQuestion: BonusQuestion | null = configDoc.exists()
          ? configDoc.data().bonusQuestion ?? null
          : null;
        const loadedMaxTop: number = configDoc.exists()
          ? configDoc.data().maxTop ?? DEFAULT_MAX_QUEENS
          : DEFAULT_MAX_QUEENS;
        const loadedMaxBottom: number = configDoc.exists()
          ? configDoc.data().maxBottom ?? DEFAULT_MAX_QUEENS
          : DEFAULT_MAX_QUEENS;
        if (configDoc.exists()) {
          setEpisodeNum(numero as number);
          const ts = configDoc.data().dateDiffusion as Timestamp | undefined;
          if (ts) setDateDiffusion(toDatetimeLocalValue(ts));
        }
        setBonusQuestion(loadedBonusQuestion);
        setBonusQuestionEpisodeNum(numero);
        setMaxTop(loadedMaxTop);
        setMaxBottom(loadedMaxBottom);

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
          await loadResultsForEpisode(numero, loadedBonusQuestion, loadedMaxTop, loadedMaxBottom);
        }

        // Historique de tous les résultats déjà publiés (pour la partie non modifiable)
        const resultsHistorySnap = await getDocs(collection(db, "results"));
        setResultsHistory(
          resultsHistorySnap.docs
            .map((d) => d.data() as ResultData)
            .sort((a, b) => b.numero - a.numero)
        );

        // Charger la liste des joueurs, avec leur uid, s'ils ont déjà pronostiqué l'épisode en
        // cours et s'ils ont pronostiqué la gagnante de la saison
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
            hasCrownPrediction: false,
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

        const crownPredictionChecks = await Promise.all(
          usersList.map((u) => getDoc(doc(db, "crownPredictions", u.uid)))
        );
        usersList.forEach((u, i) => {
          u.hasCrownPrediction = crownPredictionChecks[i].exists();
        });

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

      showToast("Informations de la couronne enregistrées !", "success");
    } catch (error) {
      console.error("Erreur :", error);
      showToast("Erreur lors de la sauvegarde.", "error");
    }
  };

  // Le tableau de résultats d'un épisode doit refléter le roster tel qu'il était à CE moment-là,
  // pas le statut global "eliminee" actuel : une Queen éliminée plus tard (ou dans cet épisode
  // même) était encore active à l'époque. On s'appuie sur l'historique des résultats déjà publiés
  // pour le savoir, ce qui permet de rouvrir et corriger n'importe quel épisode passé.
  const resultsActiveQueens = queensList
    .filter((q) => {
      if (!q.eliminee) return true;
      if (q.name === resultsEliminee) return true;
      const eliminatedAtEpisode = resultsHistory.find((r) => r.eliminee === q.name)?.numero;
      return eliminatedAtEpisode !== undefined && eliminatedAtEpisode >= resultsEpisodeNum;
    })
    .map((q) => q.name);
  const resultsTopQueens = resultsActiveQueens.filter((q) => resultsQueensStatus[q] === "top");
  const resultsBottomQueens = resultsActiveQueens.filter((q) => resultsQueensStatus[q] === "bottom");
  const resultsAllSelected = resultsTopQueens.length > 0 && resultsBottomQueens.length > 0;
  const resultsTopDisabledTags = Object.fromEntries(resultsBottomQueens.map((q) => [q, "Bottom"]));
  const resultsBottomDisabledTags = Object.fromEntries(resultsTopQueens.map((q) => [q, "Top"]));

  const handleResultsBottomChange = (next: string[]) => {
    setResultsQueensStatus((prev) => {
      const updated = { ...prev };
      resultsActiveQueens.forEach((q) => {
        if (updated[q] === "bottom") delete updated[q];
      });
      next.forEach((q) => { updated[q] = "bottom"; });
      return updated;
    });
    setResultsEliminee((prev) => (prev && next.includes(prev) ? prev : null));
  };

  const handleResultsTopChange = (next: string[]) => {
    setResultsQueensStatus((prev) => {
      const updated = { ...prev };
      resultsActiveQueens.forEach((q) => {
        if (updated[q] === "top") delete updated[q];
      });
      next.forEach((q) => { updated[q] = "top"; });
      return updated;
    });
    setResultsWinner((prev) => (prev && next.includes(prev) ? prev : null));
  };

  const handleSaveResults = async () => {
    if (
      resultsTopQueens.length < 1 ||
      resultsTopQueens.length > resultsMaxTop ||
      resultsBottomQueens.length < 1 ||
      resultsBottomQueens.length > resultsMaxBottom ||
      !resultsWinner ||
      !resultsEliminee ||
      !resultsMiniDefi ||
      !resultsMaxiDefi
    ) {
      showToast(
        `Remplis entièrement les résultats (1 à ${resultsMaxTop} Top, 1 à ${resultsMaxBottom} Bottom, Gagnante, Éliminée, Mini-Défi, Maxi-Défi) avant d'enregistrer.`,
        "warning"
      );
      return;
    }

    const isEditingPastEpisode = resultsEpisodeNum !== episodeNum;

    setSavingResults(true);
    try {
      const resultData: ResultData = {
        numero: resultsEpisodeNum,
        top: resultsTopQueens,
        bottom: resultsBottomQueens,
        maxTop: resultsMaxTop,
        maxBottom: resultsMaxBottom,
        eliminee: resultsEliminee,
        winner: resultsWinner,
        miniDefi: resultsMiniDefi,
        maxiDefi: resultsMaxiDefi,
        scoringRules,
        publishedAt: Timestamp.now(),
        ...(resultsBonusQuestion
          ? { bonusQuestion: { ...resultsBonusQuestion, answer: resultsBonusAnswer || "Aucune" } }
          : {}),
      };

      // Repart de zéro pour cet épisode : si on corrige une erreur (l'éliminée a changé),
      // l'ancienne éliminée de CET épisode doit être "réhabilitée", sans toucher aux autres.
      const previousResultForEpisode = resultsHistory.find((r) => r.numero === resultsEpisodeNum);
      const updatedQueensList = queensList.map((q) => {
        if (q.name === resultsEliminee) return { ...q, eliminee: true };
        if (previousResultForEpisode && q.name === previousResultForEpisode.eliminee) {
          return { ...q, eliminee: false };
        }
        return q;
      });

      const batch = writeBatch(db);
      batch.set(doc(db, "results", String(resultsEpisodeNum)), resultData);
      batch.update(doc(db, "game-data", "w5fjPTmVyX0HZb3oqFW9"), { queens: updatedQueensList });

      const predsSnap = await getDocs(
        query(collection(db, "predictions"), where("episodeId", "==", resultsEpisodeNum))
      );
      const affectedUserIds = new Set<string>();
      const bonusReviewCandidates: BonusReviewEntry[] = [];
      predsSnap.forEach((predDoc) => {
        const prediction = predDoc.data() as PredictionData;
        const basePoints = computeEpisodePoints(prediction, resultData, resultsActiveQueens);
        const bonus = computeBonusPoints(prediction, resultData);
        const update: Record<string, unknown> = {
          pointsEarned: basePoints + bonus.points,
          bonusAnswerPending: false,
        };
        if (resultData.bonusQuestion) update.bonusCorrect = bonus.correct;
        batch.update(predDoc.ref, update);
        affectedUserIds.add(prediction.userId);

        if (resultData.bonusQuestion?.type === "texte" && prediction.bonusAnswer) {
          bonusReviewCandidates.push({
            uid: prediction.userId,
            surnom: users.find((u) => u.uid === prediction.userId)?.surnom ?? prediction.userId,
            answer: prediction.bonusAnswer,
            correct: bonus.correct,
          });
        }
      });

      await batch.commit();
      setQueensList(updatedQueensList);
      setResultsHistory((prev) => [resultData, ...prev.filter((r) => r.numero !== resultsEpisodeNum)]);
      setBonusReview(bonusReviewCandidates.sort((a, b) => Number(a.correct) - Number(b.correct)));

      // Recalcule le score total de chaque joueur concerné (couvre aussi bien un nouvel
      // épisode qu'une correction d'un épisode passé : l'erreur est humaine, ça peut arriver).
      const newScores: Record<string, number> = {};
      for (const uid of affectedUserIds) {
        newScores[uid] = await recomputeUserScore(uid);
      }

      setUsers((prev) => prev.map((u) => (u.uid in newScores ? { ...u, score: newScores[u.uid] } : u)));

      showToast(
        isEditingPastEpisode
          ? `Résultats de l'épisode ${resultsEpisodeNum} corrigés, scores recalculés !`
          : "Résultats enregistrés et scores calculés !",
        "success"
      );

      // Après avoir résulté l'épisode en cours (pas une correction passée), on propose
      // d'enchaîner sur le prochain épisode. Toujours modifiable ensuite manuellement.
      if (!isEditingPastEpisode) {
        const draftDate = dateDiffusion
          ? formatDatetimeLocal(new Date(new Date(dateDiffusion).getTime() + SEVEN_DAYS_MS))
          : "";
        setNextEpisodeDraftNum(resultsEpisodeNum + 1);
        setNextEpisodeDraftDate(draftDate);
        setShowNextEpisodeModal(true);
      }
    } catch (error) {
      console.error("Erreur :", error);
      showToast("Erreur lors de l'enregistrement des résultats.", "error");
    } finally {
      setSavingResults(false);
    }
  };

  const handleEditHistoricalResult = (numero: number) => {
    loadResultsForEpisode(numero);
  };

  const handleConfirmNextEpisode = async (
    numero: number,
    date: string,
    newMaxTop: number,
    newMaxBottom: number
  ) => {
    try {
      // config/next_episode est un doc unique réutilisé d'un épisode à l'autre : la question
      // bonus de l'épisode précédent (déjà figée dans results/{numero}) ne doit pas "fuiter"
      // sur le nouvel épisode.
      const numeroChanged = bonusQuestionEpisodeNum !== null && bonusQuestionEpisodeNum !== numero;
      await updateDoc(doc(db, "config", "next_episode"), {
        numero,
        dateDiffusion: Timestamp.fromDate(new Date(date)),
        maxTop: newMaxTop,
        maxBottom: newMaxBottom,
        ...(numeroChanged ? { bonusQuestion: deleteField() } : {}),
      });
      setEpisodeNum(numero);
      setDateDiffusion(date);
      setMaxTop(newMaxTop);
      setMaxBottom(newMaxBottom);
      if (numeroChanged) {
        setBonusQuestion(null);
        setBonusQuestionEpisodeNum(numero);
      }
      await loadResultsForEpisode(numero, numeroChanged ? null : bonusQuestion, newMaxTop, newMaxBottom);
      setShowNextEpisodeModal(false);
      showToast("Prochain épisode enregistré !", "success");
    } catch (error) {
      console.error("Erreur :", error);
      showToast("Erreur lors de la mise à jour du prochain épisode.", "error");
    }
  };

  const handleUpdateEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const numeroChanged = bonusQuestionEpisodeNum !== null && bonusQuestionEpisodeNum !== episodeNum;
      await updateDoc(doc(db, "config", "next_episode"), {
        numero: episodeNum,
        dateDiffusion: Timestamp.fromDate(new Date(dateDiffusion)),
        maxTop,
        maxBottom,
        ...(numeroChanged ? { bonusQuestion: deleteField() } : {}),
      });
      if (numeroChanged) {
        setBonusQuestion(null);
        setBonusQuestionEpisodeNum(episodeNum);
      }
      // Le formulaire "Résultats" est réinitialisé (ou recharge les résultats déjà saisis
      // pour ce numéro) : il ne doit jamais garder les sélections de l'épisode précédent.
      await loadResultsForEpisode(episodeNum, numeroChanged ? null : bonusQuestion);
      showToast("Épisode mis à jour !", "success");
    } catch (err) {
      console.error("Erreur :", err);
      showToast("Erreur lors de la mise à jour", "error");
    }
  };

  const handleSaveBonusQuestion = async (next: BonusQuestion) => {
    const predsSnap = await getDocs(
      query(collection(db, "predictions"), where("episodeId", "==", episodeNum))
    );
    const answered = predsSnap.docs.filter((d) => (d.data() as PredictionData).bonusAnswer != null);

    if (answered.length > 0) {
      const confirmed = window.confirm(
        `${answered.length} joueur(s) ont déjà répondu à la question bonus actuelle. La modifier va réinitialiser leur réponse : ils devront y répondre à nouveau. Confirmer ?`
      );
      if (!confirmed) return;
    }

    try {
      await updateDoc(doc(db, "config", "next_episode"), { bonusQuestion: next });
      if (answered.length > 0) {
        const batch = writeBatch(db);
        answered.forEach((d) => batch.update(d.ref, { bonusAnswer: deleteField(), bonusAnswerPending: true }));
        await batch.commit();
      }
      setBonusQuestion(next);
      setBonusQuestionEpisodeNum(episodeNum);
      if (resultsEpisodeNum === episodeNum) setResultsBonusQuestion(next);
      showToast("Question bonus enregistrée !", "success");
    } catch (error) {
      console.error("Erreur :", error);
      showToast("Erreur lors de la sauvegarde de la question bonus.", "error");
    }
  };

  const handleRemoveBonusQuestion = async () => {
    const predsSnap = await getDocs(
      query(collection(db, "predictions"), where("episodeId", "==", episodeNum))
    );
    const answered = predsSnap.docs.filter((d) => (d.data() as PredictionData).bonusAnswer != null);

    if (answered.length > 0) {
      const confirmed = window.confirm(
        `${answered.length} joueur(s) ont déjà répondu à la question bonus. La retirer effacera leur réponse. Confirmer ?`
      );
      if (!confirmed) return;
    }

    try {
      await updateDoc(doc(db, "config", "next_episode"), { bonusQuestion: deleteField() });
      if (answered.length > 0) {
        const batch = writeBatch(db);
        answered.forEach((d) => batch.update(d.ref, { bonusAnswer: deleteField(), bonusAnswerPending: false }));
        await batch.commit();
      }
      setBonusQuestion(null);
      setBonusQuestionEpisodeNum(episodeNum);
      if (resultsEpisodeNum === episodeNum) setResultsBonusQuestion(null);
      showToast("Question bonus retirée.", "success");
    } catch (error) {
      console.error("Erreur :", error);
      showToast("Erreur lors de la suppression de la question bonus.", "error");
    }
  };

  // Correction manuelle d'une réponse en texte libre non reconnue automatiquement
  // (faute d'orthographe...). Recalcule pointsEarned de ce joueur puis son score total.
  const handleToggleBonusCorrect = async (uid: string, correct: boolean) => {
    const result = resultsHistory.find((r) => r.numero === resultsEpisodeNum);
    if (!result?.bonusQuestion) return;

    const predRef = doc(db, "predictions", `${uid}_ep${resultsEpisodeNum}`);
    const predSnap = await getDoc(predRef);
    if (!predSnap.exists()) return;
    const prediction = predSnap.data() as PredictionData;

    const basePoints = computeEpisodePoints(prediction, result, resultsActiveQueens);
    const bonusPoints = correct ? result.bonusQuestion.points : 0;

    try {
      await updateDoc(predRef, { bonusCorrect: correct, pointsEarned: basePoints + bonusPoints });
      const newScore = await recomputeUserScore(uid);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, score: newScore } : u)));
      setBonusReview((prev) => prev.map((r) => (r.uid === uid ? { ...r, correct } : r)));
    } catch (error) {
      console.error("Erreur :", error);
      showToast("Erreur lors de la mise à jour de la réponse.", "error");
    }
  };

  if (loading) return <LoadingScreen message="Le jury délibère, un instant..." />;
  if (!isAdmin) return null;

  return (
    <>
      <Header isAdmin={isAdmin} />
      <div className="min-h-screen bg-cover bg-center" style={{ backgroundImage: "url('/fond-login.png')" }}>
        <div className="min-h-screen bg-gray-950/80 backdrop-blur-sm p-4 sm:p-6 md:p-12">

          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-10 text-center">Administration</h1>

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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Max Queens en top</label>
                    <select
                      value={maxTop}
                      onChange={(e) => setMaxTop(Number(e.target.value))}
                      className="w-full p-3 rounded-xl border border-gray-200 text-gray-900"
                    >
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Max Queens en bottom</label>
                    <select
                      value={maxBottom}
                      onChange={(e) => setMaxBottom(Number(e.target.value))}
                      className="w-full p-3 rounded-xl border border-gray-200 text-gray-900"
                    >
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-500 -mt-2">
                  Passe à 2 pour les derniers épisodes de la saison. Le top et le bottom peuvent avoir un maximum différent.
                </p>
                <Button type="submit" size="lg">
                  Mettre à jour
                </Button>
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
                      <th className="py-2 text-gray-500 font-bold uppercase text-xs text-center">Pronostic gagnante</th>
                      <th className="py-2 text-gray-500 font-bold uppercase text-xs text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map(u => (
                      <tr key={u.uid}>
                        <td className="py-3 text-gray-900 font-medium">{u.surnom}</td>
                        <td className="py-3 text-center">{u.hasPredicted ? "✅" : "❌"}</td>
                        <td className="py-3 text-center">{u.hasCrownPrediction ? "✅" : "❌"}</td>
                        <td className="py-3 text-gray-900 font-bold text-right">{u.score ?? 0} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <BonusQuestionEditor
              key={bonusQuestionEpisodeNum ?? episodeNum}
              episodeNum={episodeNum}
              initial={bonusQuestion}
              queensList={queensList}
              onSave={handleSaveBonusQuestion}
              onRemove={handleRemoveBonusQuestion}
            />

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
              <Button onClick={handleSaveQueens} size="lg">
                Sauvegarder la liste des Queens
              </Button>
            </section>

            <section className="bg-white/95 p-8 rounded-[15px] shadow-lg">
              <h2 className="text-2xl font-bold text-gray-950 mb-4">Gestion des Mini-Defis</h2>
              <textarea 
                defaultValue={miniDefisList.join('\n')}
                className="w-full h-32 p-3 rounded-xl border border-gray-200 mb-4"
                id="miniDefisArea"
                placeholder="Un Mini-Defi par ligne"
              />
              <Button onClick={handleSaveMiniDefis} size="lg">
                Sauvegarder la liste des Mini-Defis
              </Button>
            </section>

            <section className="bg-white/95 p-8 rounded-[15px] shadow-lg">
              <h2 className="text-2xl font-bold text-gray-950 mb-4">Gestion des Maxi-Defis</h2>
              <textarea 
                defaultValue={maxiDefisList.join('\n')}
                className="w-full h-32 p-3 rounded-xl border border-gray-200 mb-4"
                id="maxiDefisArea"
                placeholder="Un Maxi-Defi par ligne"
              />
              <Button onClick={handleSaveMaxiDefis} size="lg">
                Sauvegarder la liste des Maxi-Defis
              </Button>
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

              <Button onClick={handleSaveCrownWinner} size="lg">
                Sauvegarder
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                La gagnante n&apos;est à renseigner qu&apos;une fois la saison terminée. La case à cocher
                bloque immédiatement les pronostics couronne des joueurs (ex. dès la diffusion de l&apos;épisode 1),
                indépendamment de la gagnante.
              </p>
            </section>

            <section className="bg-white/95 p-8 rounded-[15px] shadow-lg md:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                <h2 className="text-2xl font-bold text-gray-950">Résultats de l&apos;épisode {resultsEpisodeNum}</h2>
                {resultsEpisodeNum !== episodeNum && (
                  <button
                    onClick={() => loadResultsForEpisode(episodeNum, bonusQuestion)}
                    className="text-sm px-3 py-1 rounded border border-gray-200 text-gray-700 font-semibold self-start sm:self-auto"
                  >
                    Revenir à l&apos;épisode en cours ({episodeNum})
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-4">
                {resultsEpisodeNum !== episodeNum ? (
                  <>Modification d&apos;un résultat déjà publié : les scores des joueurs concernés seront recalculés.</>
                ) : (
                  <>Reprend le même tableau que celui rempli par les joueurs. À l&apos;enregistrement, la Queen éliminée
                  est automatiquement marquée comme telle dans la Gestion des Queens, et les scores de tous les
                  joueurs ayant pronostiqué cet épisode sont recalculés.</>
                )}
              </p>

              <div className="mb-4">
                <p className="text-sm font-bold text-gray-700 mb-2">
                  Bottom (1 à {resultsMaxBottom} Queens)
                </p>
                <QueenGrid
                  queens={resultsActiveQueens}
                  selected={resultsBottomQueens}
                  max={resultsMaxBottom}
                  disabledTags={resultsBottomDisabledTags}
                  onChange={handleResultsBottomChange}
                />
              </div>

              <div className="mb-4">
                <p className="text-sm font-bold text-gray-700 mb-2">
                  Top (1 à {resultsMaxTop} Queens)
                </p>
                <QueenGrid
                  queens={resultsActiveQueens}
                  selected={resultsTopQueens}
                  max={resultsMaxTop}
                  disabledTags={resultsTopDisabledTags}
                  onChange={handleResultsTopChange}
                />
              </div>

              <div className="mt-4">
                <p className="text-sm font-bold text-gray-700 mb-2">Barème de points pour cet épisode</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Mini-Défi</label>
                  <DefiOptions
                    options={miniDefisList}
                    value={resultsMiniDefi}
                    onSelect={(value) => setResultsMiniDefi(value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Maxi-Défi</label>
                  <DefiOptions
                    options={maxiDefisList}
                    value={resultsMaxiDefi}
                    onSelect={(value) => setResultsMaxiDefi(value)}
                  />
                </div>
              </div>

              {resultsAllSelected && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Gagnante (parmi le Top)</label>
                    <QueenGrid
                      queens={resultsTopQueens}
                      selected={resultsWinner ? [resultsWinner] : []}
                      max={1}
                      onChange={(next) => setResultsWinner(next[0] ?? null)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Éliminée (parmi le Bottom)</label>
                    <QueenGrid
                      queens={resultsBottomQueens}
                      selected={resultsEliminee ? [resultsEliminee] : []}
                      max={1}
                      onChange={(next) => setResultsEliminee(next[0] ?? null)}
                    />
                  </div>
                </div>
              )}

              {resultsBonusQuestion && (
                <div className="mt-4 bg-purple-50 border border-purple-100 rounded-xl p-4">
                  <p className="text-sm font-bold text-gray-700 mb-1">
                    Question bonus : {resultsBonusQuestion.question}
                  </p>
                  <p className="text-xs text-gray-500 mb-2">
                    {resultsBonusQuestion.points} points pour une bonne réponse.
                  </p>

                  {resultsBonusQuestion.type === "queens" && (
                    <select
                      value={resultsBonusAnswer || "Aucune"}
                      onChange={(e) => setResultsBonusAnswer(e.target.value)}
                      className="w-full p-2 rounded-lg border border-gray-200 text-gray-900"
                    >
                      {[...(resultsBonusQuestion.queensOptions ?? []), "Aucune"].map((q) => (
                        <option key={q} value={q}>{q}</option>
                      ))}
                    </select>
                  )}

                  {resultsBonusQuestion.type === "options" && (
                    <select
                      value={resultsBonusAnswer || "Aucune"}
                      onChange={(e) => setResultsBonusAnswer(e.target.value)}
                      className="w-full p-2 rounded-lg border border-gray-200 text-gray-900"
                    >
                      {(resultsBonusQuestion.options ?? ["Aucune"]).map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  )}

                  {resultsBonusQuestion.type === "texte" && (
                    <input
                      type="text"
                      value={resultsBonusAnswer}
                      onChange={(e) => setResultsBonusAnswer(e.target.value)}
                      placeholder="Réponse correcte de référence (ou laisse vide si aucune réponse ne gagne)"
                      className="w-full p-2 rounded-lg border border-gray-200 text-gray-900"
                    />
                  )}
                </div>
              )}

              {bonusReview.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <p className="text-sm font-bold text-gray-700 mb-2">
                    Réponses en texte libre à la question bonus — vérifie celles non reconnues automatiquement
                  </p>
                  <div className="space-y-2">
                    {bonusReview.map((r) => (
                      <div key={r.uid} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg p-2">
                        <div className="text-sm">
                          <span className="font-semibold text-gray-900">{r.surnom}</span>
                          <span className="text-gray-600"> — &quot;{r.answer}&quot;</span>
                        </div>
                        <button
                          onClick={() => handleToggleBonusCorrect(r.uid, !r.correct)}
                          className={`text-xs px-3 py-1 rounded border font-semibold whitespace-nowrap ${
                            r.correct
                              ? "border-green-300 bg-green-50 text-green-700"
                              : "border-gray-200 text-gray-700"
                          }`}
                        >
                          {r.correct ? "✓ Marquée correcte" : "Marquer correcte"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleSaveResults} disabled={savingResults} size="lg" className="mt-4">
                {savingResults ? "Calcul des scores en cours..." : "Enregistrer les résultats et calculer les scores"}
              </Button>
            </section>

            <section className="bg-white/95 p-8 rounded-[15px] shadow-lg md:col-span-2">
              <h2 className="text-2xl font-bold text-gray-950 mb-2">Historique des résultats</h2>
              <p className="text-xs text-gray-500 mb-4">
                Résultats déjà publiés pour les épisodes précédents. Clique sur Modifier pour corriger
                une erreur : les scores des joueurs concernés sont automatiquement recalculés.
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
                        <th className="py-2 pr-4 text-gray-500 font-bold uppercase text-xs">Maxi-Défi</th>
                        <th className="py-2 text-gray-500 font-bold uppercase text-xs"></th>
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
                            <td className="py-3 pr-4 text-gray-900">{r.maxiDefi}</td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleEditHistoricalResult(r.numero)}
                                className="text-sm px-3 py-1 rounded border border-gray-200 text-gray-700 font-semibold"
                              >
                                Modifier
                              </button>
                            </td>
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

      {showNextEpisodeModal && (
        <NextEpisodeModal
          defaultNumero={nextEpisodeDraftNum}
          defaultDate={nextEpisodeDraftDate}
          defaultMaxTop={maxTop}
          defaultMaxBottom={maxBottom}
          onConfirm={handleConfirmNextEpisode}
          onClose={() => setShowNextEpisodeModal(false)}
        />
      )}
    </>
  );
}

// **N'oublie pas** de créer manuellement un document `next_episode` dans une collection `config` sur Firebase pour que le formulaire puisse lire les données au départ.