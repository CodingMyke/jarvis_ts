import type { ReelGenerationTargetField } from "../lib/reel-generation.types";
import type { ReelRow } from "../lib/reel-board.types";

function formatNullableText(value: string | null): string {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : "(missing)";
}

export function buildReelGenerationPrompt(input: {
  reel: ReelRow;
  targetFields: ReelGenerationTargetField[];
  editorialContext: string | null;
}): string {
  const { reel, targetFields, editorialContext } = input;

  const contextText = editorialContext?.trim()
    ? `Editorial context:\n${editorialContext.trim()}\n\n`
    : "";

  return [
    "You are generating missing fields for an Instagram reel draft.",
    "Return only the requested fields. Keep output concise and ready to paste.",
    "Rules:",
    "- Keep all fields as plain text.",
    "- For hashtags, return a single string with hashtags separated by spaces (e.g. \"#a #b\").",
    "- Never include markdown fences or JSON in the text fields.",
    "",
    `Target fields: ${targetFields.join(", ")}`,
    "",
    contextText.trimEnd(),
    "Reel:",
    `Idea: ${formatNullableText(reel.idea)}`,
    `Title: ${formatNullableText(reel.title)}`,
    `Caption: ${formatNullableText(reel.caption)}`,
    `Body: ${formatNullableText(reel.body)}`,
    `Hashtags: ${formatNullableText(reel.hashtags)}`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

