"use client";

import { useMemo, useSyncExternalStore } from "react";
import { emptyBrief, type Brief, type Campaign, type Store } from "./types";

const KEY = "campaignpilot.v1";
const EVENT = "campaignpilot-change";

const emptyStore = (): Store => ({
  version: 1,
  brief: null,
  campaign: null,
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

export function saveBrief(brief: Brief, campaign: Campaign | null) {
  saveStore({ version: 1, brief, campaign });
}

export function clearStore() {
  window.localStorage.removeItem(KEY);
  emit();
}
