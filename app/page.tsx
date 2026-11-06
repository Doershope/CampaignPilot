"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DemoNotice } from "@/components/DemoNotice";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { examples } from "@/lib/examples";
import { useCampaign } from "@/lib/useCampaign";
import { saveBrief } from "@/lib/storage";

const steps = [
  { title: "填写简报", text: "产品、用户、预算和渠道会保存在这台浏览器里。" },
  { title: "生成 Demo 策略", text: "点击按钮后会播放加载动画，再用模板写出结果。" },
  { title: "查看规则评分", text: "评估页按字段完整度打分，并写明每一项怎么算。" },
];

export default function HomePage() {
  const router = useRouter();
  const generator = useCampaign();

  return (
    <div className="space-y-14">
      {generator.loading ? (
        <LoadingOverlay step={generator.step} steps={generator.steps} />
      ) : null}
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="text-sm font-medium text-violet-700">前端 MVP · 模拟数据</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            CampaignPilot
          </h1>
          <p className="mt-3 text-lg text-slate-700">AI Marketing Campaign Copilot</p>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            帮你把一次营销活动从简报整理成用户画像、卖点、渠道安排和多平台文案。当前版本只在浏览器里演示流程，方便先看清页面和交互。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/brief"
              className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
            >
              开始创建营销活动
            </Link>
            <a
              href="#scenarios"
              className="inline-flex items-center justify-center rounded-xl border border-line bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:border-violet-200 hover:text-violet-700"
            >
              查看示例场景
            </a>
          </div>
        </div>
        <div className="rounded-3xl border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-900">策略预览</p>
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
              本地模板
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {[
              ["用户画像", "敏感肌、在意成分说明"],
              ["核心卖点", "28 天提亮，皮肤科顾问参与"],
              ["本周渠道", "小红书 · 微信 · TikTok"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-sm text-slate-800">{value}</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-5 w-full rounded-xl border border-violet-200 px-4 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-50"
            onClick={() => {
              saveBrief(examples[0].brief, null);
              router.push("/brief");
            }}
          >
            用「澄光精华」预填简报
          </button>
        </div>
      </section>

      <DemoNotice>
        结果页和评估页的内容来自固定规则与你输入的文字。页面上的分数不是模型判断，也不能当作市场调研结论。
      </DemoNotice>

      <section>
        <h2 className="text-2xl font-semibold text-slate-950">三次点击就能走完</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <article key={step.title} className="rounded-3xl border border-line bg-white p-5">
              <p className="text-sm font-medium text-violet-600">0{index + 1}</p>
              <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="scenarios">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">三个示例使用场景</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              填入后仍可修改。生成会覆盖上一次的 Demo 策略。
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {examples.map((example) => (
            <article
              key={example.id}
              className="flex flex-col rounded-3xl border border-line bg-white p-5 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-slate-950">{example.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{example.scene}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{example.outcome}</p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                  onClick={() => {
                    saveBrief(example.brief, null);
                    router.push("/brief");
                  }}
                >
                  填入此场景
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-violet-200 hover:text-violet-700"
                  onClick={() => generator.run(example.brief, { redirect: "/results", mode: "demo" })}
                >
                  直接生成 Demo 结果
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
