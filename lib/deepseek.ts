import OpenAI from "openai";

const TIMEOUT_MS = 45_000;

export function publicAiError(status: number) {
  if (status === 401 || status === 403) {
    return "DeepSeek 没有接受当前密钥。请确认密钥已保存在 .env.local，并重启开发服务器。这次没有保存结果。";
  }
  if (status === 402) return "DeepSeek 账户余额不足。这次没有保存结果。";
  if (status === 429) return "DeepSeek 暂时繁忙，请稍后再试。这次没有保存结果。";
  if (status === 408) return "DeepSeek 响应超时。这次没有保存结果。";
  return "DeepSeek 暂时不可用。这次没有保存结果。";
}

export function deepseekModel() {
  const model = (process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat").trim();
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(model)) return null;
  return model;
}

export function deepseekKey() {
  return process.env.DEEPSEEK_API_KEY?.trim() || "";
}

export function createDeepseek() {
  const apiKey = deepseekKey();
  const model = deepseekModel();
  if (!apiKey || !model) return null;
  return {
    model,
    client: new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com",
      timeout: TIMEOUT_MS,
      maxRetries: 0,
    }),
  };
}

export async function completeJson(
  client: OpenAI,
  model: string,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  maxTokens: number,
) {
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.3,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
    messages,
  });
  const text = completion.choices[0]?.message?.content;
  if (!text) return { ok: false as const, reason: "empty" as const };
  try {
    return { ok: true as const, json: JSON.parse(text) as unknown };
  } catch {
    return { ok: false as const, reason: "json" as const };
  }
}

export function aiFailure(error: unknown) {
  const status = error instanceof OpenAI.APIError ? error.status ?? 500 : 500;
  const timedOut =
    error instanceof OpenAI.APIConnectionTimeoutError ||
    (error instanceof Error && error.name === "AbortError");
  console.error("DeepSeek request failed", timedOut ? "timeout" : status);
  const code = timedOut ? 408 : status;
  return {
    status: timedOut ? 504 : status >= 400 && status < 600 ? status : 502,
    error: publicAiError(code),
  };
}
