"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/Header";
import LoadingScreen from "@/components/LoadingScreen";
import Button from "@/components/Button";
import Card from "@/components/ui/Card";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, setDoc, Timestamp } from "firebase/firestore";
import { UserData } from "@/types/user";
import { QueenData } from "@/types/gameData";
import { ResultData } from "@/types/result";
import { QueenRatingData } from "@/types/rating";
import { normalizeQueens, queenImageUrl } from "@/lib/queens";
import { activeQueensAtEpisode } from "@/lib/episodeRoster";
import { useToast } from "@/contexts/ToastContext";

const DEFAULT_VALUE = 5;

export default function NotationPage() {
  const params = useParams<{ episode: string }>();
  const episodeNum = Number(params.episode);
  const router = useRouter();
  const showToast = useToast();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [episodeResult, setEpisodeResult] = useState<ResultData | null>(null);
  const [activeQueens, setActiveQueens] = useState<string[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const [userDoc, resultSnap, queensSnap, resultsSnap] = await Promise.all([
          getDoc(doc(db, "users", user.uid)),
          getDoc(doc(db, "results", String(episodeNum))),
          getDoc(doc(db, "game-data", "w5fjPTmVyX0HZb3oqFW9")),
          getDocs(collection(db, "results")),
        ]);

        const myData = userDoc.data();
        setUserData(myData ? (myData as UserData) : null);

        if (resultSnap.exists()) {
          const result = resultSnap.data() as ResultData;
          setEpisodeResult(result);

          const allQueens: QueenData[] = queensSnap.exists()
            ? normalizeQueens(queensSnap.data().queens || [])
            : [];
          const resultsHistory = resultsSnap.docs.map((d) => d.data() as ResultData);
          const roster = activeQueensAtEpisode(allQueens, resultsHistory, episodeNum);
          setActiveQueens(roster);

          // Isolé dans son propre try/catch : une erreur ici (ex. règle Firestore queenRatings pas
          // encore déployée) ne doit pas empêcher le formulaire de s'afficher — au pire, il se
          // pré-remplit avec la valeur neutre par défaut plutôt que la notation déjà enregistrée.
          let existing: Record<string, number> = {};
          try {
            const existingRatingSnap = await getDoc(doc(db, "queenRatings", `${user.uid}_ep${episodeNum}`));
            existing = existingRatingSnap.exists()
              ? (existingRatingSnap.data() as QueenRatingData).ratings
              : {};
          } catch (error) {
            console.error("Erreur lors du chargement de la notation existante :", error);
          }

          const initial: Record<string, number> = {};
          roster.forEach((q) => {
            initial[q] = existing[q] ?? DEFAULT_VALUE;
          });
          setRatings(initial);
        }
      } catch (error) {
        console.error("Erreur :", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [episodeNum]);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);
    try {
      await setDoc(
        doc(db, "queenRatings", `${user.uid}_ep${episodeNum}`),
        {
          userId: user.uid,
          episodeId: episodeNum,
          ratings,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
      showToast("Notes enregistrées !", "success");
      router.push("/dashboard");
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
        <LoadingScreen message="On prépare les fiches de notation..." />
      </AuthGuard>
    );
  }

  if (!episodeResult) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-page">
          <Header isAdmin={userData?.role === "admin"} />
          <div className="p-10 text-center text-ink-muted">
            Cette notation n&apos;est pas encore disponible : l&apos;épisode {episodeNum} n&apos;a pas
            encore de résultats publiés.
          </div>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-page">
        <Header isAdmin={userData?.role === "admin"} />

        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-9 pb-20">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm font-bold text-brand mb-4 block"
          >
            ← Retour
          </button>

          <div className="text-xs font-bold uppercase tracking-wide text-brand mb-1.5">
            Ton avis compte
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink mb-1.5">
            Note les Queens — Épisode {episodeNum}
          </h1>
          <p className="text-ink-soft mb-7">
            Attribue une note sur 10 à chaque queen pour sa prestation de l&apos;épisode.
          </p>

          <div className="flex flex-col gap-3.5">
            {activeQueens.map((queen) => (
              <Card key={queen} className="p-4 flex items-center gap-4 flex-wrap">
                <div className="relative w-14 h-14 rounded-tile overflow-hidden flex-none">
                  <Image src={queenImageUrl(queen)} alt={queen} fill sizes="56px" className="object-cover" />
                </div>
                <div className="font-display font-bold text-ink min-w-[140px]">{queen}</div>
                <div className="flex-1 min-w-[200px] flex items-center gap-3.5">
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={ratings[queen] ?? DEFAULT_VALUE}
                    onChange={(e) =>
                      setRatings((prev) => ({ ...prev, [queen]: Number(e.target.value) }))
                    }
                    className="flex-1 accent-brand"
                  />
                  <div className="w-11 text-center font-display font-extrabold text-xl text-brand">
                    {ratings[queen] ?? DEFAULT_VALUE}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement..." : "Valider mes notes →"}
            </Button>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
