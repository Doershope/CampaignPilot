import OpenAI from "openai";
import { scoreBrief } from "@/lib/generate";
import { briefSchema, type AiCampaignDraft } from "@/lib/campaignSchema";
import { missingFieldLabels, normalizeAiCampaign } from "@/lib/normalizeAiCampaign";
import {
  BUDGETS,
  CHANNELS,
  GOALS,
  MARKETS,
  TONES,
  labelOf,
  type Brief,
  type Campaign,
  type ChannelId,
} from "@/lib/types";

export const runtime = "nodejs";

const TIMEOUT_MS = 45_000;
const MAX_OUTPUT_TOKENS = 2800;
let inFlight = false;

function publicError(status: number) {
  if (status === 401 || status === 403) {
    return "DeepSeek 没有接受当前密钥。请确认密钥已保存在 .env.local，并重启开发服务器。";
  }
  if (status === 402) return "DeepSeek 账户余额不足，这次没有生成结果。";
  if (status === 429) return "DeepSeek 暂时繁忙，请稍后再试。这次没有生成结果。";
  if (status === 408) return "DeepSeek 响应超时。这次没有生成结果。";
  return "DeepSeek 暂时不可用。这次没有生成结果。";
}

function describeBrief(brief: Brief) {
  return [
    `产品名称：${brief.productName}`,
    `产品描述：${brief.productDescription}`,
    `目标市场：${labelOf(MARKETS, brief.targetMarket)}`,
    `目标用户：${brief.targetAudience}`,
    `营销目标：${labelOf(GOALS, brief.marketingGoal)}`,
    `预算（人民币）：${labelOf(BUDGETS, brief.budget)}`,
    `品牌语气：${labelOf(TONES, brief.brandTone)}`,
    `渠道：${brief.channels.map((id) => `${id}=${labelOf(CHANNELS, id)}`).join("，")}`,
    `输出语言：${brief.outputLanguage === "en" ? "English" : "中文"}`,
  ].join("\n");
}

function buildCampaign(brief: Brief, draft: AiCampaignDraft): Campaign {
  const allowed = new Set<ChannelId>(brief.channels);
  const channelAdvice = draft.channelAdvice
    .filter((item) => allowed.has(item.channelId))
    .map((item) => ({
      ...item,
      label: labelOf(CHANNELS, item.channelId),
    }));
  const copies = draft.copies.filter((item) => allowed.has(item.id));
  if (channelAdvice.length === 0 || copies.length === 0) {
    throw new Error("missing channels");
  }
  const { evaluation, overall } = scoreBrief(brief);
  return {
    generatedAt: new Date().toISOString(),
    source: "ai",
    briefSnapshot: { ...brief, channels: [...brief.channels] },
    persona: draft.persona,
    sellingPoints: draft.sellingPoints,
    channelAdvice,
    calendar: draft.calendar,
    copies,
    actions: draft.actions,
    kpis: draft.kpis,
    assumptions: draft.assumptions,
    evaluation,
    overall,
  };
}

export async function POST(request: Request) {
  if (inFlight) {
    return Response.json(
      { error: "已有一次生成正在进行，请等它结束，避免重复调用。" },
      { status: 429 },
    );
  }

  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      { error: "服务器还没有读到 DeepSeek 密钥。请保存 .env.local 后重启开发服务器。" },
      { status: 500 },
    );
  }

  const model = (process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat").trim();
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(model)) {
    return Response.json({ error: "DEEPSEEK_MODEL 的格式无法使用。" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "简报格式无法读取。" }, { status: 400 });
  }

  const parsedBrief = briefSchema.safeParse(body);
  if (!parsedBrief.success) {
    return Response.json({ error: "简报缺少必要内容，或某一项过长。" }, { status: 400 });
  }
  const brief = {
    ...parsedBrief.data,
    channels: [...new Set(parsedBrief.data.channels)],
  };
  const language = brief.outputLanguage === "en" ? "English" : "简体中文";

  inFlight = true;
  try {
    const client = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com",
      timeout: TIMEOUT_MS,
      maxRetries: 0,
    });
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.4,
      max_tokens: MAX_OUTPUT_TOKENS,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "你是营销策划助手。只输出一个 JSON 对象，不要 Markdown，不要代码块，不要在 JSON 外包一层。",
            "必须严格依据用户简报。不要编造市场调研、转化率、销量或竞品事实。",
            "建议要随地区、受众、平台和预算变化。信息不足时写入 assumptions，并标明这是假设。",
            "不要把方案写成已经验证的营销效果。",
            `所有面向读者的文字使用${language}。`,
            `channelAdvice.channelId 和 copies.id 只能是这些值：${brief.channels.join("、")}。`,
            "calendar 必须是 7 个对象。键名必须完全使用下面的英文结构：",
            JSON.stringify({
              persona: { title: "", summary: "", traits: ["", ""], pain: "", desire: "" },
              sellingPoints: ["", "", ""],
              channelAdvice: [{ channelId: brief.channels[0], role: "", suggestion: "" }],
              calendar: [{ day: "", channelLabel: "", theme: "", action: "" }],
              copies: [{ id: brief.channels[0], platform: "", format: "", text: "" }],
              actions: ["", "", ""],
              kpis: [{ name: "", description: "" }],
              assumptions: [""],
            }),
          ].join("\n"),
        },
        {
          role: "user",
          content: describeBrief(brief),
        },
      ],
    });
    const text = completion.choices[0]?.message?.content;
    if (!text) {
      return Response.json({ error: "DeepSeek 没有返回内容。这次没有改用模拟数据。" }, { status: 502 });
    }
    let json: unknown = text;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    const normalized = normalizeAiCampaign(json, brief);
    if (!normalized.ok) {
      console.error("DeepSeek schema mismatch", normalized.missing.join(","));
      return Response.json(
        {
          error: `DeepSeek 返回的结构不完整，缺少${missingFieldLabels(normalized.missing)}。结果未保存。`,
        },
        { status: 502 },
      );
    }
    const campaign = buildCampaign(brief, normalized.data);
    return Response.json({ campaign });
  } catch (error) {
    const status = error instanceof OpenAI.APIError ? error.status ?? 500 : 500;
    const timedOut =
      error instanceof OpenAI.APIConnectionTimeoutError ||
      (error instanceof Error && error.name === "AbortError");
    console.error("DeepSeek request failed", timedOut ? "timeout" : status);
    return Response.json(
      { error: publicError(timedOut ? 408 : status) },
      { status: timedOut ? 504 : status >= 400 && status < 600 ? status : 502 },
    );
  } finally {
    inFlight = false;
  }
}
