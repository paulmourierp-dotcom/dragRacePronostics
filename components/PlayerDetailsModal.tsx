"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { PredictionData } from "@/types/prediction";
import { ResultData } from "@/types/result";
import { QueenData } from "@/types/gameData";
import { normalizeQueens } from "@/lib/queens";
import { activeQueensAtEpisode } from "@/lib/episodeRoster";
import PredictionBreakdown from "@/components/PredictionBreakdown";
import Button from "@/components/Button";
import Modal from "@/components/ui/Modal";
import Accordion from "@/components/ui/Accordion";

interface PlayerDetailsModalProps {
  uid: string;
  surnom: string;
  rank: number;
  onClose: () => void;
}

interface EpisodeEntry {
  episodeId: number;
  prediction: PredictionData | null;
  result: ResultData;
}

export default function PlayerDetailsModal({ uid, surnom, rank, onClose }: PlayerDetailsModalProps) {
  const [entries, setEntries] = useState<EpisodeEntry[]>([]);
  const [allQueens, setAllQueens] = useState<QueenData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // On part de tous les épisodes déjà résultés (pas des pronostics du joueur) : un
      // épisode scoré doit apparaître même si ce joueur n'a jamais pronostiqué dessus.
      const [resultsSnap, predsSnap, queensSnap] = await Promise.all([
        getDocs(collection(db, "results")),
        getDocs(query(collection(db, "predictions"), where("userId", "==", uid))),
        getDoc(doc(db, "game-data", "w5fjPTmVyX0HZb3oqFW9")),
      ]);

      const predictionByEpisode = new Map<number, PredictionData>();
      predsSnap.docs.forEach((d) => {
        const prediction = d.data() as PredictionData;
        predictionByEpisode.set(prediction.episodeId, prediction);
      });

      const scoredEntries = resultsSnap.docs
        .map((d) => d.data() as ResultData)
        .map((result) => ({
          episodeId: result.numero,
          prediction: predictionByEpisode.get(result.numero) ?? null,
          result,
        }))
        .sort((a, b) => b.episodeId - a.episodeId);

      setEntries(scoredEntries);
      setAllQueens(queensSnap.exists() ? normalizeQueens(queensSnap.data().queens || []) : []);
      setLoading(false);
    };

    fetchData();
  }, [uid]);

  const resultsHistory = entries.map((e) => e.result);

  return (
    <Modal onClose={onClose} maxWidth="lg">
      <h2 className="font-display text-xl font-bold text-ink">{surnom}</h2>
      <p className="text-ink-muted font-semibold mb-4">
        Classement : {rank > 0 ? `${rank}e position` : "Non classé"}
      </p>

      {loading ? (
        <p className="text-ink-muted">Chargement...</p>
      ) : entries.length === 0 ? (
        <p className="text-ink-muted">Aucun épisode résulté pour le moment.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {entries.map(({ episodeId, prediction, result }) => (
            <Accordion
              key={episodeId}
              title={`Épisode ${episodeId}`}
              subtitle={
                <span className="font-display text-sm font-extrabold text-brand bg-brand-tint px-3 py-1 rounded-pill">
                  {prediction?.pointsEarned ?? 0} pts
                </span>
              }
            >
              {prediction ? (
                <PredictionBreakdown
                  prediction={prediction}
                  result={result}
                  activeQueens={activeQueensAtEpisode(allQueens, resultsHistory, episodeId)}
                  showOfficial={false}
                />
              ) : (
                <p className="text-sm text-ink-muted">
                  Ce joueur n&apos;a pas effectué de pronostic dans le temps imparti.
                </p>
              )}
            </Accordion>
          ))}
        </div>
      )}

      <div className="flex justify-end mt-6">
        <Button onClick={onClose}>Fermer</Button>
      </div>
    </Modal>
  );
}
