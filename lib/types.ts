export const CHANNELS = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "xiaohongshu", label: "小红书" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "email", label: "邮件" },
  { id: "google", label: "Google Ads" },
  { id: "wechat", label: "微信" },
] as const;

export const TONES = [
  { id: "professional", label: "专业可靠" },
  { id: "friendly", label: "亲切友好" },
  { id: "bold", label: "大胆直接" },
  { id: "playful", label: "轻松有趣" },
  { id: "premium", label: "高端精致" },
] as const;

export const GOALS = [
  { id: "awareness", label: "提升品牌认知" },
  { id: "leads", label: "获取销售线索" },
  { id: "sales", label: "促进转化成交" },
  { id: "retention", label: "提高复购留存" },
] as const;

export const MARKETS = [
  { id: "cn", label: "中国大陆" },
  { id: "sea", label: "东南亚" },
  { id: "na", label: "北美" },
  { id: "eu", label: "欧洲" },
  { id: "global", label: "全球" },
] as const;

export const BUDGETS = [
  { id: "5k", label: "5,000 以下" },
  { id: "5-20", label: "5,000 – 20,000" },
  { id: "20-80", label: "20,000 – 80,000" },
  { id: "80+", label: "80,000 以上" },
] as const;

export type ChannelId = (typeof CHANNELS)[number]["id"];
export type ToneId = (typeof TONES)[number]["id"];
export type GoalId = (typeof GOALS)[number]["id"];
export type MarketId = (typeof MARKETS)[number]["id"];
export type BudgetId = (typeof BUDGETS)[number]["id"];
export type OutputLanguage = "zh" | "en";
export type GenerationSource = "demo" | "ai";

export const LANGUAGES = [
  { id: "zh", label: "中文" },
  { id: "en", label: "English" },
] as const;

export type Brief = {
  productName: string;
  productDescription: string;
  targetMarket: MarketId | "";
  targetAudience: string;
  marketingGoal: GoalId | "";
  budget: BudgetId | "";
  channels: ChannelId[];
  brandTone: ToneId | "";
  outputLanguage: OutputLanguage;
};

export type Persona = {
  title: string;
  summary: string;
  traits: string[];
  pain: string;
  desire: string;
};

export type ChannelAdvice = {
  channelId: ChannelId;
  label: string;
  role: string;
  suggestion: string;
};

export type CalendarItem = {
  day: string;
  channelLabel: string;
  theme: string;
  action: string;
};

export type PlatformCopy = {
  id: string;
  platform: string;
  format: string;
  text: string;
};

export type ScoreDimension = {
  id: "completeness" | "brand" | "channel" | "execution";
  label: string;
  score: number;
  summary: string;
  evidence: string[];
};

export type Kpi = {
  name: string;
  description: string;
};

export type Campaign = {
  generatedAt: string;
  source: GenerationSource;
  briefSnapshot: Brief;
  persona: Persona;
  sellingPoints: string[];
  channelAdvice: ChannelAdvice[];
  calendar: CalendarItem[];
  copies: PlatformCopy[];
  actions: string[];
  kpis: Kpi[];
  assumptions: string[];
  evaluation: ScoreDimension[];
  overall: number;
};

export type Store = {
  version: 1;
  brief: Brief | null;
  campaign: Campaign | null;
};

export const emptyBrief = (): Brief => ({
  productName: "",
  productDescription: "",
  targetMarket: "",
  targetAudience: "",
  marketingGoal: "",
  budget: "",
  channels: [],
  brandTone: "",
  outputLanguage: "zh",
});

export function labelOf<T extends { id: string; label: string }>(
  list: readonly T[],
  id: string,
) {
  return list.find((item) => item.id === id)?.label ?? "未填写";
}
