"use client";
import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Données fictives - Plus tard, tu les chargeras depuis Firestore
const QUEENS = ["Ruby", "Saphir", "Emeraude", "Diamant"];
const CHOIX_POSSIBLES = ["bottom", "éliminée", "safe", "top", "gagnante"];

export default function PronosticsPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    miniDefi: "",
    maxiDefi: "",
    queensResults: {},
  });

  const handleQueenChange = (queen, value) => {
    setFormData((prev) => ({
      ...prev,
      queensResults: { ...prev.queensResults, [queen]: value },
    }));
  };

  const savePronostics = async () => {
    const user = getAuth().currentUser;
    if (!user) return;

    try {
      await setDoc(doc(db, "predictions", `${user.uid}_ep1`), {
        ...formData,
        userId: user.uid,
        episodeId: 1,
        createdAt: new Date(),
      });
      alert("Pronostics envoyés !");
    } catch (e) {
      console.error("Erreur:", e);
    }
  };

  return (
    <AuthGuard>
      <main className="p-8 max-w-2xl mx-auto">
        {step === 1 ? (
          <div className="space-y-4">
            <h1 className="text-xl font-bold">Étape 1 : Défis</h1>
            <input placeholder="Vainqueur Mini Défi" className="w-full border p-2" onChange={(e) => setFormData({...formData, miniDefi: e.target.value})} />
            <input placeholder="Vainqueur Maxi Défi" className="w-full border p-2" onChange={(e) => setFormData({...formData, maxiDefi: e.target.value})} />
            <button className="bg-purple-600 text-white p-2 w-full" onClick={() => setStep(2)}>Suivant</button>
          </div>
        ) : (
          <div className="space-y-4">
            <h1 className="text-xl font-bold">Étape 2 : Pronostics Queens</h1>
            <table className="w-full text-left">
              <thead><tr><th>Queen</th><th>Résultat</th></tr></thead>
              <tbody>
                {QUEENS.map((queen) => (
                  <tr key={queen}>
                    <td className="py-2">{queen}</td>
                    <td>
                      <select onChange={(e) => handleQueenChange(queen, e.target.value)} className="border p-1">
                        <option value="">Sélectionner...</option>
                        {CHOIX_POSSIBLES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex gap-2">
              <button className="bg-gray-400 text-white p-2 flex-1" onClick={() => setStep(1)}>Retour</button>
              <button className="bg-green-600 text-white p-2 flex-1" onClick={savePronostics}>Envoyer tout</button>
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}