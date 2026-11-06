import { CHANNELS, labelOf, type Brief, type ChannelId } from "./types";
import { aiCampaignSchema, type AiCampaignDraft } from "./campaignSchema";

const DAYS = {
  zh: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
} as const;

const CHANNEL_ALIASES: Record<string, ChannelId> = {
  instagram: "instagram",
  ig: "instagram",
  tiktok: "tiktok",
  douyin: "tiktok",
  抖音: "tiktok",
  xiaohongshu: "xiaohongshu",
  redbook: "xiaohongshu",
  redbote: "xiaohongshu",
  小红书: "xiaohongshu",
  linkedin: "linkedin",
  领英: "linkedin",
  email: "email",
  mail: "email",
  edm: "email",
  邮件: "email",
  google: "google",
  googleads: "google",
  谷歌: "google",
  wechat: "wechat",
  weixin: "wechat",
  微信: "wechat",
  视频号: "wechat",
};

const MISSING_LABELS: Record<string, string> = {
  persona: "目标用户画像",
  sellingPoints: "核心卖点",
  channelAdvice: "渠道策略",
  copies: "营销文案",
};

export type NormalizeResult =
  | { ok: true; data: AiCampaignDraft; assumptionsAdded: string[] }
  | { ok: false; missing: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clip(value: string, max: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) : clean;
}

function textOf(value: unknown, max: number): string {
  if (typeof value === "string") return clip(value, max);
  if (typeof value === "number" && Number.isFinite(value)) return clip(String(value), max);
  if (Array.isArray(value)) {
    return clip(
      value
        .map((item): string => textOf(item, max))
        .filter(Boolean)
        .join("；"),
      max,
    );
  }
  if (isRecord(value)) {
    return clip(
      ["title", "name", "point", "text", "content", "description", "detail", "summary", "copy"]
        .map((key): string => textOf(value[key], max))
        .filter(Boolean)
        .join("："),
      max,
    );
  }
  return "";
}

function listOf(value: unknown, maxItems: number, maxLength: number) {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\n+|；|;/)
      : [];
  const items: string[] = [];
  for (const item of source) {
    const text = textOf(item, maxLength);
    if (!text || items.includes(text)) continue;
    items.push(text);
    if (items.length >= maxItems) break;
  }
  return items;
}

function pick(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

function parseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? value;
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start === -1 || end <= start) return value;
  try {
    return JSON.parse(fenced.slice(start, end + 1));
  } catch {
    return value;
  }
}

function unwrap(value: unknown): Record<string, unknown> | null {
  const parsed = parseJson(value);
  if (Array.isArray(parsed)) {
    const first = parsed.find(isRecord);
    return first ? unwrap(first) : null;
  }
  if (!isRecord(parsed)) return null;
  const directKeys = ["persona", "sellingPoints", "selling_points", "channelAdvice", "copies"];
  if (directKeys.some((key) => key in parsed)) return parsed;
  for (const key of ["result", "data", "campaign", "output", "plan", "response"]) {
    if (isRecord(parsed[key])) return unwrap(parsed[key]);
  }
  return parsed;
}

function channelIdOf(value: unknown, allowed: Set<ChannelId>): ChannelId | null {
  const raw = textOf(value, 40).toLowerCase().replace(/[\s_-]+/g, "");
  const alias = CHANNEL_ALIASES[raw] ?? CHANNEL_ALIASES[textOf(value, 40)];
  if (alias && allowed.has(alias)) return alias;
  const byLabel = CHANNELS.find((item) => {
    const label = item.label.toLowerCase().replace(/\s+/g, "");
    return label === raw || item.id === raw;
  });
  return byLabel && allowed.has(byLabel.id) ? byLabel.id : null;
}

function recordsFrom(value: unknown) {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (isRecord(value)) return [value];
  return [];
}

export function normalizeAiCampaign(raw: unknown, brief: Brief): NormalizeResult {
  const root = unwrap(raw);
  if (!root) return { ok: false, missing: ["persona", "sellingPoints", "channelAdvice", "copies"] };

  const allowed = new Set<ChannelId>(brief.channels);
  const language = brief.outputLanguage === "en" ? "en" : "zh";
  const notProvided = language === "en" ? "Not provided by the model." : "模型未提供这一项。";
  const assumptionsAdded: string[] = [];
  const personaRaw = pick(root, ["persona", "audience", "用户画像", "目标用户画像", "画像"]);
  const personaRecord = isRecord(personaRaw) ? personaRaw : {};
  const summary =
    textOf(pick(personaRecord, ["summary", "description", "overview", "profile", "摘要"]), 700) ||
    textOf(personaRaw, 700);
  const title = textOf(pick(personaRecord, ["title", "name", "label", "标题"]), 120) || clip(summary, 40);
  const pain = textOf(
    pick(personaRecord, ["pain", "painPoint", "painPoints", "problem", "challenge", "痛点"]),
    400,
  );
  const desire = textOf(
    pick(personaRecord, ["desire", "goal", "goals", "need", "motivation", "期望"]),
    400,
  );
  let traits = listOf(
    pick(personaRecord, ["traits", "tags", "characteristics", "attributes", "特征"]),
    6,
    80,
  );
  if (!summary && !title) return { ok: false, missing: ["persona"] };
  if (traits.length === 0) {
    traits = [notProvided];
    assumptionsAdded.push(
      language === "en"
        ? "Persona traits were not provided and were marked as missing."
        : "画像特征未提供，已明确标为缺失，不是推断结论。",
    );
  }

  const sellingPoints = listOf(
    pick(root, ["sellingPoints", "selling_points", "keyMessages", "messages", "valueProps", "核心卖点", "卖点"]),
    6,
    280,
  );
  const channelAdvice = recordsFrom(
    pick(root, [
      "channelAdvice",
      "channel_advice",
      "channels",
      "channelStrategy",
      "channelStrategies",
      "渠道策略",
      "渠道建议",
    ]),
  )
    .map((item) => {
      const channelId = channelIdOf(
        pick(item, ["channelId", "channel_id", "id", "channel", "platform", "name"]),
        allowed,
      );
      if (!channelId) return null;
      const suggestion = textOf(
        pick(item, ["suggestion", "reason", "rationale", "strategy", "description", "advice", "建议", "理由", "策略"]),
        500,
      );
      if (!suggestion) return null;
      return {
        channelId,
        role: textOf(pick(item, ["role", "job", "purpose"]), 80) || (language === "en" ? "Channel role" : "渠道角色"),
        suggestion,
      };
    })
    .filter((item) => item !== null)
    .slice(0, 7);

  const copies = recordsFrom(
    pick(root, ["copies", "copy", "copywriting", "posts", "creatives", "content", "营销文案", "文案"]),
  )
    .map((item) => {
      const id = channelIdOf(pick(item, ["id", "channelId", "channel_id", "channel", "platform"]), allowed);
      const copyText = textOf(pick(item, ["text", "copy", "content", "body", "caption", "script"]), 900);
      if (!id || !copyText) return null;
      return {
        id,
        platform: textOf(pick(item, ["platform", "channel", "name"]), 40) || labelOf(CHANNELS, id),
        format: textOf(pick(item, ["format", "type", "style"]), 40) || (language === "en" ? "Post" : "文案"),
        text: copyText,
      };
    })
    .filter((item) => item !== null)
    .slice(0, 7);

  const missing = [
    sellingPoints.length === 0 ? "sellingPoints" : "",
    channelAdvice.length === 0 ? "channelAdvice" : "",
    copies.length === 0 ? "copies" : "",
  ].filter(Boolean);
  if (missing.length > 0) return { ok: false, missing };

  const sourceCalendar = recordsFrom(
    pick(root, ["calendar", "contentCalendar", "content_calendar", "schedule", "内容日历", "日历"]),
  );
  const days = DAYS[language];
  const calendar = days.map((day, index) => {
    const item = sourceCalendar[index];
    if (!item) {
      return {
        day,
        channelLabel: labelOf(CHANNELS, brief.channels[index % brief.channels.length]),
        theme: language === "en" ? "Not provided" : "未提供",
        action: notProvided,
      };
    }
    return {
      day: textOf(pick(item, ["day", "date", "weekday"]), 24) || day,
      channelLabel:
        textOf(pick(item, ["channelLabel", "channel", "platform"]), 40) ||
        labelOf(CHANNELS, brief.channels[index % brief.channels.length]),
      theme: textOf(pick(item, ["theme", "topic", "title"]), 40) || (language === "en" ? "Not provided" : "未提供"),
      action: textOf(pick(item, ["action", "task", "content", "description"]), 320) || notProvided,
    };
  });
  if (sourceCalendar.length < 7) {
    assumptionsAdded.push(
      language === "en"
        ? "Some calendar days were missing and marked as not provided."
        : "内容日历有缺失天数，已标为未提供，没有替模型补写安排。",
    );
  }

  let actions = listOf(
    pick(root, ["actions", "actionItems", "nextSteps", "recommendations", "行动建议"]),
    6,
    280,
  );
  if (actions.length === 0) {
    actions = [notProvided];
    assumptionsAdded.push(
      language === "en" ? "Action items were not provided." : "行动建议未提供，已标为缺失。",
    );
  }
  const kpiRecords = recordsFrom(pick(root, ["kpis", "KPIs", "metrics", "kpi", "指标"]));
  let kpis = kpiRecords
    .map((item) => ({
      name: textOf(pick(item, ["name", "kpi", "metric", "title"]), 60),
      description: textOf(pick(item, ["description", "detail", "why", "definition", "note"]), 240),
    }))
    .filter((item) => item.name && item.description)
    .slice(0, 5);
  if (kpis.length === 0) {
    kpis = [
      {
        name: language === "en" ? "Not provided" : "未提供",
        description:
          language === "en"
            ? "The model did not provide a KPI. Do not treat this as a measured result."
            : "模型没有提供 KPI。不要把这一项当成已经发生的效果。",
      },
    ];
    assumptionsAdded.push(language === "en" ? "KPIs were not provided." : "KPI 未提供，已标为缺失。");
  }
  const assumptions = [
    ...listOf(pick(root, ["assumptions", "assumption", "caveats", "notes", "假设"]), 6, 240),
    ...assumptionsAdded,
  ].slice(0, 8);

  const candidate = {
    persona: {
      title: title || clip(summary, 40),
      summary: summary || clip(`${title}。${pain}`, 700),
      traits,
      pain: pain || notProvided,
      desire: desire || notProvided,
    },
    sellingPoints,
    channelAdvice,
    calendar,
    copies,
    actions,
    kpis,
    assumptions,
  };
  const parsed = aiCampaignSchema.safeParse(candidate);
  if (!parsed.success) return { ok: false, missing: ["persona"] };
  return { ok: true, data: parsed.data, assumptionsAdded };
}

export function missingFieldLabels(missing: string[]) {
  return missing.map((item) => MISSING_LABELS[item] ?? item).join("、");
}
