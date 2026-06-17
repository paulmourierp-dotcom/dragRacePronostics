"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
// import { doc, getDoc, orderBy } from "firebase/firestore";
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { UserData } from "@/types/user"; // Ajuste le chemin selon ton dossier

export default function DashboardPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const router = useRouter();
  const [allPlayers, setAllPlayers] = useState<UserData[]>([]);
  const [myRank, setMyRank] = useState<number>(0);

//   useEffect(() => {
//     const fetchUser = async () => {
//       const user = auth.currentUser;
//       if (user) {
//         const docSnap = await getDoc(doc(db, "users", user.uid));
//         if (docSnap.exists()) {
//             const data = docSnap.data() as UserData;
//             setUserData(data);
//             }
//         // if (docSnap.exists()) setUserData(docSnap.data());
//       }
//     };
//     fetchUser();
//   }, []);
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
        const players: UserData[] = [];
        querySnapshot.forEach((doc) => players.push(doc.data() as UserData));
        
        setAllPlayers(players);

        // 3. Calculer mon classement
        const rank = players.findIndex(p => p.surnom === myData?.surnom) + 1;
        setMyRank(rank);
        };
        fetchData();
    }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-white shadow-sm">
        <img src="/logo.png" alt="Logo" className="h-10" />
        <div className="flex gap-2">
          <button onClick={() => router.push("/regles")} className="p-2 text-sm text-gray-600">Règles</button>
          {userData?.role === "admin" && (
            <button onClick={() => router.push("/admin")} className="bg-red-500 text-white px-3 py-1 rounded text-gray-900">Admin</button>
          )}
          <button onClick={() => signOut(auth)} className="bg-gray-200 px-3 py-1 rounded text-gray-900">
            Déconnexion
          </button>
        </div>
      </header>

      {/* Bienvenue */}
      <h1 className="text-3xl font-bold p-6 text-gray-900">Bienvenue {userData?.surnom || "Queen"} !</h1>

      {/* Colonnes */}
      <div className="grid md:grid-cols-2 gap-6 p-6">
      {/* Colonne Gauche : Stats & Classement */}
        <section className="space-y-6">
            <div className="bg-white p-6 rounded shadow border border-gray-200">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Tes Statistiques</h2>
            <p className="text-gray-800">Score total : {userData?.score || 0} points</p>
            <p className="text-gray-800 font-semibold">Classement : {userData?.score === 0 ? "Non classé" : `${myRank}e position`}</p>
            </div>

            {/* Podium */}
            <div className="bg-white p-6 rounded shadow border border-gray-200">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Podium</h2>
            <div className="flex justify-around items-end mb-8">
                {allPlayers.slice(0, 3).map((player, index) => (
                <div key={index} className="text-center flex flex-col items-center">
                    {/* Ajout de la couronne pour le premier (index 0) */}
                    {index === 0 && <span className="text-3xl mb-1">👑</span>}
                    <div className="font-bold text-lg">{player.surnom}</div>
                    <div className="bg-purple-600 text-white px-4 py-2 rounded mt-1">
                    {(player.score ?? 0) > 0 ? `${player.score} pts` : "0 pts"}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">{index + 1}e place</div>
                </div>
                ))}
            </div>

            {/* Liste des autres avec classement */}
            <ul className="divide-y divide-gray-100">
                {allPlayers.slice(3).map((player, index) => (
                <li key={index + 3} className="py-2 flex justify-between">
                    <span className="font-medium">
                    <span className="text-gray-400 mr-3">{index + 4}e</span> 
                    {player.surnom}
                    </span>
                    <span className="font-bold">
                    {(player.score ?? 0) > 0 ? `${player.score} pts` : "-"}
                    </span>
                </li>
                ))}
            </ul>
            </div>
        </section>

        <section className="space-y-6">
          <div className="bg-purple-100 p-6 rounded shadow">
            <h2 className="font-bold text-gray-900">Saison 4 - Prochain Épisode</h2>
            <p>Diffusion : 20 Juin 2026</p>
          </div>
          <div className="bg-white p-6 rounded shadow text-center">
            <button 
              onClick={() => router.push("/pronostics")} 
              className="bg-purple-600 text-white w-full py-4 rounded font-bold text-gray-900"
            >
              Faire mes pronostics
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}