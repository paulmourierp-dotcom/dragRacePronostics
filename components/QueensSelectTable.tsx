"use client";
import { useState } from "react";
import Image from "next/image";

export type QueenChoice = "top" | "bottom" | "safe";

interface QueensSelectTableProps {
  queens: string[];
  values: Record<string, QueenChoice>;
  onChange: (queen: string, value: QueenChoice) => void;
  showImages?: boolean;
}

export default function QueensSelectTable({ queens, values, onChange, showImages = false }: QueensSelectTableProps) {
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  // On ne compte que les valeurs des Queens actuellement affichées : une Queen retirée
  // de la liste (ex. éliminée puis exclue du tableau) ne doit plus bloquer les sélections.
  const relevantValues = queens.map((queen) => values[queen]).filter(Boolean);
  const topCount = relevantValues.filter((v) => v === "top").length;
  const bottomCount = relevantValues.filter((v) => v === "bottom").length;

  const isOptionDisabled = (queen: string, option: "top" | "bottom") => {
    const count = option === "top" ? topCount : bottomCount;
    return count >= 2 && values[queen] !== option;
  };

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <table className="w-full text-center">
        <thead>
          <tr>
            {queens.map((queen) => (
              <th key={queen} className="p-2 text-gray-900 font-bold border-b border-gray-100">
                <div className="flex flex-col items-center gap-2">
                  <span>{queen}</span>
                  {showImages && !brokenImages.has(queen) && (
                    <div className="relative w-16 h-16 rounded overflow-hidden bg-gray-100">
                      <Image
                        src={`/${encodeURIComponent(queen.replace(/\s+/g, ""))}.jpeg`}
                        alt={queen}
                        fill
                        sizes="64px"
                        className="object-cover"
                        onError={() => setBrokenImages((prev) => new Set(prev).add(queen))}
                      />
                    </div>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {queens.map((queen) => (
              <td key={queen} className="p-2">
                <select
                  value={values[queen] || "safe"}
                  onChange={(e) => onChange(queen, e.target.value as QueenChoice)}
                  className="border border-gray-200 rounded p-1 text-gray-900"
                >
                  <option value="safe">Safe</option>
                  <option value="top" disabled={isOptionDisabled(queen, "top")}>Top</option>
                  <option value="bottom" disabled={isOptionDisabled(queen, "bottom")}>Bottom</option>
                </select>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
