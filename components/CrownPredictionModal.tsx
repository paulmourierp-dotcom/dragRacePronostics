"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { CrownPredictionData } from "@/types/crown";

interface CrownPredictionModalProps {
  queens: string[];
  onClose: () => void;
}

export default function CrownPredictionModal({ queens, onClose }: CrownPredictionModalProps) {
  const [queenPredicted, setQueenPredicted] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchExisting = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const snap = await getDoc(doc(db, "crownPredictions", user.uid));
      if (snap.exists()) {
        setQueenPredicted((snap.data() as CrownPredictionData).queenPredicted);
      }
      setLoading(false);
    };

    fetchExisting();
  }, []);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user || !queenPredicted) return;

    setSaving(true);
    try {
      await setDoc(doc(db, "crownPredictions", user.uid), {
        userId: user.uid,
        queenPredicted,
        createdAt: Timestamp.now(),
      });
      alert("Pronostic enregistré !");
      onClose();
    } catch (error) {
      console.error("Erreur :", error);
      alert("Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Qui gagnera la couronne cette saison ?</h2>

        {loading ? (
          <p className="text-gray-500 mb-4">Chargement...</p>
        ) : (
          <select
            value={queenPredicted}
            onChange={(e) => setQueenPredicted(e.target.value)}
            className="w-full border border-gray-200 rounded p-2 text-gray-900 mb-4"
          >
            <option value="">-- Choisis une Queen --</option>
            {queens.map((queen) => (
              <option key={queen} value={queen}>{queen}</option>
            ))}
          </select>
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-gray-700 font-bold">
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading || !queenPredicted}
            className="bg-purple-600 text-white font-bold px-4 py-2 rounded-xl disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
}
