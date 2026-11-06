import type { Brief } from "./types";

export type ExampleScenario = {
  id: string;
  title: string;
  scene: string;
  outcome: string;
  brief: Brief;
};

export const examples: ExampleScenario[] = [
  {
    id: "skincare",
    title: "新消费护肤上市",
    scene: "敏感肌精华需要在小红书和微信建立成分信任。",
    outcome: "适合用来看品牌认知类的画像、日历和种草文案。",
    brief: {
      productName: "澄光精华",
      productDescription:
        "一款面向敏感肌的 10% 烟酰胺精华，质地清爽、无香精。希望强调 28 天可见提亮，以及皮肤科顾问参与配方。不承诺医疗效果，重点讲使用感受和成分透明。",
      targetMarket: "cn",
      targetAudience: "25–35 岁一二线城市女性，有轻微痘印，愿意为成分安全付费",
      marketingGoal: "awareness",
      budget: "20-80",
      channels: ["xiaohongshu", "wechat", "tiktok"],
      brandTone: "premium",
      outputLanguage: "zh",
    },
  },
  {
    id: "saas",
    title: "B2B SaaS 获客",
    scene: "协作软件要面向中小团队负责人收集演示预约。",
    outcome: "适合用来看线索型渠道分工、邮件文案和广告标题。",
    brief: {
      productName: "Northstar CRM",
      productDescription:
        "给 20 人以内销售团队使用的轻量客户管理系统。可在一个面板里跟踪线索、自动提醒跟进，并导出周报。主打 14 天免费试用，无需实施顾问。",
      targetMarket: "global",
      targetAudience: "中小企业销售负责人，正在用表格管理客户，担心工具太重",
      marketingGoal: "leads",
      budget: "80+",
      channels: ["linkedin", "email", "google"],
      brandTone: "professional",
      outputLanguage: "zh",
    },
  },
  {
    id: "cafe",
    title: "本地咖啡馆会员",
    scene: "社区咖啡馆希望让老客在工作日下午回来。",
    outcome: "适合用来看留存活动、会员话术和一周内容安排。",
    brief: {
      productName: "半日咖啡馆",
      productDescription:
        "社区独立咖啡馆，工作日 14:00–17:00 座位空置较多。会员可享第二杯半价，并有手冲体验名额。希望活动听起来像邻里邀请，而不是连锁促销。",
      targetMarket: "cn",
      targetAudience: "住在门店 2 公里内、每周到店 1 次以上的自由职业者和学生",
      marketingGoal: "retention",
      budget: "5-20",
      channels: ["wechat", "xiaohongshu", "instagram"],
      brandTone: "friendly",
      outputLanguage: "zh",
    },
  },
];
