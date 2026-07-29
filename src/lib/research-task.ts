import type { Locale } from "./rmw-types";

export type ResearchTaskId = "waste";
export type LocalizedText = Record<Locale, string>;
export type PhaseOneGoal = {
  id: string;
  title: LocalizedText;
  criteria: LocalizedText[];
};

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
  code: "B";
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
// hidden task condition.
const stimulus = (text: string): LocalizedText => ({ "zh-CN": text, en: text });

const makeMaterial = (n: number, text: string): ResearchMaterial => ({
  id: `b${n}`,
  n,
  code: `B${n}`,
  meta: {
    "zh-CN": `实验任务材料 · B${n}`,
    en: `Validated Chinese stimulus · B${n}`,
  },
  title: {
    "zh-CN": `材料 B${n}`,
    en: `Material B${n}`,
  },
  excerpt: stimulus(text),
});

const wasteQuestion: LocalizedText = {
  "zh-CN": "和安市持续加大垃圾分类的设施与人力投入，居民参与率显著上升，但分类正确率停滞不前。请与 AI 协作，形成一个可研究的问题框架，并规划下一步验证方式。",
  en: "He'an has increased facilities and staffing for waste sorting. Participation rose markedly, but sorting accuracy stalled. Work with AI to form a researchable problem framing and plan how to test it.",
};

const starterMemo: LocalizedText = {
  "zh-CN": `研究问题：${wasteQuestion["zh-CN"]}\n\n候选问题框架 A：\n\n候选问题框架 B：\n\n假设 1：\n\n假设 2：\n\n仍需验证的不确定点：\n\n已排除的方向及理由：\n\n下一步：`,
  en: `Research question: ${wasteQuestion.en}\n\nCandidate framing A:\n\nCandidate framing B:\n\nHypothesis 1:\n\nHypothesis 2:\n\nUncertainty to verify:\n\nRuled-out direction and reason:\n\nNext step:`,
};

export const researchTask: ResearchTask = {
  id: "waste",
  code: "B",
  label: { "zh-CN": "垃圾分类正确率停滞", en: "Stalled waste-sorting accuracy" },
  eyebrow: { "zh-CN": "社区生活垃圾治理", en: "Community waste governance" },
  question: wasteQuestion,
  description: {
    "zh-CN": "你将阅读 5 段关于垃圾分类投入、参与和正确率的材料。",
    en: "You will read five materials about waste-sorting inputs, participation, and accuracy.",
  },
  starterMemo,
  assistantIntro: {
    "zh-CN": "我会帮助你依据这 5 段材料比较问题框架，但不会替你直接完成最终 memo。你可以先提出一个初步解释；我会追问它的证据、替代解释、现实约束和仍需验证之处。",
    en: "I will help you compare problem framings using the five materials, but I will not write the final memo for you. Begin with one tentative explanation; I will ask about its evidence, alternatives, constraints, and remaining uncertainty.",
  },
  materials: [
    makeMaterial(1, "和安市自 2021 年起推行生活垃圾定时定点分类投放。三年间，全市投放点由 1,100 个增至 2,050 个，现场督导员由 400 人增至 950 人，宣传投入累计翻倍。居民参与率（指在统计周期内有分类投放行为的家庭比例）由 41% 升至 73%。但以抽样开袋检查为口径的分类正确率，由 52% 仅升至 58%，且最近两年基本停滞在 57%–58% 区间。因厨余垃圾中混入物比例超标，市末端处理厂在 2024 年内先后 5 次对进厂车辆作退运处理。市城管局要求各区提出针对性改进方案。"),
    makeMaterial(2, "部分老旧小区投放点密度仍然偏低。全市 2,050 个投放点中，有 217 个单点服务户数超过 400 户，最高达 480 户，在早晚投放窗口期存在明显排队现象。一项在本市三个区开展的调查显示，居民住所与最近投放点的距离每增加 100 米，其分类投放正确率平均下降约 4 个百分点。排队时段的开袋抽检结果也显示，高峰期混投比例高于平峰期。据此，部分区提出应继续增设投放点、增配督导员，以缓解拥挤并加强现场指导。"),
    makeMaterial(3, "现有投放点选址主要考虑清运车辆进出便利，多设于小区内部空地或近清运通道处。但居民实际投放行为集中在出门时段：早间投放量约占全天 61%，且集中于 7:00–8:00。在 12 个样本小区中，有 7 个小区的主要投放点位于与居民主要出行方向相反的一侧，居民需绕行 80–150 米。开袋抽检数据显示，这 7 个小区的正确率均值为 51%，其余 5 个小区为 64%。督导员记录中，“随手投于楼道或单元门旁”的现象在绕行距离较长的小区更为集中。"),
    makeMaterial(4, "投放错误在品类上高度集中：大骨头、贝壳、椰子壳、玉米芯等常被误投入厨余垃圾；未清洗的外卖餐盒与奶茶杯的归类错误率亦较高。一项居民调查显示，对“四分类”名称的知晓率达 89%，但在给出 20 种具体物品的判别测试中，平均正确率仅为 44%。\n\n需要注意的现实约束有两项：其一，清运车辆调度与末端处理厂的接收时段固定，投放时间窗口不可自行延长；其二，督导员编制已达区级上限，不可再增加人员。"),
    makeMaterial(5, "市宣传部门在 2024 年度工作汇报中写道：“全市居民分类参与率已达 73%，较推行初期提升 32 个百分点，居民分类意识已基本形成，下一阶段工作重点应转向设施保障。”\n\n在近期的一次部门协调会上，有单位提出下一步应“加大宣传投入，并再开展一轮居民分类知晓率调查”，用以评估宣传成效并指导后续投放。"),
  ],
};

export const researchTasks: ResearchTask[] = [researchTask];

export const phaseOneGoals: PhaseOneGoal[] = [
  {
    id: "problem-framing",
    title: { "zh-CN": "目标一：比较并界定问题框架", en: "Goal 1: Compare and define problem framings" },
    criteria: [
      { "zh-CN": "比较至少两个可能的问题框架", en: "Compare at least two possible problem framings" },
      { "zh-CN": "说明每个框架的材料依据和核心差异", en: "State the material basis and central difference for each framing" },
      { "zh-CN": "排除至少一个不可行方向，并说明理由", en: "Rule out at least one infeasible direction and explain why" },
    ],
  },
  {
    id: "hypotheses",
    title: { "zh-CN": "目标二：形成可验证的解释", en: "Goal 2: Develop testable explanations" },
    criteria: [
      { "zh-CN": "形成至少两个可验证的假设", en: "Form at least two testable hypotheses" },
      { "zh-CN": "区分材料证据、你的推断与假设", en: "Distinguish material evidence, your inference, and hypotheses" },
      { "zh-CN": "明确至少一个仍需验证的不确定点", en: "Identify at least one uncertainty that still needs verification" },
    ],
  },
  {
    id: "next-step",
    title: { "zh-CN": "目标三：规划下一步验证", en: "Goal 3: Plan the next validation step" },
    criteria: [
      { "zh-CN": "提出一个符合现实约束的最小下一步", en: "Propose one minimum next step that respects real-world constraints" },
      { "zh-CN": "说明需要收集的数据或证据", en: "Specify the data or evidence that should be collected" },
      { "zh-CN": "说明如何判断假设得到支持或被否定", en: "Explain how the hypothesis would be supported or rejected" },
    ],
  },
];

export const taskOverview: LocalizedText = {
  "zh-CN": "你将阅读 5 段关于城市垃圾分类治理的材料，并与 AI 协作，形成一个可研究的问题框架。",
  en: "You will read five materials about urban waste-sorting governance and work with AI to develop a researchable problem framing.",
};

export function getResearchTask(taskId: ResearchTaskId = "waste"): ResearchTask {
  void taskId;
  return researchTask;
}
