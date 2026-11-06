import { z } from "zod";
import { CHANNELS, type ChannelId } from "./types";

const channelIds = CHANNELS.map((item) => item.id) as [ChannelId, ...ChannelId[]];

export const briefSchema = z.object({
  productName: z.string().trim().min(1).max(80),
  productDescription: z.string().trim().min(1).max(2000),
  targetMarket: z.enum(["cn", "sea", "na", "eu", "global", ""]),
  targetAudience: z.string().trim().min(1).max(500),
  marketingGoal: z.enum(["awareness", "leads", "sales", "retention"]),
  budget: z.enum(["5k", "5-20", "20-80", "80+", ""]),
  channels: z.array(z.enum(channelIds)).min(1).max(7),
  brandTone: z.enum(["professional", "friendly", "bold", "playful", "premium", ""]),
  outputLanguage: z.enum(["zh", "en"]).default("zh"),
});

export const aiCampaignSchema = z.object({
  persona: z.object({
    title: z.string().trim().min(1).max(120),
    summary: z.string().trim().min(1).max(700),
    traits: z.array(z.string().trim().min(1).max(80)).min(1).max(6),
    pain: z.string().trim().min(1).max(400),
    desire: z.string().trim().min(1).max(400),
  }),
  sellingPoints: z.array(z.string().trim().min(1).max(280)).min(1).max(6),
  channelAdvice: z
    .array(
      z.object({
        channelId: z.enum(channelIds),
        role: z.string().trim().min(1).max(80),
        suggestion: z.string().trim().min(1).max(500),
      }),
    )
    .min(1)
    .max(7),
  calendar: z
    .array(
      z.object({
        day: z.string().trim().min(1).max(24),
        channelLabel: z.string().trim().min(1).max(40),
        theme: z.string().trim().min(1).max(40),
        action: z.string().trim().min(1).max(320),
      }),
    )
    .length(7),
  copies: z
    .array(
      z.object({
        id: z.enum(channelIds),
        platform: z.string().trim().min(1).max(40),
        format: z.string().trim().min(1).max(40),
        text: z.string().trim().min(1).max(900),
      }),
    )
    .min(1)
    .max(7),
  actions: z.array(z.string().trim().min(1).max(280)).min(1).max(6),
  kpis: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        description: z.string().trim().min(1).max(240),
      }),
    )
    .min(1)
    .max(5),
  assumptions: z.array(z.string().trim().min(1).max(240)).max(8),
});

export type AiCampaignDraft = z.infer<typeof aiCampaignSchema>;
