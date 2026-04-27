"use client";

interface ProgressionLevelPanelProps {
  level: number;
  totalXp: number;
  xpInCurrentLevel: number;
  xpRequiredForNextLevel: number;
  xpRemainingForNextLevel: number;
}

export function ProgressionLevelPanel({
  level,
  totalXp,
  xpInCurrentLevel,
  xpRequiredForNextLevel,
  xpRemainingForNextLevel,
}: ProgressionLevelPanelProps) {
  const progress = xpRequiredForNextLevel > 0
    ? Math.min(100, Math.round((xpInCurrentLevel / xpRequiredForNextLevel) * 100))
    : 0;

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted/80">XP totali</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-foreground">
            {totalXp}
          </p>
        </div>
        <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1">
          <span className="text-sm font-medium text-emerald-200">Livello {level}</span>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>Prossimo livello</span>
          <span>{xpRemainingForNextLevel} XP rimanenti</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted">
          {xpInCurrentLevel} / {xpRequiredForNextLevel} XP nel livello attuale
        </p>
      </div>
    </section>
  );
}
