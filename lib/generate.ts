import {
  BUDGETS,
  CHANNELS,
  GOALS,
  MARKETS,
  TONES,
  labelOf,
  type Brief,
  type Campaign,
  type ChannelId,
  type GoalId,
  type PlatformCopy,
  type ScoreDimension,
  type ToneId,
} from "./types";

const DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const THEMES = ["认知预热", "痛点共鸣", "产品说明", "使用场景", "社会证明", "机制说明", "行动号召"];

function clip(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max)}…`;
}

function toneLine(tone: ToneId | "") {
  switch (tone) {
    case "professional":
      return "语气保持克制，先讲事实，再讲邀请。";
    case "friendly":
      return "语气像熟人推荐，少用命令句。";
    case "bold":
      return "开头直接点出变化，句子短。";
    case "playful":
      return "可以轻一点，但不要拿产品功效开玩笑。";
    case "premium":
      return "少用促销感叹号，强调细节和取舍。";
    default:
      return "先选定一种稳定语气，再写渠道文案。";
  }
}

function goalCta(goal: GoalId | "") {
  switch (goal) {
    case "awareness":
      return "欢迎收藏，转给正在比较同类选择的人。";
    case "leads":
      return "留下职位和团队规模，我们发送一份 15 分钟演示时段。";
    case "sales":
      return "本周可通过活动页完成下单，库存与规则写在文末。";
    case "retention":
      return "老客回复「再来一杯」或会员编号，即可领取本周回访名额。";
    default:
      return "先写清读者下一步可以做什么。";
  }
}

function channelRole(id: ChannelId, goal: GoalId | "") {
  const goalLabel = labelOf(GOALS, goal);
  const map: Record<ChannelId, string> = {
    instagram: "负责视觉记忆和品牌氛围",
    tiktok: "负责前 3 秒钩子和话题扩散",
    xiaohongshu: "负责种草细节、对比和使用笔记",
    linkedin: "负责决策者信任和职业场景",
    email: "负责已有联系人的跟进与复购",
    google: "负责有明确搜索意图的人",
    wechat: "负责私域说明、会员和长文答疑",
  };
  return `${map[id]}。当前目标是「${goalLabel}」，这条渠道只承担其中一段，不承担全部转化。`;
}

function writeCopy(brief: Brief, id: ChannelId): PlatformCopy {
  const name = brief.productName.trim() || "未命名产品";
  const desc = clip(brief.productDescription, 72);
  const audience = clip(brief.targetAudience || "目标用户", 36);
  const cta = goalCta(brief.marketingGoal);
  const tone = labelOf(TONES, brief.brandTone);

  const common = `${name}：${desc || "请在简报里补充产品描述，这条文案才会更具体。"}`;

  switch (id) {
    case "instagram":
      return {
        id,
        platform: "Instagram",
        format: "图文帖",
        text: `${common}\n\n给${audience}。画面只留产品和一句使用场景，字幕使用「${tone}」语气。\n${cta}\n\n#CampaignPilotDemo #${name.replace(/\s+/g, "")}`,
      };
    case "tiktok":
      return {
        id,
        platform: "TikTok",
        format: "15 秒口播",
        text: `0–3 秒：先问${audience}是否也遇到这件事。\n3–10 秒：只讲 ${name} 的一个差别。${desc}\n10–15 秒：${cta}\n语气参考：${toneLine(brief.brandTone)}`,
      };
    case "xiaohongshu":
      return {
        id,
        platform: "小红书",
        format: "笔记",
        text: `标题：${audience}可以先看这 3 点｜${name}\n\n1. 它解决什么：${desc || "待补充"}\n2. 适合谁：${audience}\n3. 不适合期待什么：这是 Demo 文案，不替代真实测评。\n\n${cta}`,
      };
    case "linkedin":
      return {
        id,
        platform: "LinkedIn",
        format: "专业帖",
        text: `我们正在为${audience}整理一套更轻的做法。\n\n${name} 的简报要点：${desc || "待补充产品描述。"}\n\n如果贵团队的目标和「${labelOf(GOALS, brief.marketingGoal)}」一致，${cta}\n\n（Demo 文案，由本地模板生成）`,
      };
    case "email":
      return {
        id,
        platform: "邮件",
        format: "主题 + 正文",
        text: `主题：${name}｜给${audience}的一个下一步\n\n你好，\n\n${desc || "这里会放产品描述。"}\n\n这封信只做一件事：${cta}\n\nCampaignPilot Demo`,
      };
    case "google":
      return {
        id,
        platform: "Google Ads",
        format: "标题 + 描述",
        text: `标题 1：${clip(name, 20)}\n标题 2：${clip(labelOf(GOALS, brief.marketingGoal), 20)}\n标题 3：面向${clip(audience, 16)}\n描述：${clip(desc || "补充产品描述后，广告描述会更具体。", 80)} ${cta}`,
      };
    case "wechat":
      return {
        id,
        platform: "微信",
        format: "公众号导语",
        text: `${audience}，这篇只讲 ${name}。\n\n${desc || "产品描述尚未填写。"}\n\n文末保留一个动作：${cta}\n语气：${tone}。本文为 Demo 模板，不是模型生成。`,
      };
  }
}

export function scoreBrief(brief: Brief): { evaluation: ScoreDimension[]; overall: number } {
  const fields = [
    ["产品名称", brief.productName.trim().length > 0],
    ["产品描述", brief.productDescription.trim().length > 0],
    ["目标市场", brief.targetMarket !== ""],
    ["目标用户", brief.targetAudience.trim().length > 0],
    ["营销目标", brief.marketingGoal !== ""],
    ["预算", brief.budget !== ""],
    ["营销渠道", brief.channels.length > 0],
    ["品牌语气", brief.brandTone !== ""],
  ] as const;
  const filled = fields.filter(([, ok]) => ok);
  const completeness = Math.round((filled.length / fields.length) * 100);

  let brand = 35;
  const brandEvidence: string[] = [];
  if (brief.brandTone) {
    brand += 25;
    brandEvidence.push(`已选择语气「${labelOf(TONES, brief.brandTone)}」，规则加 25 分。`);
  } else {
    brandEvidence.push("未选择品牌语气，一致性分保持在基础分。");
  }
  const descLen = brief.productDescription.trim().length;
  if (descLen >= 40) {
    brand += 20;
    brandEvidence.push(`产品描述 ${descLen} 字，达到 40 字，规则加 20 分。`);
  } else {
    brandEvidence.push(`产品描述 ${descLen} 字，少于 40 字，未获得描述加分。`);
  }
  if (descLen >= 120) {
    brand += 10;
    brandEvidence.push("描述达到 120 字，再加 10 分。");
  }
  if (brief.productName.trim().length >= 2) {
    brand += 10;
    brandEvidence.push("产品名称不少于 2 个字，加 10 分。");
  }
  brand = Math.min(100, brand);

  let channel = brief.channels.length === 0 ? 20 : brief.channels.length === 1 ? 55 : 70;
  const channelEvidence = [
    brief.channels.length === 0
      ? "没有渠道，基础分 20。"
      : brief.channels.length === 1
        ? "只选了 1 个渠道，基础分 55。建议 2–4 个以便分工。"
        : brief.channels.length <= 4
          ? `选择了 ${brief.channels.length} 个渠道，基础分 70。`
          : `选择了 ${brief.channels.length} 个渠道，超过 4 个，基础分降为 62，避免分散。`,
  ];
  if (brief.channels.length > 4) channel = 62;
  if (brief.channels.length >= 2 && brief.channels.length <= 4) {
    channel += 18;
    channelEvidence.push("渠道数量落在 2–4 个，加 18 分。");
  }
  const fitPairs: Record<string, ChannelId[]> = {
    awareness: ["tiktok", "instagram", "xiaohongshu"],
    leads: ["email", "linkedin", "google"],
    sales: ["google", "wechat", "email"],
    retention: ["email", "wechat"],
  };
  const wanted = brief.marketingGoal ? fitPairs[brief.marketingGoal] : [];
  const matched = brief.channels.filter((id) => wanted.includes(id));
  if (matched.length > 0) {
    channel += 8;
    channelEvidence.push(
      `目标「${labelOf(GOALS, brief.marketingGoal)}」与 ${matched
        .map((id) => labelOf(CHANNELS, id))
        .join("、")} 匹配，加 8 分。`,
    );
  } else if (brief.marketingGoal && brief.channels.length > 0) {
    channelEvidence.push("当前渠道和目标的预设搭配没有重合，没有匹配加分。");
  }
  channel = Math.min(100, channel);

  let execution = 25;
  const executionEvidence = ["从 25 分起算，按字段是否足够执行来加分。"];
  if (brief.budget) {
    execution += 20;
    executionEvidence.push(`已填写预算「${labelOf(BUDGETS, brief.budget)}」，加 20 分。`);
  }
  if (brief.marketingGoal) {
    execution += 15;
    executionEvidence.push("已填写营销目标，加 15 分。");
  }
  if (brief.channels.length > 0) {
    execution += 15;
    executionEvidence.push("已选择渠道，加 15 分。");
  }
  if (descLen >= 30) {
    execution += 15;
    executionEvidence.push("描述不少于 30 字，加 15 分。");
  }
  if (brief.targetAudience.trim().length >= 8) {
    execution += 10;
    executionEvidence.push("目标用户不少于 8 个字，加 10 分。");
  }
  execution = Math.min(100, execution);

  const evaluation: ScoreDimension[] = [
    {
      id: "completeness",
      label: "信息完整性",
      score: completeness,
      summary: `${filled.length} / ${fields.length} 个字段已填写。`,
      evidence: fields.map(([label, ok]) => `${ok ? "已填" : "未填"}：${label}`),
    },
    {
      id: "brand",
      label: "品牌一致性",
      score: brand,
      summary: toneLine(brief.brandTone),
      evidence: brandEvidence,
    },
    {
      id: "channel",
      label: "渠道适配度",
      score: channel,
      summary:
        brief.channels.length > 0
          ? `已选 ${brief.channels.map((id) => labelOf(CHANNELS, id)).join("、")}。`
          : "尚未选择渠道。",
      evidence: channelEvidence,
    },
    {
      id: "execution",
      label: "可执行性",
      score: execution,
      summary: "看预算、目标、渠道和描述是否够让团队开始排期。",
      evidence: executionEvidence,
    },
  ];

  const overall = Math.round(
    evaluation.reduce((sum, item) => sum + item.score, 0) / evaluation.length,
  );
  return { evaluation, overall };
}

export function generateCampaign(brief: Brief): Campaign {
  const market = labelOf(MARKETS, brief.targetMarket);
  const audience = brief.targetAudience.trim() || "尚未描述的目标用户";
  const name = brief.productName.trim() || "未命名产品";
  const goal = labelOf(GOALS, brief.marketingGoal);
  const channels = brief.channels;

  const persona = {
    title: `${market} · ${clip(audience, 28)}`,
    summary: `${name} 的 Demo 画像把「${audience}」放在「${market}」。他们会因为「${goal}」相关的信息停留，但还需要一个具体下一步。`,
    traits: [
      `市场：${market}`,
      `语气偏好：${labelOf(TONES, brief.brandTone)}`,
      `预算带：${labelOf(BUDGETS, brief.budget)}`,
    ],
    pain: brief.productDescription.trim()
      ? `从描述中抽出的关注点：${clip(brief.productDescription, 48)}`
      : "简报还没有产品描述，痛点只能先留空。",
    desire: `希望在不增加太多决策成本的情况下，完成「${goal}」。`,
  };

  const sellingPoints = [
    brief.productDescription.trim()
      ? `产品事实：${clip(brief.productDescription, 64)}`
      : "产品事实尚未填写，生成结果用了占位句。",
    `目标差异：沟通要服务于「${goal}」，而不是同时承诺所有结果。`,
    `语气约束：${toneLine(brief.brandTone)}`,
    `范围约束：优先覆盖 ${channels.map((id) => labelOf(CHANNELS, id)).join("、")}，其余平台本次不写。`,
  ];

  const channelAdvice = channels.map((id) => ({
    channelId: id,
    label: labelOf(CHANNELS, id),
    role: id === "google" ? "截取主动搜索" : id === "email" ? "跟进已有关系" : "建立场景认知",
    suggestion: channelRole(id, brief.marketingGoal),
  }));

  const calendar = DAYS.map((day, index) => {
    const channelId = channels[index % channels.length];
    return {
      day,
      channelLabel: labelOf(CHANNELS, channelId),
      theme: THEMES[index],
      action: `${THEMES[index]}：用「${toneLine(brief.brandTone)}」写一条 ${labelOf(CHANNELS, channelId)} 内容，产品只出现 ${name}。`,
    };
  });

  const copies = channels.map((id) => writeCopy(brief, id));
  const { evaluation, overall } = scoreBrief(brief);

  return {
    generatedAt: new Date().toISOString(),
    source: "demo",
    briefSnapshot: {
      ...brief,
      channels: [...brief.channels],
      outputLanguage: brief.outputLanguage || "zh",
    },
    persona,
    sellingPoints,
    channelAdvice,
    calendar,
    copies,
    actions: [
      "确认这条 Demo 只用于看页面流程。",
      "如果要得到针对这份简报的新内容，请改用 DeepSeek 生成。",
    ],
    kpis: [
      {
        name: "是否完成发布",
        description: "只记录有没有发出内容。这不是转化率，也不能当作营销效果。",
      },
    ],
    assumptions: ["当前结果来自本地模板，没有调用 DeepSeek。"],
    evaluation,
    overall,
  };
}

export function briefsEqual(a: Brief, b: Brief) {
  const normalize = (brief: Brief) => ({
    ...brief,
    productName: brief.productName.trim(),
    productDescription: brief.productDescription.trim(),
    targetAudience: brief.targetAudience.trim(),
    channels: [...brief.channels].sort(),
  });
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

export const GENERATE_STEPS = [
  "正在读取你保存的活动简报",
  "正在按模板整理用户画像",
  "正在匹配渠道与一周日历",
  "正在套用多平台文案模板",
];
