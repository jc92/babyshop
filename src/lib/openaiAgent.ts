import OpenAI from "openai";

let client: OpenAI | undefined;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set. Please configure your environment variables.");
    }

    client = new OpenAI({
      apiKey,
      project: process.env.OPENAI_PROJECT,
    });
  }

  return client;
}

export const DEFAULT_AGENT_MODEL = process.env.OPENAI_AGENT_MODEL ?? "gpt-5";
