import OpenAI from "openai";

/**
 * Multi-provider LLM client.
 *
 * Switch provider via env vars:
 *   LLM_PROVIDER = openai | deepseek | moonshot | zhipu | siliconflow | custom
 *   LLM_API_KEY  = provider API key (falls back to OPENAI_API_KEY)
 *   LLM_MODEL    = override model name (optional)
 *   LLM_BASE_URL = custom base URL (optional, auto-set by provider)
 */

interface ProviderConfig {
  baseURL: string;
  defaultModel: string;
}

const PROVIDERS: Record<string, ProviderConfig> = {
  openai: {
    baseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
  },
  deepseek: {
    baseURL: "https://api.deepseek.com",
    defaultModel: "deepseek-chat",
  },
  moonshot: {
    baseURL: "https://api.moonshot.cn/v1",
    defaultModel: "moonshot-v1-8k",
  },
  zhipu: {
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    defaultModel: "glm-4-flash",
  },
  siliconflow: {
    baseURL: "https://api.siliconflow.cn/v1",
    defaultModel: "deepseek-ai/DeepSeek-V3",
  },
};

let client: OpenAI | null = null;
let resolvedModel: string | null = null;

function resolveConfig() {
  const provider = (process.env.LLM_PROVIDER || "openai").trim().toLowerCase();
  const config = PROVIDERS[provider];

  const baseURL =
    (process.env.LLM_BASE_URL || config?.baseURL || PROVIDERS.openai.baseURL).trim();
  const apiKey =
    (process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "").trim();
  const model =
    (process.env.LLM_MODEL || config?.defaultModel || "gpt-4o-mini").trim();

  return { baseURL, apiKey, model };
}

export function getOpenAI(): OpenAI {
  if (!client) {
    const { baseURL, apiKey } = resolveConfig();
    console.log(`[LLM Init] provider=${process.env.LLM_PROVIDER || "openai"} baseURL=${baseURL} model=${resolveConfig().model} keyPrefix=${apiKey?.slice(0, 8)}...`);
    client = new OpenAI({ apiKey, baseURL });
  }
  return client;
}

export function getModel(): string {
  if (!resolvedModel) {
    resolvedModel = resolveConfig().model;
  }
  return resolvedModel;
}

export function getProviderName(): string {
  return (process.env.LLM_PROVIDER || "openai").toLowerCase();
}

// Per-million-token pricing (USD)
const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini":                { input: 0.15,  output: 0.60 },
  "gpt-4o":                     { input: 2.50,  output: 10.0 },
  "deepseek-chat":              { input: 0.14,  output: 0.28 },
  "moonshot-v1-8k":             { input: 0.11,  output: 0.11 },
  "glm-4-flash":                { input: 0.00,  output: 0.00 },
  "deepseek-ai/DeepSeek-V3":    { input: 0.14,  output: 0.28 },
};

export interface TokenUsage {
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUSD: number;
}

const requestUsages: TokenUsage[] = [];

export function trackUsage(
  promptTokens: number,
  completionTokens: number
): TokenUsage {
  const model = getModel();
  const provider = getProviderName();
  const price = PRICING[model] ?? { input: 0.15, output: 0.60 };
  const costUSD =
    (promptTokens / 1_000_000) * price.input +
    (completionTokens / 1_000_000) * price.output;

  const usage: TokenUsage = {
    provider,
    model,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    costUSD: Math.round(costUSD * 1_000_000) / 1_000_000,
  };

  requestUsages.push(usage);
  console.log(
    `[LLM] ${provider}/${model} | ${promptTokens}+${completionTokens}=${promptTokens + completionTokens} tokens | $${usage.costUSD.toFixed(6)}`
  );
  return usage;
}

export function getAccumulatedUsage(): {
  calls: number;
  totalTokens: number;
  totalCostUSD: number;
  details: TokenUsage[];
} {
  const total = requestUsages.reduce(
    (acc, u) => ({
      tokens: acc.tokens + u.totalTokens,
      cost: acc.cost + u.costUSD,
    }),
    { tokens: 0, cost: 0 }
  );
  return {
    calls: requestUsages.length,
    totalTokens: total.tokens,
    totalCostUSD: Math.round(total.cost * 1_000_000) / 1_000_000,
    details: [...requestUsages],
  };
}

export function resetUsage() {
  requestUsages.length = 0;
}
