"use client";

import AuthGuard from "@/components/AuthGuard";
import Header from '@/components/Header';
import { auth, db } from '@/lib/firebase';
import { UserData } from '@/types/user';
import { doc, getDoc } from '@firebase/firestore';
import React, { useEffect, useState } from 'react';

const ReglesPage = () => {
  const [userData, setUserData] = useState<UserData | null>(null);

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
        };

        fetchData();
    }, []);

  return (
    <AuthGuard>
      <main className="bg-gray-50">
        <Header isAdmin={userData?.role === "admin"} />
        <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-4xl font-extrabold text-gray-950 mb-8">Règles du Jeu</h1>
        
        <div className="bg-white p-8 rounded-[20px] shadow-sm border border-gray-100 space-y-8">
          
          <section>
            <h2 className="text-2xl font-bold text-purple-700 mb-4">1. Le principe</h2>
            <p className="text-gray-700 leading-relaxed">
              Chaque semaine, à l&apos;approche du nouvel épisode de Drag Race France, tu es invité à faire tes pronostics. 
              L&apos;objectif est de prédire le déroulement de l&apos;épisode pour cumuler un maximum de points.
              NE PAS oublier de pronostiquer chaque semaine, sinon tu ne pourras pas cumuler de points pour l&apos;épisode en question.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
            Avant le premier épisode, tu vas devoir choisir la queen qui, selon toi, remportera la saison ! (Une fois le premier épisode diffusé, tu ne pourras plus changer ton choix).
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              Le meilleur pronostiqueur remportera le titre de <span className="font-bold text-purple-600">Grand(e) Pronostiqueur(se)</span> de la saison et un cadeau surprise !
            </p>
          </section>

            <section>
              <h2 className="text-2xl font-bold text-purple-700 mb-4">2. Les pronostics</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-2">
                <li>Tu peux pronostiquer jusqu&apos;à la date limite indiquée sur ton Dashboard.</li>
                <li>Une fois la date passée, les pronostics sont verrouillés.</li>
                <li>Chaque catégorie de points (Mini-défi, Maxi-défi, Runway) a un barème spécifique.</li>
                <li>Les résultats sont calculés à la fin de chaque épisode et sont saisis par les administrateurs.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-purple-700 mb-4">3. Calcul des points</h2>
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <p className="font-semibold text-gray-800 mb-2">Exemple de barème :</p>
                <ul className="text-gray-700 space-y-1">
                  <li>• Mini-défi trouvé : <span className="font-bold text-purple-600">10 pts</span></li>
                  <li>• Maxi-défi trouvé : <span className="font-bold text-purple-600">10 pts</span></li>
                  <li>• Top trouvé : <span className="font-bold text-purple-600">5 pts</span></li>
                  <li>• Bottom trouvé : <span className="font-bold text-purple-600">5 pts</span></li>
                  <li>• Safe trouvé : <span className="font-bold text-purple-600">2 pts</span></li>
                  <li>• Gagnante de l&apos;épisode : <span className="font-bold text-purple-600">10 pts</span></li>
                  <li>• Perdante de l&apos;épisode : <span className="font-bold text-purple-600">10 pts</span></li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-purple-700 mb-4">4. Fair-play</h2>
              <p className="text-gray-700 italic">
                &quot;Don&apos;t fuck it up !&quot; Le jeu est basé sur la bonne humeur et le partage de la passion pour le drag. 
                Toute tentative de triche entraînera une disqualification immédiate.
              </p>
            </section>

          </div>
        </div>
      </main>
    </AuthGuard>
  );
};

export default ReglesPage;