"use client";

import { useState } from "react";
import { DemoNotice } from "@/components/DemoNotice";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { useCampaign } from "@/lib/useCampaign";
import { clearStore, saveBrief, usePersistedStore } from "@/lib/storage";
import {
  BUDGETS,
  CHANNELS,
  GOALS,
  LANGUAGES,
  MARKETS,
  TONES,
  emptyBrief,
  type Brief,
  type ChannelId,
  type GenerationSource,
} from "@/lib/types";

const fieldClass =
  "mt-2 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-violet-200 focus:border-violet-400 focus:ring-2";

export default function BriefPage() {
  const generator = useCampaign();
  const store = usePersistedStore();
  const brief = store.brief ?? emptyBrief();
  const [errors, setErrors] = useState<string[]>([]);
  const [mode, setMode] = useState<GenerationSource>("ai");

  function persist(next: Brief) {
    saveBrief(next, store.campaign);
  }

  function update<K extends keyof Brief>(key: K, value: Brief[K]) {
    persist({ ...brief, [key]: value });
  }

  function toggleChannel(id: ChannelId) {
    const exists = brief.channels.includes(id);
    persist({
      ...brief,
      channels: exists ? brief.channels.filter((item) => item !== id) : [...brief.channels, id],
    });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: string[] = [];
    if (!brief.productName.trim()) nextErrors.push("请填写产品名称。");
    if (!brief.productDescription.trim()) nextErrors.push("请填写产品描述。");
    if (!brief.targetAudience.trim()) nextErrors.push("请填写目标用户。");
    if (!brief.marketingGoal) nextErrors.push("请选择营销目标。");
    if (brief.channels.length === 0) nextErrors.push("请至少选择一个营销渠道。");
    setErrors(nextErrors);
    if (nextErrors.length > 0) return;
    await generator.run(brief, { redirect: "/results", mode });
  }

  const filled = [
    brief.productName,
    brief.productDescription,
    brief.targetMarket,
    brief.targetAudience,
    brief.marketingGoal,
    brief.budget,
    brief.channels.length > 0 ? "channels" : "",
    brief.brandTone,
  ].filter(Boolean).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      {generator.loading ? (
        <LoadingOverlay
          step={generator.step}
          steps={generator.steps}
          badge={generator.mode === "ai" ? "DeepSeek" : "Demo"}
          title={generator.mode === "ai" ? "正在等待 DeepSeek" : "正在整理模拟策略"}
        />
      ) : null}
      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <p className="text-sm font-medium text-violet-700">Campaign Brief</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">活动简报</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            内容会随输入保存到本地浏览器。刷新页面后仍会留在这里，不会上传到服务器。
          </p>
        </div>
        <DemoNotice>
          选择 DeepSeek 时，简报会送到你本机服务器上的密钥去调用模型。调用失败会显示错误，不会改用模拟内容。选择 Demo 时仍只使用本地模板。
        </DemoNotice>

        <section className="space-y-5 rounded-3xl border border-line bg-white p-5 sm:p-6">
          <label className="block text-sm font-medium text-slate-800">
            产品名称
            <input
              className={fieldClass}
              value={brief.productName}
              onChange={(event) => update("productName", event.target.value)}
              placeholder="例如：澄光精华"
            />
          </label>
          <label className="block text-sm font-medium text-slate-800">
            产品描述
            <textarea
              className={`${fieldClass} min-h-32 resize-y`}
              value={brief.productDescription}
              onChange={(event) => update("productDescription", event.target.value)}
              placeholder="它是什么、解决什么、不能承诺什么"
            />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-800">
              目标市场
              <select
                className={fieldClass}
                value={brief.targetMarket}
                onChange={(event) =>
                  update("targetMarket", event.target.value as Brief["targetMarket"])
                }
              >
                <option value="">请选择</option>
                {MARKETS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-800">
              营销目标
              <select
                className={fieldClass}
                value={brief.marketingGoal}
                onChange={(event) =>
                  update("marketingGoal", event.target.value as Brief["marketingGoal"])
                }
              >
                <option value="">请选择</option>
                {GOALS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-800">
              预算（人民币）
              <select
                className={fieldClass}
                value={brief.budget}
                onChange={(event) => update("budget", event.target.value as Brief["budget"])}
              >
                <option value="">请选择</option>
                {BUDGETS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-800">
              输出语言
              <select
                className={fieldClass}
                value={brief.outputLanguage}
                onChange={(event) =>
                  update("outputLanguage", event.target.value as Brief["outputLanguage"])
                }
              >
                {LANGUAGES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-800">
              品牌语气
              <select
                className={fieldClass}
                value={brief.brandTone}
                onChange={(event) =>
                  update("brandTone", event.target.value as Brief["brandTone"])
                }
              >
                <option value="">请选择</option>
                {TONES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-800">
            目标用户
            <textarea
              className={`${fieldClass} min-h-24 resize-y`}
              value={brief.targetAudience}
              onChange={(event) => update("targetAudience", event.target.value)}
              placeholder="年龄、身份、正在为什么事发愁"
            />
          </label>
          <fieldset>
            <legend className="text-sm font-medium text-slate-800">营销渠道</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {CHANNELS.map((channel) => {
                const active = brief.channels.includes(channel.id);
                return (
                  <button
                    key={channel.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleChannel(channel.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      active
                        ? "border-violet-600 bg-violet-600 text-white"
                        : "border-line bg-white text-slate-700 hover:border-violet-200"
                    }`}
                  >
                    {channel.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </section>

        <fieldset>
          <legend className="text-sm font-medium text-slate-800">生成方式</legend>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {(
              [
                ["ai", "使用 DeepSeek"],
                ["demo", "使用 Demo 模板"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
                  mode === value
                    ? "bg-violet-600 text-white"
                    : "border border-line bg-white text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {generator.error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {generator.error}
          </div>
        ) : null}

        {errors.length > 0 ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <ul className="list-disc space-y-1 pl-4">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
            disabled={generator.loading}
          >
            Generate Campaign
          </button>
          <button
            type="button"
            className="rounded-xl border border-line bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:border-violet-200"
            onClick={() => {
              clearStore();
              setErrors([]);
            }}
          >
            清空表单
          </button>
        </div>
      </form>

      <aside className="h-fit rounded-3xl border border-line bg-white p-5 lg:sticky lg:top-24">
        <p className="text-sm font-medium text-slate-900">已保存字段</p>
        <p className="mt-2 text-3xl font-semibold text-violet-700">{filled}/8</p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          这只是填写进度。Demo 评分会在生成后的评估页按规则展开，不会在这里假装已经分析完成。
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-violet-100">
          <div className="h-full bg-violet-600" style={{ width: `${(filled / 8) * 100}%` }} />
        </div>
      </aside>
    </div>
  );
}
