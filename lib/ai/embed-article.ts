import "server-only";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

// text-embedding-3-small defaults to 1536 dimensions, matching the
// article_analyses.embedding vector(1536) column (AGENTS.md §20).
const EMBEDDING_MODEL = "text-embedding-3-small";

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: openai.embedding(EMBEDDING_MODEL),
    value: text,
  });
  return embedding;
}
