"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { UserData } from "@/types/user"; // Ajuste le chemin selon ton dossier

export default function DashboardPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (user) {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
            const data = docSnap.data() as UserData;
            setUserData(data);
            }
        // if (docSnap.exists()) setUserData(docSnap.data());
      }
    };
    fetchUser();
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
        <section className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Tes Statistiques</h2>
          <p>Score total : {userData?.score || 0} points</p>
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