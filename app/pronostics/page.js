'use client';
import { useState } from 'react';

export default function PronosticsPage() {
  const [step, setStep] = useState(1); // 1 = Mini/Maxi, 2 = Queens
  const [data, setData] = useState({ mini: '', maxi: '', queens: {} });

  return (
    <main className="p-8">
      {step === 1 ? (
        <div>
          <h1>Étape 1 : Défis</h1>
          {/* Inputs pour mini et maxi défi */}
          <button onClick={() => setStep(2)}>Suivant</button>
        </div>
      ) : (
        <div>
          <h1>Étape 2 : Pronostics Queens</h1>
          {/* Tableau avec les queens */}
          <button onClick={() => saveToFirebase(data)}>Envoyer mes pronos</button>
        </div>
      )}
    </main>
  );
}