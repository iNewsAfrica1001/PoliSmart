import OpenAI from "openai";

export class AiProviderError extends Error {
  constructor(message = "The AI provider is temporarily unavailable.") {
    super(message);
    this.status = 503;
  }
}

export function createOpenAiProvider({ apiKey, model = "gpt-5.4", client } = {}) {
  const openai = client || (apiKey ? new OpenAI({ apiKey }) : null);
  return {
    name: "openai",
    model,
    isConfigured: Boolean(openai),
    async generate({ instructions, input }) {
      if (!openai)
        throw new AiProviderError("AI is not configured. Set OPENAI_API_KEY on the server.");
      try {
        const response = await openai.responses.create({
          model,
          instructions,
          input,
          store: false,
          text: {
            format: {
              type: "json_schema",
              name: "grounded_campaign_answer",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  observedData: { type: "string" },
                  interpretation: { type: "string" },
                  sourceIds: { type: "array", items: { type: "string" } },
                },
                required: ["observedData", "interpretation", "sourceIds"],
              },
            },
          },
        });
        const parsed = JSON.parse(response.output_text);
        if (
          typeof parsed.observedData !== "string" ||
          typeof parsed.interpretation !== "string" ||
          !Array.isArray(parsed.sourceIds)
        )
          throw new Error("Invalid structured output");
        return { ...parsed, providerRef: response.id, model: response.model || model };
      } catch (error) {
        if (error instanceof AiProviderError) throw error;
        throw new AiProviderError();
      }
    },
    async generateDraft({ instructions, input }) {
      if (!openai)
        throw new AiProviderError("AI is not configured. Set OPENAI_API_KEY on the server.");
      try {
        const response = await openai.responses.create({
          model,
          instructions,
          input,
          store: false,
        });
        if (!response.output_text) throw new Error("Empty provider response");
        return response.output_text;
      } catch (error) {
        if (error instanceof AiProviderError) throw error;
        throw new AiProviderError();
      }
    },
  };
}

export function createAiProvider(config, options = {}) {
  if ((config.aiProvider || "openai") !== "openai")
    throw new Error(`Unsupported AI provider: ${config.aiProvider}`);
  return createOpenAiProvider({
    apiKey: config.openAiApiKey,
    model: config.openAiModel,
    ...options,
  });
}
