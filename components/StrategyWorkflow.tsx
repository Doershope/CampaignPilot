"use client";

import { useState } from "react";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { saveAiReview, saveOptimization } from "@/lib/storage";
import type { AiReview, Campaign } from "@/lib/types";

type Busy = "evaluate" | "optimize" | null;

function campaignBody(campaign: Campaign) {
  return {
    persona: campaign.persona,
    sellingPoints: campaign.sellingPoints,
    channelAdvice: campaign.channelAdvice,
    calendar: campaign.calendar,
    copies: campaign.copies,
    actions: campaign.actions,
    kpis: campaign.kpis,
    assumptions: campaign.assumptions,
  };
}

function isReview(value: unknown): value is AiReview {
  if (!value || typeof value !== "object") return false;
  const review = value as AiReview;
  return Array.isArray(review.dimensions) && review.dimensions.length === 4 && typeof review.overall === "number";
}

async function postJson(url: string, body: unknown, timeoutMs: number) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      throw new Error(payload?.error || "请求失败。结果未保存。");
    }
    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("等待时间过长。结果未保存。");
    }
    if (error instanceof Error) throw error;
    throw new Error("请求失败。结果未保存。");
  } finally {
    window.clearTimeout(timer);
  }
}

function scoreDelta(before: number, after: number) {
  const delta = after - before;
  if (delta === 0) return "没有变化";
  return delta > 0 ? `高 ${delta} 分` : `低 ${Math.abs(delta)} 分`;
}

function StrategySummary({ campaign }: { campaign: Campaign }) {
  return (
    <div className="space-y-3 text-sm leading-6 text-slate-600">
      <p className="font-medium text-slate-900">{campaign.persona.title}</p>
      <p>{campaign.persona.summary}</p>
      <ul className="list-disc space-y-1 pl-5">
        {campaign.sellingPoints.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function StrategyWorkflow({
  campaign,
  review,
  previousCampaign,
  previousReview,
  changes,
  optimized,
  stale,
}: {
  campaign: Campaign;
  review: AiReview | null;
  previousCampaign: Campaign | null;
  previousReview: AiReview | null;
  changes: string[];
  optimized: boolean;
  stale: boolean;
}) {
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState("");
  const [lastAction, setLastAction] = useState<Exclude<Busy, null>>("evaluate");

  async function evaluate() {
    if (busy) return;
    setLastAction("evaluate");
    setError("");
    setBusy("evaluate");
    try {
      const payload = (await postJson(
        "/api/evaluate-campaign",
        { brief: campaign.briefSnapshot, campaign: campaignBody(campaign) },
        55_000,
      )) as { review?: unknown } | null;
      if (!payload || !isReview(payload.review)) {
        throw new Error("评估结果不完整。结果未保存。");
      }
      saveAiReview(payload.review);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "评估失败。结果未保存。");
    } finally {
      setBusy(null);
    }
  }

  async function optimize() {
    if (busy || !review || optimized) return;
    setLastAction("optimize");
    setError("");
    setBusy("optimize");
    try {
      const payload = (await postJson(
        "/api/optimize-campaign",
        { brief: campaign.briefSnapshot, campaign: campaignBody(campaign), review },
        95_000,
      )) as { campaign?: Campaign; review?: unknown; changes?: string[] } | null;
      if (!payload || payload.campaign?.source !== "ai" || !isReview(payload.review) || !payload.changes?.length) {
        throw new Error("优化结果不完整。结果未保存。");
      }
      saveOptimization({
        campaign: payload.campaign,
        review: payload.review,
        changes: payload.changes,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "优化失败。结果未保存。");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-4 rounded-3xl border border-line bg-white p-5 sm:p-6">
      {busy ? (
        <LoadingOverlay
          step={0}
          steps={busy === "optimize" ? ["正在生成一版优化策略并重新评估"] : ["正在审核当前策略"]}
          badge="DeepSeek"
          title={busy === "optimize" ? "正在优化" : "正在评估"}
        />
      ) : null}
      <div>
        <p className="text-sm font-medium text-violet-700">AI 策略评估</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-950">预测性审核，不是投放结果</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          点击后才会调用 DeepSeek。评估看目标匹配度、渠道适配度、预算可执行性和品牌一致性。优化只会自动进行一次，并且必须重新评估，不会假定分数提高。
        </p>
      </div>

      {campaign.source === "demo" ? (
        <p className="rounded-2xl bg-violet-50 px-4 py-3 text-sm leading-6 text-violet-900">
          当前策略来自 Demo 模板。可以送去评估，但失败时不会伪装成 AI 成功。
        </p>
      ) : null}

      {stale ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
          简报已修改。请先按新简报重新生成，再做评估或优化。
        </p>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={evaluate}
            className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
          >
            AI 策略评估
          </button>
          {review && !optimized ? (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={optimize}
              className="rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-medium text-violet-800 hover:border-violet-300 disabled:opacity-60"
            >
              Optimize Campaign
            </button>
          ) : null}
        </div>
      )}

      {optimized ? (
        <p className="text-sm leading-6 text-slate-600">这条策略已经优化过一次。如需再优化，请先重新生成。</p>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <p>{error}</p>
          <button
            type="button"
            className="mt-3 rounded-lg bg-rose-800 px-3 py-2 text-white hover:bg-rose-700"
            onClick={lastAction === "optimize" ? optimize : evaluate}
          >
            重试
          </button>
        </div>
      ) : null}

      {review ? (
        <div className="space-y-3">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-500">AI 预测总分</p>
            <p className="mt-1 text-3xl font-semibold text-slate-950">{review.overall}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{review.formula}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{review.disclaimer}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {review.dimensions.map((item) => (
              <article key={item.id} className="rounded-2xl border border-line p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-medium text-slate-900">{item.label}</h3>
                  <p className="text-xl font-semibold text-violet-700">{item.score}</p>
                </div>
                <p className="mt-3 text-xs font-medium text-slate-500">具体问题</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
                  {item.problems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs font-medium text-slate-500">修改建议</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
                  {item.suggestions.map((suggestion) => (
                    <li key={suggestion}>{suggestion}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs font-medium text-slate-500">判断依据</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
                  {item.evidence.map((evidence) => (
                    <li key={evidence}>{evidence}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {optimized && previousCampaign && previousReview && review ? (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-slate-950">Before / After</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <article className="rounded-2xl border border-line p-4">
              <p className="text-xs font-medium text-slate-500">修改前 · AI {previousReview.overall}</p>
              <div className="mt-3">
                <StrategySummary campaign={previousCampaign} />
              </div>
            </article>
            <article className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
              <p className="text-xs font-medium text-violet-700">修改后 · AI {review.overall}</p>
              <div className="mt-3">
                <StrategySummary campaign={campaign} />
              </div>
            </article>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
            <p>AI 预测分：{scoreDelta(previousReview.overall, review.overall)}。</p>
            <p>规则分：{scoreDelta(previousCampaign.overall, campaign.overall)}。规则分只检查简报是否填全，优化文案通常不会改变它。</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">主要修改点</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
              {changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
