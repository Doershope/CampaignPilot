"use client";

import { useMemo, useSyncExternalStore } from "react";
import { emptyBrief, type AiReview, type Brief, type Campaign, type Store } from "./types";

const KEY = "campaignpilot.v1";
const EVENT = "campaignpilot-change";

const emptyStore = (): Store => ({
  version: 1,
  brief: null,
  campaign: null,
  aiReview: null,
  previousCampaign: null,
  previousReview: null,
  changes: [],
  optimized: false,
});

function normalizeCampaign(campaign: Campaign | null | undefined): Campaign | null {
  if (!campaign) return null;
  return {
    ...campaign,
    source: campaign.source === "ai" ? "ai" : "demo",
    actions: campaign.actions ?? [],
    kpis: campaign.kpis ?? [],
    assumptions: campaign.assumptions ?? [],
  };
}

function parse(raw: string): Store {
  if (!raw) return emptyStore();
  try {
    const parsed = JSON.parse(raw) as Store;
    if (parsed.version !== 1 || !parsed.brief) return emptyStore();
    return {
      version: 1,
      brief: {
        ...emptyBrief(),
        ...parsed.brief,
        channels: parsed.brief.channels ?? [],
        outputLanguage: parsed.brief.outputLanguage === "en" ? "en" : "zh",
      },
      campaign: normalizeCampaign(parsed.campaign),
      aiReview: parsed.aiReview ?? null,
      previousCampaign: normalizeCampaign(parsed.previousCampaign),
      previousReview: parsed.previousReview ?? null,
      changes: parsed.changes ?? [],
      optimized: parsed.optimized === true,
    };
  } catch {
    return emptyStore();
  }
}

function emit() {
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(EVENT, onStoreChange);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(KEY) ?? "";
}

function getServerSnapshot() {
  return "";
}

export function usePersistedStore() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => parse(raw), [raw]);
}

export function saveStore(store: Store) {
  window.localStorage.setItem(KEY, JSON.stringify(store));
  emit();
}

function readStore(): Store {
  if (typeof window === "undefined") return emptyStore();
  return parse(window.localStorage.getItem(KEY) ?? "");
}

export function saveBrief(brief: Brief, campaign: Campaign | null) {
  const current = readStore();
  const keep = Boolean(campaign && current.campaign?.generatedAt === campaign.generatedAt);
  saveStore({
    version: 1,
    brief,
    campaign,
    aiReview: keep ? current.aiReview : null,
    previousCampaign: keep ? current.previousCampaign : null,
    previousReview: keep ? current.previousReview : null,
    changes: keep ? current.changes : [],
    optimized: keep ? current.optimized : false,
  });
}

export function saveGeneratedCampaign(brief: Brief, campaign: Campaign) {
  saveStore({
    version: 1,
    brief,
    campaign,
    aiReview: null,
    previousCampaign: null,
    previousReview: null,
    changes: [],
    optimized: false,
  });
}

export function saveAiReview(aiReview: AiReview) {
  const current = readStore();
  if (!current.brief || !current.campaign) return;
  saveStore({ ...current, aiReview });
}

export function saveOptimization(input: { campaign: Campaign; review: AiReview; changes: string[] }) {
  const current = readStore();
  if (!current.brief || !current.campaign || !current.aiReview || current.optimized) return;
  saveStore({
    ...current,
    previousCampaign: current.campaign,
    previousReview: current.aiReview,
    campaign: input.campaign,
    aiReview: input.review,
    changes: input.changes,
    optimized: true,
  });
}

export function clearStore() {
  window.localStorage.removeItem(KEY);
  emit();
}
