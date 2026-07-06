"use client";
import { useState } from "react";

interface NextEpisodeModalProps {
  defaultNumero: number;
  defaultDate: string;
  onConfirm: (numero: number, date: string) => Promise<void> | void;
  onClose: () => void;
}

export default function NextEpisodeModal({ defaultNumero, defaultDate, onConfirm, onClose }: NextEpisodeModalProps) {
  const [numero, setNumero] = useState(defaultNumero);
  const [date, setDate] = useState(defaultDate);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(numero, date);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Préparer le prochain épisode</h2>
        <p className="text-sm text-gray-500 mb-4">
          Les résultats viennent d&apos;être enregistrés. Tu peux enchaîner sur le prochain épisode
          ici, ou le faire plus tard depuis la section &quot;Prochain Épisode&quot;.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Numéro épisode</label>
            <input
              type="number"
              value={numero}
              onChange={(e) => setNumero(Number(e.target.value))}
              className="w-full p-3 rounded-xl border border-gray-200 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Date de diffusion</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-200 text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">
              Pré-remplie à +7 jours par défaut (finale, rediffusion... modifie librement).
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-gray-700 font-bold">
            Plus tard
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || !date}
            className="bg-purple-600 text-white font-bold px-4 py-2 rounded-xl disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
