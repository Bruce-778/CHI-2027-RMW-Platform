export type Condition = "summary" | "notes" | "rmw";
export type Locale = "zh-CN" | "en";
export type CardType = "goal" | "hypothesis" | "evidence" | "constraint" | "path" | "next_action";
export type EpistemicStatus = "draft" | "active" | "uncertain" | "expired";
export type RiskTag = "needs_verify" | "inferred" | "source_conflict" | "stale" | "high_impact";
export type RelationType = "supports" | "challenges" | "constrains" | "rejects" | "leads_to";

export interface SourceRef { id: string; kind: "material" | "chat_turn" | "memo_revision" | "user_note"; label: string; excerpt?: string; anchor: string }
export interface ReasoningCard {
  id: string; cardType: CardType; content: Record<Locale, string>; detail: Record<Locale, string>;
  status: EpistemicStatus; priority: "normal" | "pinned"; riskTags: RiskTag[]; sourceRefs: SourceRef[];
  revision: number; generatedBy: "llm" | "researcher" | "participant"; reviewedByResearcher: boolean;
}
export interface CardRelation { id: string; sourceCardId: string; targetCardId: string; relationType: RelationType; }
