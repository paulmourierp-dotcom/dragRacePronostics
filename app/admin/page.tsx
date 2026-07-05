"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, arrayUnion, Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { UserData } from "@/types/user";
import { CrownResultData } from "@/types/crown";
import { QueenData } from "@/types/gameData";
import { normalizeQueens } from "@/lib/queens";
import Header from "@/components/Header";

const pad = (n: number) => String(n).padStart(2, "0");

// Formate un Timestamp Firestore pour la valeur d'un <input type="datetime-local">
const toDatetimeLocalValue = (timestamp: Timestamp) => {
  const d = timestamp.toDate();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
//   const [users, setUsers] = useState<any[]>([]);
//   const [users, setUsers] = useState<[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const router = useRouter();

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
        if (configDoc.exists()) {
          setEpisodeNum(configDoc.data().numero);
          const ts = configDoc.data().dateDiffusion as Timestamp | undefined;
          if (ts) setDateDiffusion(toDatetimeLocalValue(ts));
        }
        
        // Charger la liste des joueurs
        const usersSnap = await getDocs(collection(db, "users"));
        const usersList: UserData[] = [];
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
        }
        // usersSnap.forEach(doc => usersList.push({ id: doc.id, ...doc.data() } as UserData));
        usersSnap.forEach((doc) => {
            const data = doc.data(); // Récupère les données brutes
            
            // On construit l'objet en mappant explicitement les champs
            // Cela permet de garantir que 'UserData' est bien rempli
            usersList.push({
                surnom: data.surnom || "Anonyme",
                email: data.email,
                score: data.score ?? 0,
                role: data.role || "user",
                // Ajoute ici les autres champs présents dans ton interface UserData
            } as UserData);
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
      const payload: { locked: boolean; winner?: string; publishedAt?: Timestamp } = {
        locked: crownLocked,
      };
      // On ne renseigne winner/publishedAt que si une gagnante a été choisie,
      // pour ne pas écraser la date de publication en ne faisant que verrouiller.
      if (crownWinner) {
        payload.winner = crownWinner;
        payload.publishedAt = Timestamp.now();
      }

      await setDoc(doc(db, "config", "crown_result"), payload, { merge: true });
      alert("Informations de la couronne enregistrées !");
    } catch (error) {
      console.error("Erreur :", error);
      alert("Erreur lors de la sauvegarde.");
    }
  };

  const handleUpdateEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "config", "next_episode"), {
        numero: episodeNum,
        dateDiffusion: Timestamp.fromDate(new Date(dateDiffusion))
      });
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
                      <th className="py-2 text-gray-500 font-bold uppercase text-xs text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map(u => (
                      <tr key={u.email}>
                        <td className="py-3 text-gray-900 font-medium">{u.surnom}</td>
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

          </div>
        </div>
      </div>
    </>
  );
}

// **N'oublie pas** de créer manuellement un document `next_episode` dans une collection `config` sur Firebase pour que le formulaire puisse lire les données au départ.