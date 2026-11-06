"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GENERATE_STEPS, generateCampaign } from "./generate";
import { saveGeneratedCampaign } from "./storage";
import type { Brief, Campaign, GenerationSource } from "./types";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const AI_STEPS = ["正在把简报发给 DeepSeek", "正在等待模型返回结构化方案"];

type RunOptions = {
  redirect?: string;
  mode?: GenerationSource;
};

export function useCampaign() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<GenerationSource>("demo");
  const [error, setError] = useState("");

  async function run(brief: Brief, options: RunOptions = {}) {
    if (loading) return null;
    const nextMode = options.mode ?? "demo";
    setMode(nextMode);
    setError("");
    setLoading(true);
    setStep(0);

    if (nextMode === "demo") {
      for (let index = 0; index < GENERATE_STEPS.length; index += 1) {
        setStep(index);
        await wait(520);
      }
      const campaign: Campaign = generateCampaign(brief);
      saveGeneratedCampaign(brief, campaign);
      if (options.redirect) {
        router.push(options.redirect);
        return campaign;
      }
      setLoading(false);
      return campaign;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 50_000);
    const stepTimer = window.setTimeout(() => setStep(1), 700);
    try {
      const response = await fetch("/api/generate-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brief),
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => null)) as {
        campaign?: Campaign;
        error?: string;
      } | null;
      if (!response.ok || !payload?.campaign || payload.campaign.source !== "ai") {
        setError(payload?.error || "DeepSeek 没有返回可用结果。这次没有改用模拟数据。");
        setLoading(false);
        return null;
      }
      saveGeneratedCampaign(brief, payload.campaign);
      if (options.redirect) {
        router.push(options.redirect);
        return payload.campaign;
      }
      setLoading(false);
      return payload.campaign;
    } catch {
      setError("请求超时或连接中断。结果没有生成，也没有改用模拟数据。");
      setLoading(false);
      return null;
    } finally {
      window.clearTimeout(timer);
      window.clearTimeout(stepTimer);
    }
  }

  return {
    loading,
    step,
    mode,
    error,
    steps: mode === "ai" ? AI_STEPS : GENERATE_STEPS,
    run,
  };
}
