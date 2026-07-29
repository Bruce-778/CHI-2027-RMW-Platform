"use client";

import { useEffect, useMemo, useState } from "react";
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
import { TimedButton } from "@/components/timed-button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { createInitialCards } from "@/lib/demo-data";
import { eventLog } from "@/lib/event-log";
import type { ResearchTaskId } from "@/lib/research-task";
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

type ExtractedCard = Omit<CaptureCard, "content" | "detail" | "source" | "why" | "reviewed"> & {
  content: string;
  detail: string;
  source: string;
  why: string;
};

function createCaptureCards(taskId: ResearchTaskId): CaptureCard[] {
  return createInitialCards(taskId).map((card) => {
    const sourceLabels = card.sourceRefs.map((source) => source.label);
    return {
      id: card.id,
      kind: card.cardType,
      goalLevel: card.goalLevel,
      content: card.content,
      detail: card.detail,
      status: card.status,
      priority: card.priority,
      confidence: card.confidence ?? 50,
      source: {
        "zh-CN": sourceLabels.length ? sourceLabels.join("、") : "系统候选；尚未定位到明确来源",
        en: sourceLabels.length ? sourceLabels.join(", ") : "System candidate; no specific source located",
      },
      why: {
        "zh-CN": card.cardType === "next_action"
          ? "用于保存中断前准备执行的最小下一步；必须由你校准。"
          : "从当前任务结构生成的低风险候选；只保留与你实际推理一致的内容。",
        en: card.cardType === "next_action"
          ? "Preserves the minimum action intended before interruption; participant calibration is required."
          : "A low-risk candidate from the task structure; retain it only if it matches your actual reasoning.",
      },
      reviewed: false,
    };
  });
}

const labels = {
  "zh-CN": {
    title: "保存当前推理位置",
    subtitle: "系统根据当前工作区生成候选状态。没有明确来源或置信度较低的卡片必须由你编辑、标记存疑或删除。",
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
    subtitle: "The system generated candidate state from the current workspace. Edit, mark uncertain, or remove cards with weak confidence or no specific source.",
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

export function RmwCheckpoint({
  locale,
  taskId,
  memo,
  messages,
  onContinue,
}: {
  locale: Locale;
  taskId: ResearchTaskId;
  memo: string;
  messages: Array<{ role: "user" | "assistant"; text: string }>;
  onContinue: () => void;
}) {
  const t = labels[locale];
  const [cards, setCards] = useState(() => createCaptureCards(taskId));
  const [selectedId, setSelectedId] = useState("next");
  const [extractionMode, setExtractionMode] = useState<"loading" | "live" | "demo" | "error">("loading");
  const [editing, setEditing] = useState(false);
  const selected = cards.find((card) => card.id === selectedId) || cards[0];
  const [draft, setDraft] = useState(selected.content[locale]);
  const reviewedCount = cards.filter((card) => card.reviewed).length;

  useEffect(() => {
    const controller = new AbortController();
    const extract = async () => {
      try {
        const response = await fetch("/api/extract", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ locale, taskId, memo, messages }),
          signal: controller.signal,
        });
        const result = await response.json() as { mode?: "live" | "demo"; cards?: ExtractedCard[]; error?: string };
        if (!response.ok) throw new Error(result.error || "Extraction failed");
        if (result.mode === "live" && Array.isArray(result.cards) && result.cards.length) {
          const extracted = result.cards.map((card) => ({
            ...card,
            content: { "zh-CN": card.content, en: card.content },
            detail: { "zh-CN": card.detail, en: card.detail },
            source: { "zh-CN": card.source, en: card.source },
            why: { "zh-CN": card.why, en: card.why },
            reviewed: false,
          }));
          setCards(extracted);
          const nextAction = extracted.find((card) => card.kind === "next_action");
          const nextSelectedId = nextAction?.id || extracted[0].id;
          setSelectedId(nextSelectedId);
          setDraft((nextAction || extracted[0]).content[locale]);
          setExtractionMode("live");
          eventLog("checkpoint_extraction_completed", { taskId, mode: "live", cardCount: extracted.length }, { stage: "checkpoint" });
          return;
        }
        setExtractionMode("demo");
        eventLog("checkpoint_extraction_completed", { taskId, mode: "demo" }, { stage: "checkpoint" });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setExtractionMode("error");
        eventLog("checkpoint_extraction_failed", { taskId }, { stage: "checkpoint" });
      }
    };
    void extract();
    return () => controller.abort();
  }, [locale, memo, messages, taskId]);

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
            <Badge variant="secondary" className="mb-3"><Sparkle size={14} /> RMW save point · {extractionMode === "live" ? "DeepSeek" : extractionMode === "loading" ? (locale === "zh-CN" ? "提取中" : "extracting") : (locale === "zh-CN" ? "中性候选" : "neutral candidates")}</Badge>
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
          <TimedButton seconds={6} locale={locale} label={t.saveAndBreak} className="h-11 px-6" onClick={() => {
            eventLog("checkpoint_completed", { taskId, reviewedCount, totalCards: cards.length, pinnedCount: cards.filter((card) => card.priority === "pinned").length }, { stage: "checkpoint" });
            onContinue();
          }} />
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
          <TimedButton seconds={3} ready={complete} locale={locale} label={t.finish} blockedLabel={locale === "zh-CN" ? "请先完成全部 2-back 题目" : "Complete all 2-back trials first"} variant={complete ? "default" : "ghost"} className="mt-5 w-full" onClick={() => {
            eventLog("interruption_completed", { trialsAnswered: answered, correct, accuracy }, { stage: "interruption" });
            onComplete();
          }} />
        </section>
      </div>
    </div>
  );
}
