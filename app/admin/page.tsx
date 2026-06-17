"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { UserData } from "@/types/user";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [episodeNum, setEpisodeNum] = useState(1);
  const [dateDiffusion, setDateDiffusion] = useState("");
//   const [users, setUsers] = useState<any[]>([]);
//   const [users, setUsers] = useState<[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const router = useRouter();

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
          setDateDiffusion(configDoc.data().date);
        }
        
        // Charger la liste des joueurs
        const usersSnap = await getDocs(collection(db, "users"));
        const usersList: UserData[] = [];
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

  const handleUpdateEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "config", "next_episode"), {
        numero: episodeNum,
        date: dateDiffusion
      });
      alert("Épisode mis à jour !");
    } catch (err) {
      alert("Erreur lors de la mise à jour");
    }
  };

  if (loading) return <div className="p-10 text-white text-center">Chargement...</div>;
  if (!isAdmin) return null;

  return (
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
                  type="text" 
                  value={dateDiffusion}
                  onChange={(e) => setDateDiffusion(e.target.value)}
                  placeholder="Ex: 20 Juin 2026"
                  className="w-full p-3 rounded-xl border border-gray-200 text-gray-900"
                />
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

        </div>
      </div>
    </div>
  );
}

// **N'oublie pas** de créer manuellement un document `next_episode` dans une collection `config` sur Firebase pour que le formulaire puisse lire les données au départ.