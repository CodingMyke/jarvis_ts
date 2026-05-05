import type { ProgressionLevelProgress } from "./progression.types";

function normalizeTotalXp(totalXp: number): number {
  if (!Number.isFinite(totalXp)) {
    return 0;
  }

  return Math.max(Math.floor(totalXp), 0);
}

function normalizeLevel(level: number): number {
  if (!Number.isFinite(level)) {
    return 1;
  }

  return Math.max(Math.floor(level), 1);
}

export function getXpRequiredForNextLevel(level: number): number {
  return Math.round(10 * normalizeLevel(level) ** 1.5);
}

export function getLevelFromTotalXp(totalXp: number): number {
  let level = 1;
  let remainingXp = normalizeTotalXp(totalXp);

  while (remainingXp >= getXpRequiredForNextLevel(level)) {
    remainingXp -= getXpRequiredForNextLevel(level);
    level += 1;
  }

  return level;
}

export function getLevelProgress(totalXp: number): ProgressionLevelProgress {
  const normalizedTotalXp = normalizeTotalXp(totalXp);
  let level = 1;
  let xpInCurrentLevel = normalizedTotalXp;
  let xpRequiredForNextLevel = getXpRequiredForNextLevel(level);

  while (xpInCurrentLevel >= xpRequiredForNextLevel) {
    xpInCurrentLevel -= xpRequiredForNextLevel;
    level += 1;
    xpRequiredForNextLevel = getXpRequiredForNextLevel(level);
  }

  return {
    level,
    totalXp: normalizedTotalXp,
    xpInCurrentLevel,
    xpRequiredForNextLevel,
    xpRemainingForNextLevel: xpRequiredForNextLevel - xpInCurrentLevel,
  };
}
