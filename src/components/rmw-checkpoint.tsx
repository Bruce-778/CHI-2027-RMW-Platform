"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Brain,
  Check,
  CheckCircle,
  Clock,
  LinkSimple,
  NotePencil,
  PauseCircle,
  PushPin,
  Sparkle,
  Target,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { eventLog } from "@/lib/event-log";
import type { EpistemicStatus, Locale } from "@/lib/rmw-types";

type CaptureKind = "goal" | "hypothesis" | "evidence" | "constraint" | "path" | "next_action";
type GoalLevel = "main" | "subgoal" | "suspended";

interface CaptureCard {
  id: string;
  kind: CaptureKind;
  goalLevel?: GoalLevel;
  content: Record<Locale, string>;
  detail: Record<Locale, string>;
  status: EpistemicStatus;
  priority: "normal" | "pinned";
  confidence: number;
  source: Record<Locale, string>;
  why: Record<Locale, string>;
  reviewed: boolean;
}

const captureCards: CaptureCard[] = [
  {
    id: "main-goal",
    kind: "goal",
    goalLevel: "main",
    content: { "zh-CN": "确定 AI Tutor 反馈的核心研究机制", en: "Define the core mechanism of AI tutor feedback" },
    detail: { "zh-CN": "比较即时反馈、解释型反馈与元认知提示。", en: "Compare immediate, explanatory, and metacognitive feedback." },
    status: "active",
    priority: "pinned",
    confidence: 94,
    source: { "zh-CN": "研究备忘录第 1 段 + 聊天第 4、7 轮", en: "Memo paragraph 1 + chat turns 4 and 7" },
    why: { "zh-CN": "它是当前所有子目标共同指向的唯一主线。", en: "It is the single goal shared by all active subgoals." },
    reviewed: true,
  },
  {
    id: "subgoal-mechanism",
    kind: "goal",
    goalLevel: "subgoal",
    content: { "zh-CN": "比较三种反馈机制", en: "Compare three feedback mechanisms" },
    detail: { "zh-CN": "当前活跃，已完成初步材料对照。", en: "Active; initial evidence comparison is complete." },
    status: "active",
    priority: "normal",
    confidence: 91,
    source: { "zh-CN": "材料 1、2、3", en: "Materials 1, 2, and 3" },
    why: { "zh-CN": "这是主目标当前正在执行的分解步骤。", en: "This is the currently executing decomposition of the main goal." },
    reviewed: true,
  },
  {
    id: "subgoal-load",
    kind: "goal",
    goalLevel: "subgoal",
    content: { "zh-CN": "验证高认知负荷下的效果", en: "Test the effect under high cognitive load" },
    detail: { "zh-CN": "材料 2 给出冲突信号，需要回源。", en: "Material 2 gives a conflicting signal that needs verification." },
    status: "uncertain",
    priority: "normal",
    confidence: 73,
    source: { "zh-CN": "材料 2 + 聊天第 8 轮", en: "Material 2 + chat turn 8" },
    why: { "zh-CN": "它决定解释型反馈能否进入最终 framing。", en: "It determines whether explanatory feedback belongs in the final framing." },
    reviewed: false,
  },
  {
    id: "subgoal-prior",
    kind: "goal",
    goalLevel: "subgoal",
    content: { "zh-CN": "控制学习者先验知识差异", en: "Control for learner prior knowledge" },
    detail: { "zh-CN": "需要转化为实验设计约束。", en: "Needs to become an explicit study constraint." },
    status: "active",
    priority: "normal",
    confidence: 86,
    source: { "zh-CN": "材料 1、4", en: "Materials 1 and 4" },
    why: { "zh-CN": "忽略它会混淆反馈机制的效果。", en: "Ignoring it would confound the effect of feedback mechanism." },
    reviewed: false,
  },
  {
    id: "suspended-longitudinal",
    kind: "goal",
    goalLevel: "suspended",
    content: { "zh-CN": "是否加入长期学习保持指标", en: "Whether to add a long-term retention measure" },
    detail: { "zh-CN": "暂时不做，等核心机制稳定后再返回。", en: "Deferred until the core mechanism is stable." },
    status: "active",
    priority: "normal",
    confidence: 82,
    source: { "zh-CN": "聊天第 10 轮", en: "Chat turn 10" },
    why: { "zh-CN": "它仍有价值，但现在展开会偏离主线。", en: "It remains useful, but pursuing it now would distract from the main line." },
    reviewed: true,
  },
  {
    id: "suspended-domain",
    kind: "goal",
    goalLevel: "suspended",
    content: { "zh-CN": "是否扩展到一般知识工作", en: "Whether to generalize to knowledge work" },
    detail: { "zh-CN": "当前研究先聚焦学习场景。", en: "The current study remains focused on learning." },
    status: "active",
    priority: "normal",
    confidence: 79,
    source: { "zh-CN": "研究备忘录第 3 段", en: "Memo paragraph 3" },
    why: { "zh-CN": "保存分支，防止恢复后重复争论研究范围。", en: "Preserves the branch so scope is not debated again after resumption." },
    reviewed: true,
  },
  {
    id: "uncertain-hypothesis",
    kind: "hypothesis",
    content: { "zh-CN": "解释型反馈在高负荷下仍然有效", en: "Explanatory feedback remains effective under high load" },
    detail: { "zh-CN": "系统推断，材料 2 反而提示可能增加负担。", en: "System-inferred; Material 2 instead suggests added burden." },
    status: "uncertain",
    priority: "normal",
    confidence: 58,
    source: { "zh-CN": "聊天第 8 轮；材料 2", en: "Chat turn 8; Material 2" },
    why: { "zh-CN": "高影响且证据冲突，恢复后必须先核查。", en: "High-impact and source-conflicted; it must be verified before reuse." },
    reviewed: false,
  },
  {
    id: "rejected-speed",
    kind: "path",
    content: { "zh-CN": "只把 AI Tutor 定义为更快提供反馈", en: "Frame the AI tutor only as faster feedback" },
    detail: { "zh-CN": "已排除：无法解释学习机制，也可能增加依赖。", en: "Rejected: it does not explain learning and may increase reliance." },
    status: "expired",
    priority: "normal",
    confidence: 95,
    source: { "zh-CN": "聊天第 5、9 轮", en: "Chat turns 5 and 9" },
    why: { "zh-CN": "保存被排除路径，避免恢复后重复走回去。", en: "Keeps the rejected path visible so it is not repeated after interruption." },
    reviewed: true,
  },
  {
    id: "next-action",
    kind: "next_action",
    content: { "zh-CN": "先检查材料 2 的认知负荷证据", en: "First, check Material 2 for cognitive-load evidence" },
    detail: { "zh-CN": "确认后再决定最终 research problem 的表述。", en: "Then decide how to frame the final research problem." },
    status: "active",
    priority: "pinned",
    confidence: 92,
    source: { "zh-CN": "聊天第 8 轮 + 当前阅读位置 p.6", en: "Chat turn 8 + current reading position p.6" },
    why: { "zh-CN": "这是回来后最小、可立即执行且能解除不确定性的动作。", en: "This is the smallest executable action that resolves the key uncertainty." },
    reviewed: false,
  },
];

const labels = {
  "zh-CN": {
    title: "保存当前推理位置",
    subtitle: "系统从聊天、材料、备忘录和操作轨迹中提取了候选状态。请在切换任务前快速校准。",
    task: "主任务",
    save: "保存窗口",
    break: "中断任务",
    resume: "恢复",
    prompt: "回来后先继续哪一步？",
    suggested: "系统建议的最小下一步",
    main: "主目标",
    active: "活跃子目标",
    suspended: "挂起目标",
    resolved: "已排除路径",
    candidates: "候选 Problem State",
    evidence: "来源",
    why: "为什么被保存",
    confidence: "提取置信度",
    accept: "接受",
    edit: "编辑",
    pin: "置顶",
    uncertain: "存疑",
    expire: "过期",
    saveAndBreak: "保存并进入中断任务",
    reviewed: "已校准",
    cards: "张卡片",
    notMind: "RMW 只提出候选状态，不声称读取了你的真实想法。",
    interruption: "中断任务",
    nback: "2-back 工作记忆任务",
    nbackHint: "判断当前字母是否与前两个字母相同。",
    same: "相同",
    different: "不同",
    trial: "试次",
    accuracy: "当前正确率",
    finish: "结束中断并进入无辅助回忆",
  },
  en: {
    title: "Save your reasoning position",
    subtitle: "The system extracted candidate state from chat, materials, memo, and interaction traces. Calibrate it before switching tasks.",
    task: "Primary task",
    save: "Save window",
    break: "Interruption",
    resume: "Resume",
    prompt: "What is the first thing you should continue?",
    suggested: "Suggested minimum next action",
    main: "Main goal",
    active: "Active subgoals",
    suspended: "Suspended goals",
    resolved: "Rejected path",
    candidates: "Candidate problem state",
    evidence: "Source",
    why: "Why it was captured",
    confidence: "Extraction confidence",
    accept: "Accept",
    edit: "Edit",
    pin: "Pin",
    uncertain: "Uncertain",
    expire: "Expire",
    saveAndBreak: "Save and begin interruption",
    reviewed: "calibrated",
    cards: "cards",
    notMind: "RMW proposes candidate state; it does not claim access to your mind.",
    interruption: "Interruption task",
    nback: "2-back working-memory task",
    nbackHint: "Judge whether the current letter matches the letter two positions back.",
    same: "Same",
    different: "Different",
    trial: "Trial",
    accuracy: "Accuracy",
    finish: "Finish interruption and begin unsupported recall",
  },
};

function Timeline({ locale, active }: { locale: Locale; active: "save" | "break" | "resume" }) {
  const t = labels[locale];
  const steps = [
    { id: "task", label: t.task },
    { id: "save", label: t.save },
    { id: "break", label: t.break },
    { id: "resume", label: t.resume },
  ];
  const activeIndex = steps.findIndex((step) => step.id === active);
  return (
    <div className="grid grid-cols-4 rounded-xl border bg-white p-2 shadow-sm">
      {steps.map((step, index) => (
        <div key={step.id} className="relative flex items-center gap-3 px-4 py-2">
          {index > 0 && <div className="absolute -left-2 top-1/2 h-px w-4 bg-border" />}
          <span className={`grid size-7 place-items-center rounded-full text-xs font-semibold ${index <= activeIndex ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
            {index < activeIndex ? <Check size={14} /> : index + 1}
          </span>
          <span className={`text-xs font-medium ${step.id === active ? "text-primary" : "text-muted-foreground"}`}>{step.label}</span>
        </div>
      ))}
    </div>
  );
}

function GoalTile({ card, locale, selected, onClick }: { card: CaptureCard; locale: Locale; selected: boolean; onClick: () => void }) {
  const statusStyle = card.status === "uncertain"
    ? "border-amber-200 bg-amber-50/70"
    : card.status === "expired"
      ? "border-slate-200 bg-slate-50 text-slate-500"
      : "border-emerald-200 bg-emerald-50/55";
  return (
    <button onClick={onClick} className={`w-full rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${statusStyle} ${selected ? "ring-2 ring-primary/25" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider">{card.status}</span>
        {card.priority === "pinned" && <PushPin size={14} weight="fill" className="text-primary" />}
      </div>
      <p className="mt-2 text-sm font-semibold leading-5 text-foreground">{card.content[locale]}</p>
    </button>
  );
}

export function RmwCheckpoint({ locale, onContinue }: { locale: Locale; onContinue: () => void }) {
  const t = labels[locale];
  const [cards, setCards] = useState(captureCards);
  const [selectedId, setSelectedId] = useState("next-action");
  const [editing, setEditing] = useState(false);
  const selected = cards.find((card) => card.id === selectedId) || cards[0];
  const [draft, setDraft] = useState(selected.content[locale]);
  const reviewedCount = cards.filter((card) => card.reviewed).length;

  const update = (id: string, patch: Partial<CaptureCard>, action: string) => {
    setCards((current) => current.map((card) => card.id === id ? { ...card, ...patch, reviewed: true } : card));
    eventLog(action, patch, { stage: "checkpoint", targetType: "reasoning_card", targetId: id });
  };
  const select = (id: string) => {
    const card = cards.find((item) => item.id === id);
    if (!card) return;
    setSelectedId(id);
    setDraft(card.content[locale]);
    setEditing(false);
    eventLog("checkpoint_card_selected", {}, { stage: "checkpoint", targetType: "reasoning_card", targetId: id });
  };
  const saveEdit = () => {
    setCards((current) => current.map((card) => card.id === selected.id ? {
      ...card,
      content: { ...card.content, [locale]: draft },
      reviewed: true,
    } : card));
    eventLog("checkpoint_card_edited", { locale }, { stage: "checkpoint", targetType: "reasoning_card", targetId: selected.id });
    setEditing(false);
  };
  const mainGoal = cards.find((card) => card.goalLevel === "main")!;
  const activeGoals = cards.filter((card) => card.goalLevel === "subgoal").slice(0, 4);
  const suspendedGoals = cards.filter((card) => card.goalLevel === "suspended").slice(0, 3);
  const rejected = cards.find((card) => card.kind === "path")!;
  const nextAction = cards.find((card) => card.kind === "next_action")!;

  return (
    <div className="min-h-screen bg-[#f7f6f2] px-6 py-5">
      <div className="mx-auto max-w-[1480px]">
        <Timeline locale={locale} active="save" />
        <header className="flex items-end justify-between py-6">
          <div>
            <Badge variant="secondary" className="mb-3"><Sparkle size={14} /> RMW save point</Badge>
            <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t.subtitle}</p>
          </div>
          <div className="rounded-xl border bg-white px-4 py-3 text-right">
            <p className="text-2xl font-semibold">{reviewedCount} / {cards.length}</p>
            <p className="text-xs text-muted-foreground">{t.reviewed}</p>
          </div>
        </header>

        <section className="mb-5 grid grid-cols-[1fr_1.35fr] gap-5">
          <article className="rounded-2xl border bg-white p-5 shadow-[0_12px_40px_rgba(35,43,70,.05)]">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-primary text-white"><ArrowRight size={21} /></span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{t.prompt}</p>
                <p className="text-xs text-muted-foreground">{t.suggested}</p>
              </div>
            </div>
            <p className="mt-5 text-xl font-semibold leading-7">{nextAction.content[locale]}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{nextAction.detail[locale]}</p>
            <div className="mt-5 flex gap-2">
              <Button size="sm" onClick={() => update(nextAction.id, { status: "active" }, "checkpoint_card_accepted")}><Check />{t.accept}</Button>
              <Button size="sm" variant="outline" onClick={() => { select(nextAction.id); setEditing(true); }}><NotePencil />{t.edit}</Button>
              <Button size="sm" variant="outline" onClick={() => update(nextAction.id, { priority: nextAction.priority === "pinned" ? "normal" : "pinned" }, "checkpoint_card_pin_toggled")}><PushPin />{t.pin}</Button>
            </div>
          </article>
          <article className="rounded-2xl border bg-white p-5 shadow-[0_12px_40px_rgba(35,43,70,.05)]">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.main}</p>
              <Badge variant="outline"><Target size={13} />1</Badge>
            </div>
            <GoalTile card={mainGoal} locale={locale} selected={selectedId === mainGoal.id} onClick={() => select(mainGoal.id)} />
            <div className="mt-4 grid grid-cols-[1.15fr_.85fr_.7fr] gap-3">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t.active} · {activeGoals.length}/4</p>
                <div className="space-y-2">{activeGoals.map((card) => <GoalTile key={card.id} card={card} locale={locale} selected={selectedId === card.id} onClick={() => select(card.id)} />)}</div>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t.suspended} · {suspendedGoals.length}/3</p>
                <div className="space-y-2">{suspendedGoals.map((card) => <GoalTile key={card.id} card={card} locale={locale} selected={selectedId === card.id} onClick={() => select(card.id)} />)}</div>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t.resolved}</p>
                <GoalTile card={rejected} locale={locale} selected={selectedId === rejected.id} onClick={() => select(rejected.id)} />
              </div>
            </div>
          </article>
        </section>

        <section className="grid min-h-[360px] grid-cols-[1.15fr_.85fr] overflow-hidden rounded-2xl border bg-white shadow-[0_12px_40px_rgba(35,43,70,.05)]">
          <div className="border-r p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">{t.candidates}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{t.notMind}</p>
              </div>
              <Badge variant="secondary">{cards.length} {t.cards}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {cards.map((card) => (
                <button key={card.id} onClick={() => select(card.id)} className={`rounded-xl border p-3 text-left transition ${selectedId === card.id ? "border-primary bg-secondary/60 ring-2 ring-primary/15" : "hover:bg-muted/50"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{card.goalLevel || card.kind}</span>
                    <span className={`size-2 rounded-full ${card.reviewed ? "bg-emerald-500" : "bg-amber-400"}`} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5">{card.content[locale]}</p>
                </button>
              ))}
            </div>
          </div>
          <aside className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selected.goalLevel || selected.kind}</Badge>
                  {selected.priority === "pinned" && <PushPin size={15} weight="fill" className="text-primary" />}
                </div>
                {editing ? (
                  <Textarea className="mt-4 min-h-24 text-sm leading-6" value={draft} onChange={(event) => setDraft(event.target.value)} />
                ) : (
                  <h3 className="mt-4 text-lg font-semibold leading-7">{selected.content[locale]}</h3>
                )}
              </div>
              <span className={`flex items-center gap-1 text-xs font-semibold ${selected.status === "uncertain" ? "text-amber-700" : selected.status === "expired" ? "text-slate-500" : "text-emerald-700"}`}>
                {selected.status === "uncertain" ? <WarningCircle /> : selected.status === "expired" ? <PauseCircle /> : <CheckCircle />}
                {selected.status}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{selected.detail[locale]}</p>
            <div className="mt-5 rounded-xl bg-muted/55 p-4">
              <div className="flex gap-3"><LinkSimple className="mt-0.5 shrink-0 text-primary" /><div><p className="text-xs font-semibold">{t.evidence}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{selected.source[locale]}</p></div></div>
              <div className="mt-4 flex gap-3"><Brain className="mt-0.5 shrink-0 text-primary" /><div><p className="text-xs font-semibold">{t.why}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{selected.why[locale]}</p></div></div>
            </div>
            <div className="mt-5">
              <div className="mb-2 flex justify-between text-xs"><span>{t.confidence}</span><span className="font-mono">{selected.confidence}%</span></div>
              <Progress value={selected.confidence} className="h-1.5" />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {editing ? (
                <>
                  <Button size="sm" onClick={saveEdit}><Check />{t.accept}</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </>
              ) : (
                <>
                  <Button size="sm" onClick={() => update(selected.id, { status: "active" }, "checkpoint_card_accepted")}><Check />{t.accept}</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}><NotePencil />{t.edit}</Button>
                  <Button size="sm" variant="outline" onClick={() => update(selected.id, { priority: selected.priority === "pinned" ? "normal" : "pinned" }, "checkpoint_card_pin_toggled")}><PushPin />{t.pin}</Button>
                  <Button size="sm" variant="outline" onClick={() => update(selected.id, { status: "uncertain" }, "checkpoint_card_marked_uncertain")}><WarningCircle />{t.uncertain}</Button>
                  <Button size="sm" variant="ghost" onClick={() => update(selected.id, { status: "expired" }, "checkpoint_card_expired")}><XCircle />{t.expire}</Button>
                </>
              )}
            </div>
          </aside>
        </section>

        <div className="mt-5 flex items-center justify-between rounded-2xl border bg-white p-4">
          <div className="flex items-center gap-3 text-sm">
            <Clock size={20} className="text-primary" />
            <span><strong>{reviewedCount}/{cards.length}</strong> {t.reviewed} · {cards.filter((card) => card.priority === "pinned").length} pinned</span>
          </div>
          <Button className="h-11 px-6" onClick={() => {
            eventLog("checkpoint_completed", { reviewedCount, totalCards: cards.length, pinnedCount: cards.filter((card) => card.priority === "pinned").length }, { stage: "checkpoint" });
            onContinue();
          }}>{t.saveAndBreak}<ArrowRight /></Button>
        </div>
      </div>
    </div>
  );
}

const nbackSequence = ["A", "C", "A", "B", "D", "B", "C", "D"];

export function InterruptionTask({ locale, onComplete }: { locale: Locale; onComplete: () => void }) {
  const t = labels[locale];
  const [index, setIndex] = useState(2);
  const [correct, setCorrect] = useState(0);
  const answered = index - 2;
  const complete = index >= nbackSequence.length;
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
  const expectedSame = !complete && nbackSequence[index] === nbackSequence[index - 2];

  const answer = (same: boolean) => {
    const isCorrect = same === expectedSame;
    if (isCorrect) setCorrect((value) => value + 1);
    eventLog("nback_trial_answered", {
      trial: index - 1,
      stimulus: nbackSequence[index],
      expectedSame,
      answerSame: same,
      correct: isCorrect,
    }, { stage: "interruption", targetType: "nback_trial", targetId: String(index - 1) });
    setIndex((value) => value + 1);
  };

  const history = useMemo(() => nbackSequence.slice(0, Math.min(index, nbackSequence.length)), [index]);

  return (
    <div className="min-h-screen bg-[#f7f6f2] px-6 py-5">
      <div className="mx-auto max-w-5xl">
        <Timeline locale={locale} active="break" />
        <header className="py-10 text-center">
          <Badge variant="secondary" className="mb-4"><PauseCircle size={14} />{t.interruption}</Badge>
          <h1 className="text-3xl font-semibold">{t.nback}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{t.nbackHint}</p>
        </header>
        <section className="mx-auto max-w-2xl rounded-2xl border bg-white p-8 text-center shadow-[0_18px_60px_rgba(35,40,65,.07)]">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t.trial} {Math.min(answered + 1, nbackSequence.length - 2)} / {nbackSequence.length - 2}</span>
            <span className="font-mono">00:45</span>
          </div>
          <Progress value={(answered / (nbackSequence.length - 2)) * 100} className="mt-3 h-1.5" />
          {!complete ? (
            <>
              <div className="my-10 flex items-center justify-center gap-3">
                {history.slice(-3).map((letter, position) => (
                  <span key={`${letter}-${position}`} className={`grid place-items-center rounded-2xl border font-mono font-semibold ${position === history.slice(-3).length - 1 ? "size-32 bg-primary text-6xl text-white shadow-lg" : "size-16 bg-muted text-2xl text-muted-foreground"}`}>{letter}</span>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-14 text-base" onClick={() => answer(false)}>{t.different}</Button>
                <Button className="h-14 text-base" onClick={() => answer(true)}>{t.same}</Button>
              </div>
            </>
          ) : (
            <div className="py-10">
              <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[var(--active-soft)] text-[var(--active)]"><CheckCircle size={36} weight="fill" /></div>
              <p className="mt-5 text-2xl font-semibold">{accuracy}%</p>
              <p className="mt-2 text-sm text-muted-foreground">{t.accuracy}</p>
            </div>
          )}
          <Button variant={complete ? "default" : "ghost"} className="mt-5 w-full" onClick={() => {
            eventLog("interruption_completed", { trialsAnswered: answered, correct, accuracy }, { stage: "interruption" });
            onComplete();
          }}>{t.finish}<ArrowRight /></Button>
        </section>
      </div>
    </div>
  );
}
