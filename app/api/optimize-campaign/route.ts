import { z } from "zod";
import { beginAiCall, finishAiCall, readJson } from "@/lib/aiGuard";
import { buildAiCampaign } from "@/lib/buildAiCampaign";
import { aiFailure, completeJson, createDeepseek, deepseekKey } from "@/lib/deepseek";
import { missingFieldLabels, normalizeAiCampaign } from "@/lib/normalizeAiCampaign";
import {
  buildReview,
  describeBrief,
  describeCampaign,
  describeReview,
  optimizeRequestSchema,
  reviewPrompt,
} from "@/lib/review";

export const runtime = "nodejs";

const changesSchema = z.array(z.string().trim().min(1).max(200)).min(1).max(6);

function readChanges(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const value = record.changes ?? record.edits ?? record.modifications ?? record["修改点"];
  const clipped = Array.isArray(value)
    ? value
        .filter((item) => typeof item === "string" && item.trim())
        .slice(0, 6)
        .map((item: string) => item.trim().slice(0, 200))
    : value;
  const parsed = changesSchema.safeParse(clipped);
  return parsed.success ? parsed.data : null;
}

export async function POST(request: Request) {
  const incoming = await readJson(request);
  if (!incoming.ok) return Response.json({ error: incoming.error }, { status: incoming.status });

  const parsed = optimizeRequestSchema.safeParse(incoming.body);
  if (!parsed.success) {
    return Response.json({ error: "优化所需的简报、策略或评估不完整。结果未保存。" }, { status: 400 });
  }

  if (!deepseekKey()) {
    return Response.json(
      { error: "服务器还没有读到 DeepSeek 密钥。请保存 .env.local 后重启开发服务器。" },
      { status: 500 },
    );
  }
  const session = createDeepseek();
  if (!session) return Response.json({ error: "DEEPSEEK_MODEL 的格式无法使用。" }, { status: 500 });

  const gate = beginAiCall(request, 2);
  if (!gate.ok) return Response.json({ error: gate.error }, { status: gate.status });

  const brief = { ...parsed.data.brief, channels: [...new Set(parsed.data.brief.channels)] };
  const language = brief.outputLanguage === "en" ? "English" : "简体中文";
  const lockNote =
    language === "English"
      ? "The original budget, market, audience, goal, channels, and tone stayed locked."
      : "优化时锁定了原简报的预算、目标市场、目标用户、营销目标、渠道和语气。";

  try {
    const optimized = await completeJson(
      session.client,
      session.model,
      [
        {
          role: "system",
          content: [
            "你是营销策划助手。只输出一个 JSON 对象，不要 Markdown。",
            "只根据评估意见修改策略文本。预算、目标市场、目标用户、营销目标、渠道和品牌语气是硬性约束，必须原样保留，不能扩大预算或改换市场。",
            "不要编造市场调研、转化率、ROI、销量、点击率或竞品事实。信息不足时写入 assumptions，并标明这是假设。",
            "changes 用 2 到 5 条短句说明实际改了什么，不要声称分数已经提高。",
            `所有面向读者的文字使用${language}。`,
            `channelAdvice.channelId 和 copies.id 只能是：${brief.channels.join("、")}。`,
            "calendar 必须是 7 个对象。键名使用：persona、sellingPoints、channelAdvice、calendar、copies、actions、kpis、assumptions、changes。",
          ].join("\n"),
        },
        {
          role: "user",
          content: `必须遵守的简报：\n${describeBrief(brief)}\n\n当前策略：\n${describeCampaign(parsed.data.campaign)}\n\n评估意见：\n${describeReview(parsed.data.review)}`,
        },
      ],
      2800,
    );
    if (!optimized.ok) {
      return Response.json(
        {
          error:
            optimized.reason === "json"
              ? "DeepSeek 返回的优化稿不是有效 JSON。结果未保存。"
              : "DeepSeek 没有返回优化稿。结果未保存。",
        },
        { status: 502 },
      );
    }

    const changes = readChanges(optimized.json);
    if (!changes) {
      console.error("DeepSeek optimize schema mismatch", "changes");
      return Response.json({ error: "DeepSeek 没有说明具体修改点。结果未保存。" }, { status: 502 });
    }
    const normalized = normalizeAiCampaign(optimized.json, brief);
    if (!normalized.ok) {
      console.error("DeepSeek optimize schema mismatch", normalized.missing.join(","));
      return Response.json(
        { error: `优化稿结构不完整，缺少${missingFieldLabels(normalized.missing)}。结果未保存。` },
        { status: 502 },
      );
    }

    const draft = {
      ...normalized.data,
      assumptions: [lockNote, ...normalized.data.assumptions.filter((item) => item !== lockNote)].slice(0, 8),
    };
    let campaign;
    try {
      campaign = buildAiCampaign(brief, draft);
    } catch {
      console.error("DeepSeek optimize schema mismatch", "channels");
      return Response.json({ error: "优化稿没有保留已选渠道。结果未保存。" }, { status: 502 });
    }

    const reviewed = await completeJson(
      session.client,
      session.model,
      [
        { role: "system", content: reviewPrompt(language) },
        {
          role: "user",
          content: `简报：\n${describeBrief(brief)}\n\n当前策略：\n${describeCampaign(campaign)}`,
        },
      ],
      1800,
    );
    if (!reviewed.ok) {
      return Response.json(
        { error: "优化稿已经返回，但它的评估没有完成。结果未保存，也没有再次优化。" },
        { status: 502 },
      );
    }
    const review = buildReview(reviewed.json);
    if (!review.ok) {
      console.error("DeepSeek review schema mismatch");
      return Response.json(
        { error: "优化稿的评估结构不完整。结果未保存，也没有再次优化。" },
        { status: 502 },
      );
    }
    return Response.json({ campaign, review: review.review, changes });
  } catch (error) {
    const failure = aiFailure(error);
    return Response.json({ error: failure.error }, { status: failure.status });
  } finally {
    finishAiCall();
  }
}
