import type { CardRelation, ReasoningCard } from "./rmw-types";

export const materials = [
  { id: "m1", n: 1, meta: "Journal of Learning Analytics · 2023", title: { "zh-CN": "AI Tutor 的反馈类型与学习成效", en: "AI tutor feedback and learning outcomes" }, excerpt: { "zh-CN": "过程性反馈通常比只给结果更能促进概念理解，但效果取决于学习者已有知识。", en: "Process feedback can improve conceptual understanding, but its effect depends on prior knowledge." } },
  { id: "m2", n: 2, meta: "CHI Proceedings · 2022", title: { "zh-CN": "解释型反馈、信心与自我调节", en: "Explanatory feedback, confidence, and self-regulation" }, excerpt: { "zh-CN": "解释能增强信心，也可能在高认知负荷时造成额外负担。", en: "Explanations can strengthen confidence while adding load in demanding contexts." } },
  { id: "m3", n: 3, meta: "Educational Psychology · 2022", title: { "zh-CN": "元认知提示如何支持学习", en: "How metacognitive prompts support learning" }, excerpt: { "zh-CN": "元认知提示帮助学习者监控策略，但提示频率需要克制。", en: "Metacognitive prompts support strategy monitoring, but frequency should remain restrained." } },
  { id: "m4", n: 4, meta: "ACM TOCHI · 2023", title: { "zh-CN": "学习者差异与 AI 反馈", en: "Learner differences in AI feedback" }, excerpt: { "zh-CN": "先验知识水平会影响解释的收益与使用方式。", en: "Prior knowledge shapes both the benefit and use of AI explanations." } },
];

export const initialCards: ReasoningCard[] = [
  { id: "goal", cardType: "goal", content: { "zh-CN": "确定 AI Tutor 反馈的核心研究机制", en: "Define the core mechanism of AI tutor feedback" }, detail: { "zh-CN": "比较即时反馈、解释型反馈与元认知提示。", en: "Compare immediate, explanatory, and metacognitive feedback." }, status: "active", priority: "pinned", riskTags: [], sourceRefs: [{ id: "m1", kind: "material", label: "材料 1", anchor: "m1" }], revision: 1, generatedBy: "llm", reviewedByResearcher: true },
  { id: "hypothesis", cardType: "hypothesis", content: { "zh-CN": "元认知提示通过自我调节促进学习", en: "Metacognitive prompts improve learning through self-regulation" }, detail: { "zh-CN": "当前较强方向，但仍需检查高认知负荷下的效果。", en: "The leading framing, but its effect under high cognitive load still needs checking." }, status: "active", priority: "normal", riskTags: [], sourceRefs: [{ id: "m3", kind: "material", label: "材料 3", anchor: "m3" }], revision: 1, generatedBy: "llm", reviewedByResearcher: true },
  { id: "uncertain", cardType: "hypothesis", content: { "zh-CN": "解释型反馈在高负荷下仍然有效", en: "Explanatory feedback remains effective under high load" }, detail: { "zh-CN": "材料 2 提示可能增加负担，尚不能当作结论。", en: "Material 2 suggests added burden; do not treat this as settled." }, status: "uncertain", priority: "normal", riskTags: ["needs_verify", "high_impact"], sourceRefs: [{ id: "m2", kind: "material", label: "材料 2", anchor: "m2" }], revision: 1, generatedBy: "llm", reviewedByResearcher: true },
  { id: "constraint", cardType: "constraint", content: { "zh-CN": "必须考虑学习者先验知识差异", en: "Account for differences in learners’ prior knowledge" }, detail: { "zh-CN": "不能把所有学习者视为同质群体。", en: "Do not treat learners as a homogeneous group." }, status: "active", priority: "normal", riskTags: [], sourceRefs: [{ id: "m4", kind: "material", label: "材料 4", anchor: "m4" }], revision: 1, generatedBy: "llm", reviewedByResearcher: true },
  { id: "path", cardType: "path", content: { "zh-CN": "只增加反馈速度", en: "Only make feedback faster" }, detail: { "zh-CN": "已排除：无法解释学习机制，也可能增加依赖。", en: "Ruled out: it does not explain learning mechanisms and may increase reliance." }, status: "expired", priority: "normal", riskTags: [], sourceRefs: [{ id: "t8", kind: "chat_turn", label: "聊天第 8 轮", anchor: "t8" }], revision: 1, generatedBy: "participant", reviewedByResearcher: true },
  { id: "next", cardType: "next_action", content: { "zh-CN": "先检查材料 2 的认知负荷证据", en: "Check Material 2 for cognitive-load evidence" }, detail: { "zh-CN": "确认后再决定最终 research problem 的表述。", en: "Then decide how to frame the final research problem." }, status: "active", priority: "pinned", riskTags: [], sourceRefs: [{ id: "m2", kind: "material", label: "材料 2", anchor: "m2" }], revision: 1, generatedBy: "participant", reviewedByResearcher: true },
];

export const relations: CardRelation[] = [
  { id: "r1", sourceCardId: "hypothesis", targetCardId: "goal", relationType: "supports" },
  { id: "r2", sourceCardId: "uncertain", targetCardId: "hypothesis", relationType: "challenges" },
  { id: "r3", sourceCardId: "constraint", targetCardId: "hypothesis", relationType: "constrains" },
  { id: "r4", sourceCardId: "path", targetCardId: "goal", relationType: "rejects" },
  { id: "r5", sourceCardId: "uncertain", targetCardId: "next", relationType: "leads_to" },
];
