import { z } from "zod";
import { briefSchema } from "./campaignSchema";
import {
  AI_REVIEW_DIMENSIONS,
  AI_REVIEW_DISCLAIMER,
  AI_REVIEW_FORMULA,
  BUDGETS,
  CHANNELS,
  GOALS,
  MARKETS,
  TONES,
  labelOf,
  type AiReview,
  type AiReviewDimensionId,
  type Brief,
} from "./types";

const textList = (max: number, limit: number) => z.array(z.string().trim().min(1).max(max)).max(limit);

export const campaignPayloadSchema = z.object({
  persona: z.object({
    title: z.string().trim().min(1).max(120),
    summary: z.string().trim().min(1).max(700),
    traits: textList(80, 6),
    pain: z.string().trim().min(1).max(400),
    desire: z.string().trim().min(1).max(400),
  }),
  sellingPoints: textList(280, 6).min(1),
  channelAdvice: z
    .array(
      z.object({
        channelId: z.string().trim().min(1).max(40),
        label: z.string().trim().max(40).optional(),
        role: z.string().trim().min(1).max(80),
        suggestion: z.string().trim().min(1).max(500),
      }),
    )
    .min(1)
    .max(7),
  calendar: z
    .array(
      z.object({
        day: z.string().trim().min(1).max(24),
        channelLabel: z.string().trim().min(1).max(40),
        theme: z.string().trim().min(1).max(40),
        action: z.string().trim().min(1).max(320),
      }),
    )
    .max(7),
  copies: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(40),
        platform: z.string().trim().min(1).max(40),
        format: z.string().trim().min(1).max(40),
        text: z.string().trim().min(1).max(900),
      }),
    )
    .min(1)
    .max(7),
  actions: textList(280, 6),
  kpis: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        description: z.string().trim().min(1).max(240),
      }),
    )
    .max(5),
  assumptions: textList(240, 8),
});

export const evaluateRequestSchema = z.object({
  brief: briefSchema,
  campaign: campaignPayloadSchema,
});

const dimensionSchema = z.object({
  id: z.enum(["goal", "channel", "budget", "brand"]),
  score: z.number().finite().min(0).max(100),
  problems: textList(240, 4),
  suggestions: textList(240, 4),
  evidence: textList(240, 4),
});

const reviewResponseSchema = z.object({
  dimensions: z.array(dimensionSchema).min(4).max(4),
});

export const reviewPayloadSchema = z.object({
  dimensions: z
    .array(
      z.object({
        id: z.enum(["goal", "channel", "budget", "brand"]),
        label: z.string().trim().max(40),
        score: z.number().finite().min(0).max(100),
        problems: textList(240, 4),
        suggestions: textList(240, 4),
        evidence: textList(240, 4),
      }),
    )
    .length(4),
  overall: z.number().finite().min(0).max(100),
});

export const optimizeRequestSchema = evaluateRequestSchema.extend({
  review: reviewPayloadSchema,
});

export type CampaignPayload = z.infer<typeof campaignPayloadSchema>;

function fill(items: string[], fallback: string) {
  const clean = items.map((item) => item.trim()).filter(Boolean).slice(0, 4);
  return clean.length > 0 ? clean : [fallback];
}

const DIMENSION_IDS: Record<string, AiReviewDimensionId> = {
  goal: "goal",
  目标匹配度: "goal",
  channel: "channel",
  渠道适配度: "channel",
  budget: "budget",
  预算可执行性: "budget",
  brand: "brand",
  品牌一致性: "brand",
};

function loosenReview(raw: unknown) {
  const source =
    raw && typeof raw === "object" && "dimensions" in raw
      ? raw
      : raw && typeof raw === "object" && "review" in raw
        ? (raw as { review: unknown }).review
        : raw;
  if (!source || typeof source !== "object" || !("dimensions" in source)) return source;
  const dimensions = (source as { dimensions: unknown }).dimensions;
  if (!Array.isArray(dimensions)) return source;
  return {
    dimensions: dimensions.map((item) => {
      if (!item || typeof item !== "object") return item;
      const record = item as Record<string, unknown>;
      const rawId = typeof record.id === "string" ? record.id.trim() : "";
      const score = typeof record.score === "string" ? Number(record.score) : record.score;
      const strings = (value: unknown) =>
        Array.isArray(value)
          ? value
              .filter((item) => typeof item === "string" && item.trim())
              .slice(0, 4)
              .map((item: string) => item.trim().slice(0, 240))
          : value;
      return {
        ...record,
        id: DIMENSION_IDS[rawId] ?? rawId,
        score,
        problems: strings(record.problems),
        suggestions: strings(record.suggestions),
        evidence: strings(record.evidence),
      };
    }),
  };
}

export function buildReview(raw: unknown): { ok: true; review: AiReview } | { ok: false } {
  const parsed = reviewResponseSchema.safeParse(loosenReview(raw));
  if (!parsed.success) return { ok: false };
  const byId = new Map(parsed.data.dimensions.map((item) => [item.id, item]));
  if (byId.size !== AI_REVIEW_DIMENSIONS.length) return { ok: false };
  const dimensions = AI_REVIEW_DIMENSIONS.map((item) => {
    const found = byId.get(item.id as AiReviewDimensionId);
    if (!found) return null;
    return {
      id: item.id,
      label: item.label,
      score: Math.round(found.score),
      problems: fill(found.problems, "模型没有指出具体问题。"),
      suggestions: fill(found.suggestions, "模型没有给出修改建议。"),
      evidence: fill(found.evidence, "模型没有提供判断依据。"),
    };
  });
  if (dimensions.some((item) => item === null)) return { ok: false };
  const ready = dimensions.filter((item) => item !== null);
  const overall = Math.round(ready.reduce((sum, item) => sum + item.score, 0) / ready.length);
  return {
    ok: true,
    review: {
      generatedAt: new Date().toISOString(),
      dimensions: ready,
      overall,
      formula: AI_REVIEW_FORMULA,
      disclaimer: AI_REVIEW_DISCLAIMER,
    },
  };
}

export function describeBrief(brief: Brief) {
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

export function describeCampaign(campaign: CampaignPayload) {
  return JSON.stringify({
    persona: campaign.persona,
    sellingPoints: campaign.sellingPoints,
    channelAdvice: campaign.channelAdvice.map((item) => ({
      channelId: item.channelId,
      role: item.role,
      suggestion: item.suggestion,
    })),
    calendar: campaign.calendar,
    copies: campaign.copies.map((item) => ({
      id: item.id,
      platform: item.platform,
      format: item.format,
      text: item.text,
    })),
    actions: campaign.actions,
    kpis: campaign.kpis,
    assumptions: campaign.assumptions,
  });
}

export function describeReview(review: z.infer<typeof reviewPayloadSchema>) {
  return JSON.stringify({
    overall: review.overall,
    dimensions: review.dimensions.map((item) => ({
      id: item.id,
      score: item.score,
      problems: item.problems,
      suggestions: item.suggestions,
      evidence: item.evidence,
    })),
  });
}

export function reviewPrompt(language: string) {
  return [
    "你是营销策略审核员。只输出一个 JSON 对象，不要 Markdown。",
    "这是预测性文本评估，不是真实投放结果。不要编造市场数据、转化率、ROI、销量或竞品事实。",
    "四个维度都必须出现，id 只能是 goal、channel、budget、brand。score 为 0 到 100 的整数。",
    "每个维度给出 problems、suggestions、evidence，每项 1 到 3 条短句。evidence 只能引用简报或策略里已经写出的内容。",
    "预算、目标市场、目标用户、营销目标、渠道和语气是硬性约束。策略改不了这些事实时，要在 problems 里指出，而不是假装可以增加预算。",
    `所有面向读者的文字使用${language}。`,
    '结构：{"dimensions":[{"id":"goal","score":0,"problems":[""],"suggestions":[""],"evidence":[""]},{"id":"channel","score":0,"problems":[""],"suggestions":[""],"evidence":[""]},{"id":"budget","score":0,"problems":[""],"suggestions":[""],"evidence":[""]},{"id":"brand","score":0,"problems":[""],"suggestions":[""],"evidence":[""]}]}',
  ].join("\n");
}
