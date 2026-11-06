import { scoreBrief } from "./generate";
import type { AiCampaignDraft } from "./campaignSchema";
import { CHANNELS, labelOf, type Brief, type Campaign, type ChannelId } from "./types";

export function buildAiCampaign(brief: Brief, draft: AiCampaignDraft): Campaign {
  const allowed = new Set<ChannelId>(brief.channels);
  const channelAdvice = draft.channelAdvice
    .filter((item) => allowed.has(item.channelId))
    .map((item) => ({
      ...item,
      label: labelOf(CHANNELS, item.channelId),
    }));
  const copies = draft.copies.filter((item) => allowed.has(item.id));
  if (channelAdvice.length === 0 || copies.length === 0) {
    throw new Error("missing channels");
  }
  const { evaluation, overall } = scoreBrief(brief);
  return {
    generatedAt: new Date().toISOString(),
    source: "ai",
    briefSnapshot: { ...brief, channels: [...brief.channels] },
    persona: draft.persona,
    sellingPoints: draft.sellingPoints,
    channelAdvice,
    calendar: draft.calendar,
    copies,
    actions: draft.actions,
    kpis: draft.kpis,
    assumptions: draft.assumptions,
    evaluation,
    overall,
  };
}
