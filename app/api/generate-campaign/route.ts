import { beginAiCall, finishAiCall, readJson } from "@/lib/aiGuard";
import { buildAiCampaign } from "@/lib/buildAiCampaign";
import { briefSchema } from "@/lib/campaignSchema";
import { aiFailure, createDeepseek, deepseekKey } from "@/lib/deepseek";
import { missingFieldLabels, normalizeAiCampaign } from "@/lib/normalizeAiCampaign";
import { describeBrief } from "@/lib/review";

export const runtime = "nodejs";

const MAX_OUTPUT_TOKENS = 2800;

export async function POST(request: Request) {
  const incoming = await readJson(request);
  if (!incoming.ok) return Response.json({ error: incoming.error }, { status: incoming.status });

  const parsedBrief = briefSchema.safeParse(incoming.body);
  if (!parsedBrief.success) {
    return Response.json({ error: "简报缺少必要内容，或某一项过长。" }, { status: 400 });
  }
  if (!deepseekKey()) {
    return Response.json(
      { error: "服务器还没有读到 DeepSeek 密钥。请保存 .env.local 后重启开发服务器。" },
      { status: 500 },
    );
  }
  const session = createDeepseek();
  if (!session) return Response.json({ error: "DEEPSEEK_MODEL 的格式无法使用。" }, { status: 500 });

  const brief = {
    ...parsedBrief.data,
    channels: [...new Set(parsedBrief.data.channels)],
  };
  const language = brief.outputLanguage === "en" ? "English" : "简体中文";
  const gate = beginAiCall(request);
  if (!gate.ok) return Response.json({ error: gate.error }, { status: gate.status });

  try {
    const completion = await session.client.chat.completions.create({
      model: session.model,
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
    const campaign = buildAiCampaign(brief, normalized.data);
    return Response.json({ campaign });
  } catch (error) {
    if (error instanceof Error && error.message === "missing channels") {
      console.error("DeepSeek schema mismatch", "channels");
      return Response.json({ error: "DeepSeek 返回的渠道不在已选范围内。结果未保存。" }, { status: 502 });
    }
    const failure = aiFailure(error);
    return Response.json({ error: failure.error }, { status: failure.status });
  } finally {
    finishAiCall();
  }
}
