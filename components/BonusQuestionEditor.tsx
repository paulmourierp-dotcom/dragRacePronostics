"use client";
import { useState } from "react";
import { BonusQuestion, BonusQuestionType } from "@/types/bonus";
import { QueenData } from "@/types/gameData";
import Button from "@/components/Button";

interface BonusQuestionEditorProps {
  episodeNum: number;
  initial: BonusQuestion | null;
  queensList: QueenData[];
  onSave: (question: BonusQuestion) => Promise<void> | void;
  onRemove: () => Promise<void> | void;
}

const DEFAULT_POINTS = 10;

// Le parent doit monter ce composant avec `key={<numéro d'épisode confirmé>}` : ça réinitialise
// proprement le formulaire au changement d'épisode, sans passer par un useEffect + setState.
export default function BonusQuestionEditor({ episodeNum, initial, queensList, onSave, onRemove }: BonusQuestionEditorProps) {
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [type, setType] = useState<BonusQuestionType>(initial?.type ?? "queens");
  const [queensOptions, setQueensOptions] = useState<string[]>(initial?.queensOptions ?? []);
  const [options, setOptions] = useState<string[]>(
    initial?.options?.filter((o) => o !== "Aucune").length ? initial!.options!.filter((o) => o !== "Aucune") : [""]
  );
  const [points, setPoints] = useState(initial?.points ?? DEFAULT_POINTS);
  const [saving, setSaving] = useState(false);

  const toggleQueen = (name: string) => {
    setQueensOptions((prev) => (prev.includes(name) ? prev.filter((q) => q !== name) : [...prev, name]));
  };

  const handleOptionChange = (index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };
  const handleAddOption = () => setOptions((prev) => [...prev, ""]);
  const handleRemoveOption = (index: number) => setOptions((prev) => prev.filter((_, i) => i !== index));

  const isValid =
    question.trim() !== "" &&
    (type !== "queens" || queensOptions.length > 0) &&
    (type !== "options" || options.some((o) => o.trim() !== ""));

  const handleSave = async () => {
    if (!isValid) return;

    const cleaned: BonusQuestion = {
      question: question.trim(),
      type,
      points,
      ...(type === "queens" ? { queensOptions } : {}),
      ...(type === "options" ? { options: [...options.map((o) => o.trim()).filter(Boolean), "Aucune"] } : {}),
    };

    setSaving(true);
    try {
      await onSave(cleaned);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white/95 p-8 rounded-[15px] shadow-lg md:col-span-2">
      <h2 className="text-2xl font-bold text-gray-950 mb-2">Question bonus de l&apos;épisode {episodeNum}</h2>
      <p className="text-xs text-gray-500 mb-4">
        Une question additionnelle, posée en dernière étape du formulaire de pronostics. Si aucune question
        n&apos;est définie, cette étape est simplement ignorée côté joueurs. Modifiable jusqu&apos;à la saisie
        des résultats de cet épisode.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Intitulé de la question</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ex : Quelle Queen sera réintégrée dans le jeu ?"
            className="w-full p-3 rounded-xl border border-gray-200 text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Type de réponse</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as BonusQuestionType)}
            className="w-full p-3 rounded-xl border border-gray-200 text-gray-900"
          >
            <option value="queens">Les Queens</option>
            <option value="options">Options définies</option>
            <option value="texte">Texte libre</option>
          </select>
        </div>

        {type === "queens" && (
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              <button
                type="button"
                onClick={() => setQueensOptions(queensList.map((q) => q.name))}
                className="text-xs px-3 py-1 rounded border border-gray-200 text-gray-700 font-semibold"
              >
                Tout sélectionner
              </button>
              <button
                type="button"
                onClick={() => setQueensOptions([])}
                className="text-xs px-3 py-1 rounded border border-gray-200 text-gray-700 font-semibold"
              >
                Tout désélectionner
              </button>
              <button
                type="button"
                onClick={() => setQueensOptions(queensList.filter((q) => !q.eliminee).map((q) => q.name))}
                className="text-xs px-3 py-1 rounded border border-gray-200 text-gray-700 font-semibold"
              >
                Sélectionner les restantes
              </button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border border-gray-100 rounded-xl">
              {queensList.map((q) => (
                <label
                  key={q.name}
                  className={`flex items-center gap-1 text-sm px-2 py-1 rounded-lg border cursor-pointer ${
                    queensOptions.includes(q.name)
                      ? "border-purple-600 bg-purple-50 text-purple-700"
                      : "border-gray-200 text-gray-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="w-3 h-3"
                    checked={queensOptions.includes(q.name)}
                    onChange={() => toggleQueen(q.name)}
                  />
                  {q.name}
                  {q.eliminee ? " (éliminée)" : ""}
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">L&apos;option &quot;Aucune&quot; est ajoutée automatiquement.</p>
          </div>
        )}

        {type === "options" && (
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1 p-2 rounded-lg border border-gray-200 text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveOption(index)}
                  className="text-red-600 font-bold px-2"
                  title="Retirer"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddOption}
              className="text-sm px-3 py-1 rounded border border-gray-200 text-gray-700 font-semibold"
            >
              + Ajouter une option
            </button>
            <p className="text-xs text-gray-500 mt-1">L&apos;option &quot;Aucune&quot; est ajoutée automatiquement.</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Points si bien pronostiquée</label>
          <input
            type="number"
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            className="w-full p-3 rounded-xl border border-gray-200 text-gray-900"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving || !isValid} size="lg">
            {saving ? "Enregistrement..." : initial ? "Mettre à jour la question bonus" : "Créer la question bonus"}
          </Button>
          {initial && (
            <Button variant="secondary" size="lg" onClick={onRemove} disabled={saving}>
              Retirer
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
