"use client";

import Header from '@/components/Header';
import { UserData } from '@/types/user';
import React, { useState } from 'react';

const ReglesPage = () => {
  const [userData] = useState<UserData | null>(null);

  return (
    <main className="min-h-screen bg-gray-50">
    <Header isAdmin={userData?.role === "admin"} />
      <h1 className="text-4xl font-extrabold text-gray-950 mb-8">Règles du Jeu</h1>
      
      <div className="bg-white p-8 rounded-[20px] shadow-sm border border-gray-100 space-y-8">
        
        <section>
          <h2 className="text-2xl font-bold text-purple-700 mb-4">1. Le principe</h2>
          <p className="text-gray-700 leading-relaxed">
            Chaque semaine, à l&apos;approche du nouvel épisode de Drag Race France, tu es invité à faire tes pronostics. 
            L&apos;objectif est de prédire le déroulement de l\&apos;épisode pour cumuler un maximum de points.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-purple-700 mb-4">2. Les pronostics</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-2">
            <li>Tu peux pronostiquer jusqu&apos;à la date limite indiquée sur ton Dashboard.</li>
            <li>Une fois la date passée, les pronostics sont verrouillés.</li>
            <li>Chaque catégorie de points (Mini-défi, Maxi-défi, Runway) a un barème spécifique.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-purple-700 mb-4">3. Calcul des points</h2>
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <p className="font-semibold text-gray-800 mb-2">Exemple de barème :</p>
            <ul className="text-gray-700 space-y-1">
              <li>• Bonne Queen pour le Mini-défi : <span className="font-bold text-purple-600">5 pts</span></li>
              <li>• Bonne Queen pour le Maxi-défi : <span className="font-bold text-purple-600">10 pts</span></li>
              <li>• Top / Bottom : <span className="font-bold text-purple-600">5 pts</span></li>
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
    </main>
  );
};

export default ReglesPage;