"use client";
import { useState } from "react";
import Image from "next/image";
import { queenImageUrl } from "@/lib/queens";

interface QueenGridProps {
  queens: string[];
  selected: string[];
  max: number;
  disabledTags?: Record<string, string>;
  onChange: (next: string[]) => void;
}

export default function QueenGrid({ queens, selected, max, disabledTags, onChange }: QueenGridProps) {
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  const handleClick = (queen: string) => {
    if (disabledTags?.[queen]) return;

    let next: string[];
    if (selected.includes(queen)) {
      next = selected.filter((q) => q !== queen);
    } else if (selected.length < max) {
      next = [...selected, queen];
    } else if (max === 1) {
      next = [queen];
    } else {
      return;
    }
    onChange(next);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {queens.map((queen) => {
        const isSelected = selected.includes(queen);
        const tag = disabledTags?.[queen];
        const isDisabled = Boolean(tag);

        return (
          <button
            key={queen}
            type="button"
            onClick={() => handleClick(queen)}
            disabled={isDisabled}
            className={`relative aspect-square rounded-tile overflow-hidden border-4 transition ${
              isSelected ? "border-brand" : "border-transparent"
            } ${isDisabled ? "opacity-40 grayscale cursor-not-allowed" : "bg-page"}`}
          >
            {!brokenImages.has(queen) ? (
              <Image
                src={queenImageUrl(queen)}
                alt={queen}
                fill
                sizes="(max-width: 640px) 45vw, 200px"
                className="object-cover"
                onError={() => setBrokenImages((prev) => new Set(prev).add(queen))}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-brand-tint text-brand text-3xl font-display font-bold">
                {queen.charAt(0)}
              </div>
            )}

            <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-xs sm:text-sm font-bold text-center py-1.5 px-1">
              {queen}
            </div>

            {isSelected && (
              <span className="absolute top-1.5 right-1.5 bg-brand text-white rounded-full w-6 h-6 flex items-center justify-center text-sm shadow">
                ✓
              </span>
            )}

            {tag && (
              <span className="absolute top-1.5 left-1.5 bg-ink/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-pill uppercase tracking-wide">
                {tag}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
