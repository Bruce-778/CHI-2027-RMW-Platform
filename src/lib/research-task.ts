import type { Locale } from "./rmw-types";

export type ResearchTaskId = "library" | "waste" | "bike";

export type LocalizedText = Record<Locale, string>;

export type ResearchMaterial = {
  id: string;
  n: number;
  code: string;
  meta: LocalizedText;
  title: LocalizedText;
  excerpt: LocalizedText;
};

export type ResearchTask = {
  id: ResearchTaskId;
  code: "A" | "B" | "C";
  label: LocalizedText;
  eyebrow: LocalizedText;
  question: LocalizedText;
  description: LocalizedText;
  starterMemo: LocalizedText;
  assistantIntro: LocalizedText;
  materials: ResearchMaterial[];
};

// The validated experimental stimuli are Chinese. The English interface keeps
// the Chinese body text unchanged so an unpiloted translation cannot become a
// hidden fourth task condition.
const stimulus = (text: string): LocalizedText => ({ "zh-CN": text, en: text });

const makeMaterial = (taskCode: "A" | "B" | "C", n: number, text: string): ResearchMaterial => ({
  id: `${taskCode.toLowerCase()}${n}`,
  n,
  code: `${taskCode}${n}`,
  meta: {
    "zh-CN": `实验任务材料 · ${taskCode}${n}`,
    en: `Validated Chinese stimulus · ${taskCode}${n}`,
  },
  title: {
    "zh-CN": `材料 ${taskCode}${n}`,
    en: `Material ${taskCode}${n}`,
  },
  excerpt: stimulus(text),
});

const sharedAssistantIntro: LocalizedText = {
  "zh-CN": "我会帮助你依据这 5 段材料比较问题框架，但不会替你直接完成最终 memo。你可以先提出一个初步解释；我会追问它的证据、替代解释、现实约束和仍需验证之处。",
  en: "I will help you compare problem framings using the five materials, but I will not write the final memo for you. Begin with one tentative explanation; I will ask about its evidence, alternatives, constraints, and remaining uncertainty.",
};

const starterMemo = (question: LocalizedText): LocalizedText => ({
  "zh-CN": `研究问题：${question["zh-CN"]}\n\n候选问题框架 A：\n\n候选问题框架 B：\n\n假设 1：\n\n假设 2：\n\n仍需验证的不确定点：\n\n已排除的方向及理由：\n\n下一步：`,
  en: `Research question: ${question.en}\n\nCandidate framing A:\n\nCandidate framing B:\n\nHypothesis 1:\n\nHypothesis 2:\n\nUncertainty to verify:\n\nRuled-out direction and reason:\n\nNext step:`,
});

const libraryQuestion: LocalizedText = {
  "zh-CN": "临江市持续增加图书馆网点与馆藏投入，到馆人次却连年下降。请与 AI 协作，形成一个可研究的问题框架，并规划下一步验证方式。",
  en: "Linjiang has continued to add library branches and collections, yet visits have declined for years. Work with AI to form a researchable problem framing and plan how to test it.",
};

const wasteQuestion: LocalizedText = {
  "zh-CN": "和安市持续加大垃圾分类的设施与人力投入，居民参与率显著上升，但分类正确率停滞不前。请与 AI 协作，形成一个可研究的问题框架，并规划下一步验证方式。",
  en: "He'an has increased facilities and staffing for waste sorting. Participation rose markedly, but sorting accuracy stalled. Work with AI to form a researchable problem framing and plan how to test it.",
};

const bikeQuestion: LocalizedText = {
  "zh-CN": "云谷市共享单车投放量三年翻倍，但“找不到车”与“乱停占道”的投诉同时上升。请与 AI 协作，形成一个可研究的问题框架，并规划下一步验证方式。",
  en: "Yungu doubled its shared-bike fleet in three years, yet complaints about both unavailable bikes and obstructive parking increased. Work with AI to form a researchable problem framing and plan how to test it.",
};

export const researchTasks: ResearchTask[] = [
  {
    id: "library",
    code: "A",
    label: { "zh-CN": "公共图书馆到馆量下降", en: "Declining public-library visits" },
    eyebrow: { "zh-CN": "城市公共文化服务", en: "Urban public cultural services" },
    question: libraryQuestion,
    description: {
      "zh-CN": "你将阅读 5 段关于公共图书馆投入与使用变化的材料。",
      en: "You will read five materials about public-library investment and changing use.",
    },
    starterMemo: starterMemo(libraryQuestion),
    assistantIntro: sharedAssistantIntro,
    materials: [
      makeMaterial("A", 1, "临江市自 2019 年起加大公共文化投入。分馆数量由 12 个增至 19 个，纸质馆藏由 180 万册增至 265 万册，图书馆年度财政投入累计增长 62%。然而同期年度到馆人次由 410 万降至 268 万，降幅约 35%。数字资源借阅量有所上升，但纸质与数字合计的总借阅量仍下降约 12%。市文旅局在 2024 年工作总结中将此描述为“投入与效能不匹配”，并要求相关部门提出改进方案。目前尚未形成一致的原因判断：有意见认为服务网点仍然不足，也有意见认为是阅读方式变化所致。"),
      makeMaterial("A", 2, "临江市域面积较大，人口向新城区聚集。现有 19 个分馆中，14 个位于老城区，新城区 5 个分馆需服务全市约 43% 的常住人口。以步行 15 分钟可达为口径统计，全市居民对图书馆的可达率为 31%，低于国内同等规模城市 48% 的平均水平。其中江北区常住人口约 38 万，仅设 1 个分馆。一项覆盖多个城市的研究报告显示，居民住所与最近图书馆的距离，与其年均到馆频次之间存在负相关关系。据此，部分意见主张继续增设分馆并扩大馆藏规模。"),
      makeMaterial("A", 3, "临江市新建分馆的设计仍以书架容量为主要指标。现有分馆平均阅览座位占建筑面积比例为 12%，多数分馆未设小组讨论区、可交谈区域或长时停留设施，电源插座与饮水点数量有限。2023 年市图书馆学会在 4 个分馆开展了入馆行为观察（由观察员现场记录，非问卷），累计记录 2,100 人次：平均停留时长 26 分钟；其中 63% 的到馆者在整个停留期间未取阅或借阅任何馆藏图书，主要行为为使用自带材料阅读、使用电子设备，或短暂停留后离开。"),
      makeMaterial("A", 4, "移动阅读应用在本市渗透率较高。2024 年一项面向全市居民的抽样调查显示，71% 的受访者认同“我需要的资料在网上基本能找到”，其中 18–35 岁群体这一比例达 84%。部分意见据此认为，到馆量下降主要反映资料获取方式的迁移，属于结构性趋势。\n\n需要注意的现实约束有两项：其一，市财政已明确未来三年图书馆改造专项预算固定，不再追加；其二，根据上级主管部门的服务规范与考核办法，各分馆现有馆藏面积不得压缩，馆藏总量为年度考核指标之一。"),
      makeMaterial("A", 5, "2024 年 9 月，市图书馆在 6 个分馆内发放读者问卷，回收有效问卷 1,240 份。结果显示：受访者中 60% 表示到馆的主要目的是“自习或使用空间”，18% 为借阅图书，12% 为参加活动，其余为陪同他人或其他。报告在结论部分写道：“读者需求已由借阅为主转向空间使用为主。”\n\n在近期的一次内部讨论中，有部门提出下一步应“再开展一轮到馆读者满意度调查，进一步细化空间需求”，作为改造方案的依据。"),
    ],
  },
  {
    id: "waste",
    code: "B",
    label: { "zh-CN": "垃圾分类正确率停滞", en: "Stalled waste-sorting accuracy" },
    eyebrow: { "zh-CN": "社区生活垃圾治理", en: "Community waste governance" },
    question: wasteQuestion,
    description: {
      "zh-CN": "你将阅读 5 段关于垃圾分类投入、参与和正确率的材料。",
      en: "You will read five materials about waste-sorting inputs, participation, and accuracy.",
    },
    starterMemo: starterMemo(wasteQuestion),
    assistantIntro: sharedAssistantIntro,
    materials: [
      makeMaterial("B", 1, "和安市自 2021 年起推行生活垃圾定时定点分类投放。三年间，全市投放点由 1,100 个增至 2,050 个，现场督导员由 400 人增至 950 人，宣传投入累计翻倍。居民参与率（指在统计周期内有分类投放行为的家庭比例）由 41% 升至 73%。但以抽样开袋检查为口径的分类正确率，由 52% 仅升至 58%，且最近两年基本停滞在 57%–58% 区间。因厨余垃圾中混入物比例超标，市末端处理厂在 2024 年内先后 5 次对进厂车辆作退运处理。市城管局要求各区提出针对性改进方案。"),
      makeMaterial("B", 2, "部分老旧小区投放点密度仍然偏低。全市 2,050 个投放点中，有 217 个单点服务户数超过 400 户，最高达 480 户，在早晚投放窗口期存在明显排队现象。一项在本市三个区开展的调查显示，居民住所与最近投放点的距离每增加 100 米，其分类投放正确率平均下降约 4 个百分点。排队时段的开袋抽检结果也显示，高峰期混投比例高于平峰期。据此，部分区提出应继续增设投放点、增配督导员，以缓解拥挤并加强现场指导。"),
      makeMaterial("B", 3, "现有投放点选址主要考虑清运车辆进出便利，多设于小区内部空地或近清运通道处。但居民实际投放行为集中在出门时段：早间投放量约占全天 61%，且集中于 7:00–8:00。在 12 个样本小区中，有 7 个小区的主要投放点位于与居民主要出行方向相反的一侧，居民需绕行 80–150 米。开袋抽检数据显示，这 7 个小区的正确率均值为 51%，其余 5 个小区为 64%。督导员记录中，“随手投于楼道或单元门旁”的现象在绕行距离较长的小区更为集中。"),
      makeMaterial("B", 4, "投放错误在品类上高度集中：大骨头、贝壳、椰子壳、玉米芯等常被误投入厨余垃圾；未清洗的外卖餐盒与奶茶杯的归类错误率亦较高。一项居民调查显示，对“四分类”名称的知晓率达 89%，但在给出 20 种具体物品的判别测试中，平均正确率仅为 44%。\n\n需要注意的现实约束有两项：其一，清运车辆调度与末端处理厂的接收时段固定，投放时间窗口不可自行延长；其二，督导员编制已达区级上限，不可再增加人员。"),
      makeMaterial("B", 5, "市宣传部门在 2024 年度工作汇报中写道：“全市居民分类参与率已达 73%，较推行初期提升 32 个百分点，居民分类意识已基本形成，下一阶段工作重点应转向设施保障。”\n\n在近期的一次部门协调会上，有单位提出下一步应“加大宣传投入，并再开展一轮居民分类知晓率调查”，用以评估宣传成效并指导后续投放。"),
    ],
  },
  {
    id: "bike",
    code: "C",
    label: { "zh-CN": "共享单车找车难与乱停", en: "Bike shortages and obstructive parking" },
    eyebrow: { "zh-CN": "城市共享出行治理", en: "Urban shared-mobility governance" },
    question: bikeQuestion,
    description: {
      "zh-CN": "你将阅读 5 段关于共享单车总量、分布、运维和投诉的材料。",
      en: "You will read five materials about shared-bike volume, distribution, maintenance, and complaints.",
    },
    starterMemo: starterMemo(bikeQuestion),
    assistantIntro: sharedAssistantIntro,
    materials: [
      makeMaterial("C", 1, "云谷市共享单车投放总量由 2021 年的 8 万辆增至 2024 年的 17 万辆。同期骑行订单总量增长 31%，但单车日均周转率（每辆车日均被骑行次数）由 2.8 次降至 2.1 次。市 12345 热线数据显示，“找不到可用车辆”类投诉三年间增长 22%，“车辆乱停占用人行道”类投诉增长 65%，两类投诉同时上升。市交通运输局在 2024 年专项督查中指出，投放量的增加并未同步改善市民骑行体验，要求各运营企业与属地部门提出改进方案。目前对成因尚存分歧。"),
      makeMaterial("C", 2, "早晚高峰期间，轨道交通站点周边的车辆缺口较为明显。以云谷北站为例，工作日 7:30–8:30 时段接驳骑行需求约 320 人次，而该时段站点 500 米范围内实际可用车辆约 140 辆，缺口显著。全市 32 个客流量较大的轨道站点中，有 21 个在早高峰存在类似缺口。部分运营企业据此认为，现有投放总量仍不足以覆盖高峰需求，主张继续增加投放规模，并优先向轨道站点周边倾斜。"),
      makeMaterial("C", 3, "车辆在时间与空间上的分布与需求存在明显错配。夜间静置数据显示，约 44% 的车辆沉淀在居住区外围与商业综合体周边，而早高峰需求集中于居住区至轨道站点的接驳路径。潮汐特征显著：早高峰车流由居住区流向轨道站点，晚高峰方向相反，但车辆不会自动回流。目前调度以人工为主，依赖片区经验，日均可调度车辆数约占投放总量的 6%。在调度覆盖到的区域，早高峰可用车辆满足率为 78%；未覆盖区域为 39%。"),
      makeMaterial("C", 4, "车辆运维状况亦影响可用性。抽样检测显示，故障车（含锁具失灵、轮胎亏气、脚踏损坏）约占投放总量的 9%，平均修复周期为 6 天，故障车在此期间仍占用停放区位。此外，部分区域电子围栏定位精度不足，用户在规定区域内仍无法结束订单，转而将车辆停放于围栏外。\n\n需要注意的现实约束一项：市交通运输局对共享单车实施总量配额管理，17 万辆为上限，三年内不再新增投放额度；企业只能在存量范围内调整。"),
      makeMaterial("C", 5, "某运营企业在提交的分析报告中写道：“全市单车日均周转率为 2.1 次，低于行业健康值 3.0 次，表明当前车辆投放已经过剩，建议适度回收部分车辆以提升单车效率。”\n\n在近期的一次企业与主管部门协调会上，另有意见提出下一步应“继续加大投放力度，特别是在轨道站点周边增加投放量”，以直接缓解高峰期找车难问题。"),
    ],
  },
];

export const phaseOneGoals: LocalizedText[] = [
  { "zh-CN": "比较至少两个可能的问题框架", en: "Compare at least two possible problem framings" },
  { "zh-CN": "形成至少两个假设", en: "Form at least two hypotheses" },
  { "zh-CN": "明确至少一个仍需验证的不确定点", en: "Identify at least one uncertainty that still needs verification" },
  { "zh-CN": "排除至少一个你认为不可行的方向", en: "Rule out at least one direction you consider infeasible" },
  { "zh-CN": "规划下一步要做什么", en: "Plan the next action" },
];

export const memoQuestions: LocalizedText[] = [
  { "zh-CN": "这个研究要解决什么问题？", en: "What problem will this research address?" },
  { "zh-CN": "为什么这个问题重要？", en: "Why does this problem matter?" },
  { "zh-CN": "现有做法有什么不足？", en: "What are the limitations of current approaches?" },
  { "zh-CN": "你提出的干预或方案是什么？", en: "What intervention or proposal do you offer?" },
  { "zh-CN": "你会如何设计研究来验证它？", en: "How would you design a study to evaluate it?" },
  { "zh-CN": "哪些假设目前仍不确定？", en: "Which assumptions remain uncertain?" },
];

export const taskOverview: LocalizedText = {
  "zh-CN": "你将阅读 5 段关于某一城市治理议题的材料，并与 AI 协作，形成一个可研究的问题框架。",
  en: "You will read five materials about an urban-governance issue and work with AI to develop a researchable problem framing.",
};

export function isResearchTaskId(value: string | null): value is ResearchTaskId {
  return value === "library" || value === "waste" || value === "bike";
}

export function getResearchTask(taskId: ResearchTaskId): ResearchTask {
  return researchTasks.find((task) => task.id === taskId) ?? researchTasks[0];
}

export function assignResearchTaskFromCode(participantCode: string): ResearchTaskId {
  const normalized = participantCode.trim().toUpperCase() || "RMW-DEMO";
  let hash = 2166136261;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return researchTasks[(hash >>> 0) % researchTasks.length].id;
}
