"use client";

import Link from "next/link";
import { useState } from "react";
import { DemoNotice } from "@/components/DemoNotice";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { briefsEqual } from "@/lib/generate";
import { usePersistedStore } from "@/lib/storage";
import { useCampaign } from "@/lib/useCampaign";

function copyWithSelection(text: string) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "true");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) throw new Error("copy failed");
}

export default function ResultsPage() {
  const generator = useCampaign();
  const store = usePersistedStore();
  const brief = store.brief;
  const campaign = store.campaign;
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState("");

  async function copyText(id: string, text: string) {
    let copied = false;
    try {
      copyWithSelection(text);
      copied = true;
    } catch {
      copied = false;
    }
    if (!copied && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch {
        copied = false;
      }
    }
    if (!copied) {
      setCopyError("浏览器没有允许写入剪贴板。你可以长按文案手动复制。");
      return;
    }
    setCopiedId(id);
    setCopyError("");
    window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1800);
  }

  if (!campaign || !brief) {
    return (
      <section className="rounded-3xl border border-line bg-white p-8">
        <h1 className="text-3xl font-semibold text-slate-950">还没有策略结果</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
          先填写活动简报，再点击 Generate Campaign。这一页不会显示虚构的历史方案。
        </p>
        <Link
          href="/brief"
          className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white hover:bg-violet-700"
        >
          去填写简报
        </Link>
      </section>
    );
  }

  const stale = !briefsEqual(brief, campaign.briefSnapshot);
  const generatedLabel = new Date(campaign.generatedAt).toLocaleString("zh-CN", {
    hour12: false,
  });

  return (
    <div className="space-y-6">
      {generator.loading ? (
        <LoadingOverlay
          step={generator.step}
          steps={generator.steps}
          badge={generator.mode === "ai" ? "DeepSeek" : "Demo"}
          title={generator.mode === "ai" ? "正在等待 DeepSeek" : "正在整理模拟策略"}
        />
      ) : null}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-violet-700">
            {campaign.source === "ai" ? "Results · AI Generated" : "Results · Demo"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {campaign.briefSnapshot.productName || "未命名产品"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">生成时间 {generatedLabel}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/brief"
            className="inline-flex items-center justify-center rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-violet-200"
          >
            返回编辑 Brief
          </Link>
          <Link
            href="/evaluation"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            查看规则评分
          </Link>
        </div>
      </div>

      {campaign.source === "ai" ? (
        <DemoNotice>
          AI Generated。这段策略来自 DeepSeek 对当前简报的回复，不是已经验证的营销效果。下面的分数仍由本地规则计算。
        </DemoNotice>
      ) : (
        <DemoNotice>
          以下画像、卖点、渠道建议、内容日历和文案由本地模板生成，不是模型输出。
        </DemoNotice>
      )}

      {generator.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {generator.error}
        </div>
      ) : null}

      {stale ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <p>
            简报已修改，当前仍是上次的{campaign.source === "ai" ? " AI " : " Demo "}结果。重新生成后才会使用新内容。
          </p>
          <button
            type="button"
            className="rounded-lg bg-amber-900 px-3 py-2 text-white hover:bg-amber-800"
            onClick={() => generator.run(brief, { mode: campaign.source === "ai" ? "ai" : "demo" })}
          >
            按新简报重新生成
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-violet-200"
            onClick={() => generator.run(brief, { mode: campaign.source === "ai" ? "ai" : "demo" })}
        >
          重新生成
        </button>
      )}

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold">目标用户画像</h2>
          <p className="mt-3 text-base font-medium text-slate-900">{campaign.persona.title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{campaign.persona.summary}</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {campaign.persona.traits.map((trait) => (
              <li key={trait} className="rounded-full bg-violet-50 px-3 py-1 text-xs text-violet-800">
                {trait}
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <p className="rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
              <span className="block text-xs text-slate-500">关注点</span>
              {campaign.persona.pain}
            </p>
            <p className="rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
              <span className="block text-xs text-slate-500">期望</span>
              {campaign.persona.desire}
            </p>
          </div>
        </article>
        <article className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold">核心卖点</h2>
          <ol className="mt-4 space-y-3">
            {campaign.sellingPoints.map((point, index) => (
              <li key={point} className="flex gap-3 text-sm leading-6 text-slate-700">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs text-white">
                  {index + 1}
                </span>
                {point}
              </li>
            ))}
          </ol>
        </article>
      </section>

      <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold">渠道建议</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {campaign.channelAdvice.map((item) => (
            <article key={item.channelId} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">{item.label}</p>
              <p className="mt-1 text-xs text-violet-700">{item.role}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.suggestion}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold">内容日历</h2>
        <div className="mt-4 hidden overflow-hidden rounded-2xl border border-line md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">日期</th>
                <th className="px-4 py-3 font-medium">渠道</th>
                <th className="px-4 py-3 font-medium">主题</th>
                <th className="px-4 py-3 font-medium">动作</th>
              </tr>
            </thead>
            <tbody>
              {campaign.calendar.map((item) => (
                <tr key={item.day} className="border-t border-line">
                  <td className="px-4 py-3 font-medium text-slate-900">{item.day}</td>
                  <td className="px-4 py-3">{item.channelLabel}</td>
                  <td className="px-4 py-3">{item.theme}</td>
                  <td className="px-4 py-3 text-slate-600">{item.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-3 md:hidden">
          {campaign.calendar.map((item) => (
            <article key={item.day} className="rounded-2xl bg-slate-50 p-4 text-sm">
              <p className="font-medium text-slate-900">
                {item.day} · {item.channelLabel}
              </p>
              <p className="mt-1 text-violet-700">{item.theme}</p>
              <p className="mt-2 leading-6 text-slate-600">{item.action}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold">行动建议</h2>
          <ol className="mt-4 space-y-3">
            {campaign.actions.map((action, index) => (
              <li key={`${action}-${index}`} className="text-sm leading-6 text-slate-700">
                {index + 1}. {action}
              </li>
            ))}
          </ol>
        </article>
        <article className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold">建议追踪的 KPI</h2>
          <p className="mt-2 text-xs leading-5 text-slate-500">这些是建议观察的指标，不是已经发生的效果。</p>
          <ul className="mt-4 space-y-3">
            {campaign.kpis.map((kpi) => (
              <li key={kpi.name} className="rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                <span className="font-medium text-slate-900">{kpi.name}</span>
                <span className="mt-1 block">{kpi.description}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      {campaign.assumptions.length > 0 ? (
        <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold">假设与未提供的信息</h2>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
            {campaign.assumptions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-lg font-semibold">多平台营销文案</h2>
          <button
            type="button"
            className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-violet-200"
            onClick={() =>
              copyText(
                "all",
                campaign.copies.map((item) => `【${item.platform}】\n${item.text}`).join("\n\n"),
              )
            }
          >
            {copiedId === "all" ? "已复制全部" : "复制全部文案"}
          </button>
        </div>
        {copyError ? <p className="text-sm text-rose-700">{copyError}</p> : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {campaign.copies.map((item) => (
            <article key={item.id} className="rounded-3xl border border-line bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{item.platform}</h3>
                  <p className="text-xs text-slate-500">{item.format}</p>
                </div>
                <button
                  type="button"
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
                  onClick={() => copyText(item.id, item.text)}
                >
                  {copiedId === item.id ? "已复制" : "复制"}
                </button>
              </div>
              <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-6 text-slate-700">
                {item.text}
              </pre>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
