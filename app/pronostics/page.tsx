"use client";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/Header";
import LoadingScreen from "@/components/LoadingScreen";
import Button from "@/components/Button";
import QueenGrid from "@/components/pronostics/QueenGrid";
import DefiOptions from "@/components/pronostics/DefiOptions";
import StepHeader from "@/components/pronostics/StepHeader";
import BonusQuestionStep from "@/components/pronostics/BonusQuestionStep";
import { auth, db } from "@/lib/firebase";
import { ConfigData } from "@/types/config";
import { PredictionData } from "@/types/prediction";
import { UserData } from "@/types/user";
import { QueenData } from "@/types/gameData";
import { BonusQuestion } from "@/types/bonus";
import { normalizeQueens } from "@/lib/queens";
import { SCORING_RULES, DEFAULT_MAX_TOP_BOTTOM } from "@/lib/scoring";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";

const STEP_BOTTOM = 1;
const STEP_ELIMINEE = 2;
const STEP_TOP = 3;
const STEP_WINNER = 4;
const STEP_MINI = 5;
const STEP_MAXI = 6;
const STEP_BONUS = 7;
const STEP_RECAP = 8;

interface RecapRowProps {
  label: string;
  value: string;
  onEdit: () => void;
}

function RecapRow({ label, value, onEdit }: RecapRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 bg-white rounded-xl border border-gray-100 p-4">
      <div>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">{label}</p>
        <p className="text-gray-900 font-semibold">{value}</p>
      </div>
      <Button size="sm" variant="secondary" onClick={onEdit}>
        Modifier
      </Button>
    </div>
  );
}

export default function PronosticPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [queens, setQueens] = useState<QueenData[]>([]);
  const [episodeNum, setEpisodeNum] = useState<number | null>(null);
  const [isPastDeadline, setIsPastDeadline] = useState(false);
  const [maxTopBottom, setMaxTopBottom] = useState(DEFAULT_MAX_TOP_BOTTOM);
  const [miniDefisOptions, setMiniDefisOptions] = useState<string[]>([]);
  const [maxiDefisOptions, setMaxiDefisOptions] = useState<string[]>([]);

  const [step, setStep] = useState(STEP_BOTTOM);
  const [bottomQueens, setBottomQueens] = useState<string[]>([]);
  const [eliminee, setEliminee] = useState<string | null>(null);
  const [topQueens, setTopQueens] = useState<string[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [miniDefi, setMiniDefi] = useState<string | null>(null);
  const [maxiDefi, setMaxiDefi] = useState<string | null>(null);
  const [bonusQuestion, setBonusQuestion] = useState<BonusQuestion | null>(null);
  const [bonusAnswer, setBonusAnswer] = useState<string | null>(null);
  const totalSteps = bonusQuestion ? 7 : 6;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const showToast = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
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
        setMaxTopBottom(nextEpisode?.maxTopBottom ?? DEFAULT_MAX_TOP_BOTTOM);
        setBonusQuestion(nextEpisode?.bonusQuestion ?? null);
        const episodeDate = nextEpisode?.dateDiffusion ? nextEpisode.dateDiffusion.toDate() : null;
        setIsPastDeadline(episodeDate !== null && episodeDate.getTime() < Date.now());

        if (queensSnap.exists()) {
          const gameData = queensSnap.data();
          setQueens(normalizeQueens(gameData.queens || []));
          setMiniDefisOptions(gameData.minidefis || []);
          setMaxiDefisOptions(gameData.maxidefis || []);
        }

        if (numero !== null) {
          const predictionSnap = await getDoc(doc(db, "predictions", `${user.uid}_ep${numero}`));
          if (predictionSnap.exists()) {
            const data = predictionSnap.data() as PredictionData;
            const results = data.queensResults || {};
            setBottomQueens(Object.keys(results).filter((q) => results[q] === "bottom"));
            setTopQueens(Object.keys(results).filter((q) => results[q] === "top"));
            setWinner(data.winner ?? null);
            setEliminee(data.eliminee ?? null);
            setMiniDefi(data.miniDefi ?? null);
            setMaxiDefi(data.maxiDefi ?? null);
            setBonusAnswer(data.bonusAnswerPending ? null : data.bonusAnswer ?? null);
            setStep(STEP_RECAP);
          }
        }
      } catch (error) {
        console.error("Erreur :", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const activeQueens = queens.filter((q) => !q.eliminee).map((q) => q.name);

  // L'étape bonus n'existe que si l'épisode en a une : on la saute dans les deux sens.
  const computeNextStep = (s: number) => {
    const next = s + 1 === STEP_BONUS && !bonusQuestion ? STEP_RECAP : s + 1;
    return Math.min(next, STEP_RECAP);
  };
  const computePrevStep = (s: number) => {
    const prev = s - 1 === STEP_BONUS && !bonusQuestion ? STEP_MAXI : s - 1;
    return Math.max(prev, STEP_BOTTOM);
  };
  const goNext = () => setStep(computeNextStep);
  const goBack = () => setStep(computePrevStep);
  const advanceSoon = () => setTimeout(() => setStep(computeNextStep), 350);

  const handleBottomChange = (next: string[]) => {
    setBottomQueens(next);
    // Une Queen retirée du bottom ne peut plus rester "éliminée", ni rester
    // sélectionnée comme "top" (les deux statuts sont mutuellement exclusifs).
    setTopQueens((prev) => prev.filter((q) => !next.includes(q)));
    setEliminee((prev) => (prev && next.includes(prev) ? prev : null));
    if (next.length === maxTopBottom) advanceSoon();
  };

  const handleElimineeChange = (next: string[]) => {
    const value = next[0] ?? null;
    setEliminee(value);
    if (value) advanceSoon();
  };

  const handleTopChange = (next: string[]) => {
    setTopQueens(next);
    // Une Queen retirée du top ne peut plus rester "gagnante".
    setWinner((prev) => (prev && next.includes(prev) ? prev : null));
    if (next.length === maxTopBottom) advanceSoon();
  };

  const handleWinnerChange = (next: string[]) => {
    const value = next[0] ?? null;
    setWinner(value);
    if (value) advanceSoon();
  };

  const handleMiniDefiSelect = (value: string) => {
    setMiniDefi(value);
    advanceSoon();
  };

  const handleMaxiDefiSelect = (value: string) => {
    setMaxiDefi(value);
    advanceSoon();
  };

  const handleBonusSelect = (value: string) => {
    setBonusAnswer(value);
    advanceSoon();
  };

  const topDisabledTags = Object.fromEntries(
    bottomQueens.map((q) => [q, q === eliminee ? "Éliminée" : "Bottom"])
  );

  const savePronostics = async () => {
    const user = auth.currentUser;
    if (!user || episodeNum === null || isPastDeadline) return;

    const queensResults: Record<string, "top" | "bottom" | "safe"> = {};
    activeQueens.forEach((q) => {
      queensResults[q] = bottomQueens.includes(q) ? "bottom" : topQueens.includes(q) ? "top" : "safe";
    });

    setSaving(true);
    try {
      await setDoc(
        doc(db, "predictions", `${user.uid}_ep${episodeNum}`),
        {
          userId: user.uid,
          episodeId: episodeNum,
          queensResults,
          winner,
          eliminee,
          miniDefi,
          maxiDefi,
          ...(bonusQuestion ? { bonusAnswer, bonusAnswerPending: false } : {}),
          updatedAt: new Date(),
        },
        { merge: true }
      );
      showToast("Pronostics enregistrés !", "success");
      router.push("/historique");
    } catch (error) {
      console.error("Erreur :", error);
      showToast("Erreur lors de l'enregistrement.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <LoadingScreen message="Les Queens enfilent leurs looks pour cet épisode..." />
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

        <div className="p-4 sm:p-6 max-w-3xl mx-auto">
          {step === STEP_BOTTOM && (
            <>
              <StepHeader
                step={STEP_BOTTOM}
                totalSteps={totalSteps}
                title="Qui sera dans le bottom ?"
                points={SCORING_RULES.bottom}
                multiplier={maxTopBottom}
              />
              <p className="text-sm text-gray-500 mb-3">
                Sélectionne de 0 à {maxTopBottom} Queens, puis clique sur Suivant.
              </p>
              <QueenGrid queens={activeQueens} selected={bottomQueens} max={maxTopBottom} onChange={handleBottomChange} />
              <div className="mt-4 text-right">
                <Button size="sm" onClick={goNext}>Suivant →</Button>
              </div>
            </>
          )}

          {step === STEP_ELIMINEE && (
            <>
              <StepHeader
                step={STEP_ELIMINEE}
                totalSteps={totalSteps}
                title="Qui sera éliminée ?"
                points={SCORING_RULES.eliminee}
                onBack={goBack}
              />
              {bottomQueens.length === 0 ? (
                <p className="text-sm text-gray-500 bg-gray-100 rounded-xl p-4">
                  Aucune Queen sélectionnée dans le bottom.
                </p>
              ) : (
                <QueenGrid
                  queens={bottomQueens}
                  selected={eliminee ? [eliminee] : []}
                  max={1}
                  onChange={handleElimineeChange}
                />
              )}
              {(bottomQueens.length === 0 || eliminee) && (
                <div className="mt-4 text-right">
                  <Button size="sm" onClick={goNext}>Suivant →</Button>
                </div>
              )}
            </>
          )}

          {step === STEP_TOP && (
            <>
              <StepHeader
                step={STEP_TOP}
                totalSteps={totalSteps}
                title="Qui sera dans le top ?"
                points={SCORING_RULES.top}
                multiplier={maxTopBottom}
                onBack={goBack}
              />
              <p className="text-sm text-gray-500 mb-3">
                Sélectionne de 0 à {maxTopBottom} Queens, puis clique sur Suivant.
              </p>
              <QueenGrid
                queens={activeQueens}
                selected={topQueens}
                max={maxTopBottom}
                disabledTags={topDisabledTags}
                onChange={handleTopChange}
              />
              <div className="mt-4 text-right">
                <Button size="sm" onClick={goNext}>Suivant →</Button>
              </div>
            </>
          )}

          {step === STEP_WINNER && (
            <>
              <StepHeader
                step={STEP_WINNER}
                totalSteps={totalSteps}
                title="Qui sera la gagnante de l'épisode ?"
                points={SCORING_RULES.gagnante}
                onBack={goBack}
              />
              {topQueens.length === 0 ? (
                <p className="text-sm text-gray-500 bg-gray-100 rounded-xl p-4">
                  Aucune Queen sélectionnée dans le top.
                </p>
              ) : (
                <QueenGrid
                  queens={topQueens}
                  selected={winner ? [winner] : []}
                  max={1}
                  onChange={handleWinnerChange}
                />
              )}
              {(topQueens.length === 0 || winner) && (
                <div className="mt-4 text-right">
                  <Button size="sm" onClick={goNext}>Suivant →</Button>
                </div>
              )}
            </>
          )}

          {step === STEP_MINI && (
            <>
              <StepHeader
                step={STEP_MINI}
                totalSteps={totalSteps}
                title="Quel sera le mini-défi ?"
                points={SCORING_RULES.miniDefi}
                onBack={goBack}
              />
              <DefiOptions options={miniDefisOptions} value={miniDefi} onSelect={handleMiniDefiSelect} />
              {miniDefi && (
                <div className="mt-4 text-right">
                  <Button size="sm" onClick={goNext}>Suivant →</Button>
                </div>
              )}
            </>
          )}

          {step === STEP_MAXI && (
            <>
              <StepHeader
                step={STEP_MAXI}
                totalSteps={totalSteps}
                title="Quel sera le maxi-défi ?"
                points={SCORING_RULES.maxiDefi}
                onBack={goBack}
              />
              <DefiOptions options={maxiDefisOptions} value={maxiDefi} onSelect={handleMaxiDefiSelect} />
              {maxiDefi && (
                <div className="mt-4 text-right">
                  <Button size="sm" onClick={goNext}>
                    {bonusQuestion ? "Suivant →" : "Voir le récapitulatif →"}
                  </Button>
                </div>
              )}
            </>
          )}

          {step === STEP_BONUS && bonusQuestion && (
            <>
              <div className="mb-4 text-center text-purple-700 font-bold">
                🎉 Et maintenant... la question bonus !
              </div>
              <StepHeader
                step={STEP_BONUS}
                totalSteps={totalSteps}
                title={bonusQuestion.question}
                points={bonusQuestion.points}
                onBack={goBack}
              />
              <BonusQuestionStep bonusQuestion={bonusQuestion} value={bonusAnswer} onSelect={handleBonusSelect} />
              {bonusAnswer && (
                <div className="mt-4 text-right">
                  <Button size="sm" onClick={goNext}>Voir le récapitulatif →</Button>
                </div>
              )}
            </>
          )}

          {step === STEP_RECAP && (
            <>
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setStep(computePrevStep(STEP_RECAP))}
                  className="text-sm text-gray-500 font-semibold"
                >
                  ← Retour
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Récapitulatif</h1>
                <span />
              </div>

              <div className="space-y-3">
                <RecapRow label="Bottom" value={bottomQueens.join(" & ") || "-"} onEdit={() => setStep(STEP_BOTTOM)} />
                <RecapRow label="Éliminée" value={eliminee ?? "-"} onEdit={() => setStep(STEP_ELIMINEE)} />
                <RecapRow label="Top" value={topQueens.join(" & ") || "-"} onEdit={() => setStep(STEP_TOP)} />
                <RecapRow label="Gagnante" value={winner ?? "-"} onEdit={() => setStep(STEP_WINNER)} />
                <RecapRow label="Mini-défi" value={miniDefi ?? "-"} onEdit={() => setStep(STEP_MINI)} />
                <RecapRow label="Maxi-défi" value={maxiDefi ?? "-"} onEdit={() => setStep(STEP_MAXI)} />
                {bonusQuestion && (
                  <RecapRow
                    label={bonusQuestion.question}
                    value={bonusAnswer ?? "-"}
                    onEdit={() => setStep(STEP_BONUS)}
                  />
                )}
              </div>

              <div className="mt-8">
                <Button size="lg" onClick={savePronostics} disabled={saving}>
                  {saving ? "Enregistrement..." : "Valider mes pronostics"}
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
