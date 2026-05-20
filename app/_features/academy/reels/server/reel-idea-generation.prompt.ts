interface PublishedReelContext {
  idea: string;
  title?: string | null;
  caption?: string | null;
  body?: string | null;
  hashtags?: string | null;
  notes?: string | null;
  published_at?: string | null;
  origin?: string | null;
}

interface SemanticMemoryContext {
  content: string;
  created_at?: string;
  updated_at?: string;
  key?: string | null;
  importance?: string | null;
}

interface EpisodicMemoryContext {
  content: string;
  created_at?: string;
  importance?: string | null;
}

interface RejectedIdeaContext {
  idea: string;
  title?: string | null;
  notes?: string | null;
  rejected_at?: string;
  origin?: string | null;
}

export interface BuildReelIdeaGenerationPromptInput {
  ideaGenerationContext: string | null;
  ideasPerRun: number;
  latestPublishedReels: PublishedReelContext[];
  semanticMemories: SemanticMemoryContext[];
  episodicMemories: EpisodicMemoryContext[];
  rejectedIdeas: RejectedIdeaContext[];
}

function formatText(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : "(none)";
}

function formatPublishedSection(reels: PublishedReelContext[]): string {
  if (reels.length === 0) {
    return "Latest published reels:\n- (none)";
  }

  return [
    "Latest published reels:",
    ...reels.map((reel, index) =>
      [
        `- Reel ${index + 1}:`,
        `  Idea: ${formatText(reel.idea)}`,
        `  Title: ${formatText(reel.title)}`,
        `  Caption: ${formatText(reel.caption)}`,
        `  Body: ${formatText(reel.body)}`,
        `  Hashtags: ${formatText(reel.hashtags)}`,
        `  Notes: ${formatText(reel.notes)}`,
        `  Origin: ${formatText(reel.origin)}`,
        `  Published at: ${formatText(reel.published_at)}`,
      ].join("\n"),
    ),
  ].join("\n");
}

function formatSemanticMemoriesSection(memories: SemanticMemoryContext[]): string {
  if (memories.length === 0) {
    return "Semantic memories:\n- (none)";
  }

  return [
    "Semantic memories:",
    ...memories.map((memory, index) =>
      [
        `- Memory ${index + 1}:`,
        `  Content: ${formatText(memory.content)}`,
        `  Key: ${formatText(memory.key)}`,
        `  Importance: ${formatText(memory.importance)}`,
        `  Updated at: ${formatText(memory.updated_at ?? memory.created_at)}`,
      ].join("\n"),
    ),
  ].join("\n");
}

function formatEpisodicMemoriesSection(memories: EpisodicMemoryContext[]): string {
  if (memories.length === 0) {
    return "Episodic memories:\n- (none)";
  }

  return [
    "Episodic memories:",
    ...memories.map((memory, index) =>
      [
        `- Memory ${index + 1}:`,
        `  Content: ${formatText(memory.content)}`,
        `  Importance: ${formatText(memory.importance)}`,
        `  Created at: ${formatText(memory.created_at)}`,
      ].join("\n"),
    ),
  ].join("\n");
}

function formatRejectedIdeasSection(rejectedIdeas: RejectedIdeaContext[]): string {
  if (rejectedIdeas.length === 0) {
    return "Rejected ideas:\n- (none)";
  }

  return [
    "Rejected ideas:",
    ...rejectedIdeas.map((idea, index) =>
      [
        `- Rejected ${index + 1}:`,
        `  Idea: ${formatText(idea.idea)}`,
        `  Title: ${formatText(idea.title)}`,
        `  Notes: ${formatText(idea.notes)}`,
        `  Origin: ${formatText(idea.origin)}`,
        `  Rejected at: ${formatText(idea.rejected_at)}`,
      ].join("\n"),
    ),
  ].join("\n");
}

export function buildReelIdeaGenerationPrompt(input: BuildReelIdeaGenerationPromptInput): {
  system: string | null;
  prompt: string;
} {
  return {
    system: input.ideaGenerationContext?.trim() || null,
    prompt: [
      "Generate distinct Instagram reel ideas for the user's academy board.",
      "Return plain text fields only.",
      "Each idea must be specific, non-duplicative, and ready to save as an ai_idea draft.",
      formatPublishedSection(input.latestPublishedReels),
      formatSemanticMemoriesSection(input.semanticMemories),
      formatEpisodicMemoriesSection(input.episodicMemories),
      formatRejectedIdeasSection(input.rejectedIdeas),
      `Generate exactly ${input.ideasPerRun} candidate ideas.`,
      "For each idea, return:",
      '- "idea": a concise one-line idea.',
      '- "notes": optional short angle or rationale.',
    ].join("\n\n"),
  };
}
