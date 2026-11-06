"use client";

import Link from "next/link";
import { useState } from "react";
import { DemoNotice } from "@/components/DemoNotice";
import { usePersistedStore } from "@/lib/storage";

export default function EvaluationPage() {
  const campaign = usePersistedStore().campaign;
  const [openId, setOpenId] = useState<string | null>("completeness");

  if (!campaign) {
    return (
      <section className="rounded-3xl border border-line bg-white p-8">
        <h1 className="text-3xl font-semibold">还没有 Demo 评分</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
          评估只针对刚刚生成的那一版简报。请先完成 Generate Campaign。
        </p>
        <Link
          href="/brief"
          className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white"
        >
          去填写简报
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-violet-700">Evaluation · 规则评分</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">质量评估</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          四个维度都来自同一套本地规则：数字段、看字数、看渠道数量和目标搭配。它只检查简报是否填全，不是 AI 对营销效果的判断。
        </p>
      </div>
      <DemoNotice>
        {campaign.source === "ai"
          ? "策略正文来自 DeepSeek。这里的分数仍是规则评估，不能当成已经验证的投放效果。"
          : "当前策略来自 Demo 模板。这里的分数是规则评估，不是真实 AI 评估，也不代表营销效果。"}
      </DemoNotice>

      <section className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
        <article className="rounded-3xl bg-violet-600 p-5 text-white">
          <p className="text-sm text-violet-100">综合规则分</p>
          <p className="mt-2 text-5xl font-semibold">{campaign.overall}</p>
          <p className="mt-3 text-sm leading-6 text-violet-100">四项平均，四舍五入。满分 100。</p>
        </article>
        <article className="rounded-3xl border border-line bg-white p-5">
          <h2 className="font-semibold">本次计分对象</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {campaign.briefSnapshot.productName || "未命名产品"} ·{" "}
            {new Date(campaign.generatedAt).toLocaleString("zh-CN", { hour12: false })}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/results"
              className="inline-flex justify-center rounded-xl border border-line px-4 py-2 text-sm font-medium text-slate-700"
            >
              返回策略结果
            </Link>
            <Link
              href="/brief"
              className="inline-flex justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              返回编辑 Brief
            </Link>
          </div>
        </article>
      </section>

      <section className="grid gap-4">
        {campaign.evaluation.map((item) => {
          const open = openId === item.id;
          return (
            <article key={item.id} className="rounded-3xl border border-line bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{item.label}</h2>
                  <p className="mt-1 text-sm text-slate-600">{item.summary}</p>
                </div>
                <p className="text-2xl font-semibold text-violet-700">{item.score}</p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-violet-100">
                <div className="h-full rounded-full bg-violet-600" style={{ width: `${item.score}%` }} />
              </div>
              <button
                type="button"
                className="mt-4 text-sm font-medium text-violet-700"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : item.id)}
              >
                {open ? "收起计分依据" : "展开计分依据"}
              </button>
              {open ? (
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  {item.evidence.map((line) => (
                    <li key={line} className="rounded-xl bg-slate-50 px-3 py-2">
                      {line}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}
