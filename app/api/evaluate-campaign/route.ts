import { beginAiCall, finishAiCall, readJson } from "@/lib/aiGuard";
import { aiFailure, completeJson, createDeepseek, deepseekKey } from "@/lib/deepseek";
import { buildReview, describeBrief, describeCampaign, evaluateRequestSchema, reviewPrompt } from "@/lib/review";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const incoming = await readJson(request);
  if (!incoming.ok) return Response.json({ error: incoming.error }, { status: incoming.status });

  const parsed = evaluateRequestSchema.safeParse(incoming.body);
  if (!parsed.success) {
    return Response.json({ error: "评估所需的策略内容不完整。结果未保存。" }, { status: 400 });
  }

  if (!deepseekKey()) {
    return Response.json(
      { error: "服务器还没有读到 DeepSeek 密钥。请保存 .env.local 后重启开发服务器。" },
      { status: 500 },
    );
  }
  const session = createDeepseek();
  if (!session) return Response.json({ error: "DEEPSEEK_MODEL 的格式无法使用。" }, { status: 500 });

  const gate = beginAiCall(request);
  if (!gate.ok) return Response.json({ error: gate.error }, { status: gate.status });

  const brief = { ...parsed.data.brief, channels: [...new Set(parsed.data.brief.channels)] };
  const language = brief.outputLanguage === "en" ? "English" : "简体中文";
  try {
    const result = await completeJson(
      session.client,
      session.model,
      [
        { role: "system", content: reviewPrompt(language) },
        {
          role: "user",
          content: `简报：\n${describeBrief(brief)}\n\n当前策略：\n${describeCampaign(parsed.data.campaign)}`,
        },
      ],
      1800,
    );
    if (!result.ok) {
      return Response.json(
        {
          error:
            result.reason === "json"
              ? "DeepSeek 返回的评估不是有效 JSON。结果未保存。"
              : "DeepSeek 没有返回评估。结果未保存。",
        },
        { status: 502 },
      );
    }
    const review = buildReview(result.json);
    if (!review.ok) {
      console.error("DeepSeek review schema mismatch");
      return Response.json({ error: "DeepSeek 返回的评估结构不完整。结果未保存。" }, { status: 502 });
    }
    return Response.json({ review: review.review });
  } catch (error) {
    const failure = aiFailure(error);
    return Response.json({ error: failure.error }, { status: failure.status });
  } finally {
    finishAiCall();
  }
}
