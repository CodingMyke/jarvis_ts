import { describe, expect, it } from "vitest";
import {
  getLevelFromTotalXp,
  getLevelProgress,
  getXpRequiredForNextLevel,
} from "./progression-leveling";

describe("progression leveling", () => {
  it("keeps level 1 at zero XP", () => {
    expect(getLevelFromTotalXp(0)).toBe(1);
    expect(getLevelProgress(0)).toEqual({
      level: 1,
      totalXp: 0,
      xpInCurrentLevel: 0,
      xpRequiredForNextLevel: 10,
      xpRemainingForNextLevel: 10,
    });
  });

  it("reaches level 2 after 10 total XP", () => {
    expect(getXpRequiredForNextLevel(1)).toBe(10);
    expect(getLevelFromTotalXp(10)).toBe(2);
    expect(getLevelProgress(10)).toMatchObject({
      level: 2,
      xpInCurrentLevel: 0,
      xpRequiredForNextLevel: 28,
      xpRemainingForNextLevel: 28,
    });
  });

  it("reaches level 3 after 38 total XP", () => {
    expect(getXpRequiredForNextLevel(2)).toBe(28);
    expect(getLevelFromTotalXp(38)).toBe(3);
    expect(getLevelProgress(37)).toMatchObject({
      level: 2,
      xpInCurrentLevel: 27,
      xpRemainingForNextLevel: 1,
    });
  });

  it("treats negative XP input as zero", () => {
    expect(getLevelFromTotalXp(-20)).toBe(1);
    expect(getLevelProgress(-20)).toMatchObject({
      level: 1,
      totalXp: 0,
      xpInCurrentLevel: 0,
    });
  });
});
