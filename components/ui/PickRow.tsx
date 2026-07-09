"use client";
import Button from "@/components/Button";
import PickChip from "@/components/ui/PickChip";

interface PickRowProps {
  label: string;
  values: string[];
  onEdit?: () => void;
}

export default function PickRow({ label, values, onEdit }: PickRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap bg-surface rounded-card border border-surface-border p-4">
      <div className="flex-1 min-w-[140px]">
        <p className="text-xs text-ink-faint font-bold uppercase tracking-wide mb-1.5">{label}</p>
        <div className="flex flex-wrap gap-1.5">
          {values.length === 0 ? (
            <span className="text-sm text-ink-faint">—</span>
          ) : (
            values.map((value) => <PickChip key={value} label={value} />)
          )}
        </div>
      </div>
      {onEdit && (
        <Button size="sm" variant="secondary" onClick={onEdit}>
          Modifier
        </Button>
      )}
    </div>
  );
}
