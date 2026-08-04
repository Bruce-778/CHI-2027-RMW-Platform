"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Brain,
  Check,
  CheckCircle,
  Clock,
  Graph,
  PauseCircle,
  Question,
  Target,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { eventLog } from "@/lib/event-log";
import type { ResearchTaskId } from "@/lib/research-task";
import type { EpistemicStatus, Locale, RelationType } from "@/lib/rmw-types";

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
}

type ExtractedCard = Omit<CaptureCard, "content" | "detail" | "source" | "why"> & {
  content: string;
  detail: string;
  source: string;
  why: string;
};

interface CaptureRelation {
  id: string;
  sourceCardId: string;
  targetCardId: string;
  relationType: RelationType;
  confidence?: number;
}

const labels = {
  "zh-CN": {
    title: "保存窗口",
    subtitle: "进入保存窗口后，系统会尝试根据你实际写下的 memo 与对话提取候选 Problem State。",
    task: "主任务",
    save: "保存窗口",
    break: "中断任务",
    resume: "恢复",
    main: "主目标",
    active: "活跃子目标",
    suspended: "挂起目标",
    rejected: "已排除路径",
    candidates: "候选 Problem State",
    network: "知识网络",
    source: "来源",
    confidence: "置信度",
    saveAndBreak: "保存并进入中断任务",
    waiting: "保存按钮将在 1 分钟后开放",
    early: "请完成 1 分钟的查看时间，倒计时结束后才可进入中断任务。",
    guideTitle: "保存窗口说明",
    guideDescription: "只有 DeepSeek 成功分析你实际写下的内容后，才会显示 Problem State 与知识网络；系统会记录本次是否成功生成。",
    interruption: "中断任务",
    letterGame: "字母 2-back 游戏",
    letterHint: "判断当前字母是否与前两个字母相同。",
    colorGame: "颜色识别游戏",
    colorHint: "请选择文字实际显示的颜色，不要选择文字含义。",
    same: "相同",
    different: "不同",
    trial: "题目",
    retry: "未达到满分，请重新开始",
    nextGame: "进入颜色游戏",
    finish: "进入无辅助回忆",
    fullScore: "两个游戏都必须满分才能继续",
  },
  en: {
    title: "Save window",
    subtitle: "On entering the save window, the system attempts to extract candidate problem state from participant-authored memo and chat content.",
    task: "Primary task",
    save: "Save window",
    break: "Interruption",
    resume: "Resume",
    main: "Main goal",
    active: "Active subgoals",
    suspended: "Suspended goals",
    rejected: "Rejected path",
    candidates: "Candidate problem state",
    network: "Knowledge network",
    source: "Source",
    confidence: "Confidence",
    saveAndBreak: "Save and begin interruption",
    waiting: "Save opens after one minute",
    early: "Please use the full one-minute review period. The interruption opens when the countdown ends.",
    guideTitle: "Save-window guide",
    guideDescription: "Problem state and the network appear only after DeepSeek successfully analyzes participant-authored content. The generation outcome is logged.",
    interruption: "Interruption",
    letterGame: "Letter 2-back game",
    letterHint: "Decide whether the current letter matches the letter two positions back.",
    colorGame: "Color identification game",
    colorHint: "Choose the color the word is displayed in, not the meaning of the word.",
    same: "Same",
    different: "Different",
    trial: "Item",
    retry: "Full score required — restart",
    nextGame: "Continue to color game",
    finish: "Begin unsupported recall",
    fullScore: "Both games require a perfect score",
  },
};

export function ExperimentTimeline({ locale, active, compact=false }: { locale: Locale; active: "task" | "save" | "break" | "resume"; compact?: boolean }) {
  const t = labels[locale];
  const steps = [
    { id: "task", label: t.task },
    { id: "save", label: t.save },
    { id: "break", label: t.break },
    { id: "resume", label: t.resume },
  ];
  const activeIndex = steps.findIndex((step) => step.id === active);
  return <div className={`grid grid-cols-4 bg-white ${compact?"h-[52px] border-b px-5 py-1.5":"rounded-xl border p-2 shadow-sm"}`}>
    {steps.map((step, index) => <div key={step.id} className="relative flex items-center gap-3 px-4 py-2">
      {index > 0 && <div className="absolute -left-2 top-1/2 h-px w-4 bg-border" />}
      <span className={`grid size-7 place-items-center rounded-full text-xs font-semibold ${index <= activeIndex ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
        {index < activeIndex ? <Check size={14} /> : index + 1}
      </span>
      <span className={`text-xs font-medium ${step.id === active ? "text-primary" : "text-muted-foreground"}`}>{step.label}</span>
    </div>)}
  </div>;
}

function useCheckpointCountdown(fastMode: boolean) {
  const duration = fastMode ? 0 : 60;
  const [remaining, setRemaining] = useState(duration);
  useEffect(() => {
    const storageKey = "rmw-timer-checkpoint";
    const stored = Number(sessionStorage.getItem(storageKey));
    const endAt = Number.isFinite(stored) && stored > Date.now() ? stored : Date.now() + duration * 1000;
    sessionStorage.setItem(storageKey, String(endAt));
    const update = () => setRemaining(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [duration]);
  return remaining;
}

function formatClock(totalSeconds: number) {
  return `00:${String(totalSeconds).padStart(2, "0")}`;
}

function StateTile({ card, locale }: { card: CaptureCard; locale: Locale }) {
  const style = card.status === "uncertain"
    ? "border-amber-200 bg-amber-50/70"
    : card.status === "expired"
      ? "border-slate-200 bg-slate-50 text-slate-500"
      : "border-emerald-200 bg-emerald-50/60";
  return <article className={`rounded-xl border p-3 ${style}`}>
    <div className="flex items-center justify-between">
      <span className="text-[9px] font-semibold uppercase tracking-wider">{card.goalLevel || card.kind}</span>
      <span className="text-[9px] text-muted-foreground">{card.confidence}%</span>
    </div>
    <p className="mt-2 text-xs font-semibold leading-5 text-foreground">{card.content[locale]}</p>
    <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted-foreground">{card.source[locale]}</p>
  </article>;
}

type FlowData = { label: string; status: EpistemicStatus };
function FlowNode({ data }: { data: FlowData }) {
  const tone = data.status === "uncertain"
    ? "border-amber-400 bg-amber-50"
    : data.status === "expired"
      ? "border-slate-300 bg-slate-50"
      : "border-emerald-400 bg-emerald-50";
  return <div className={`w-[146px] rounded-xl border-2 px-3 py-2 text-center text-[10px] font-medium leading-4 shadow-sm ${tone}`}>
    <Handle type="target" position={Position.Left} />
    {data.label}
    <Handle type="source" position={Position.Right} />
  </div>;
}
const nodeTypes = { reasoning: FlowNode };

function CheckpointNetwork({ cards, relations, locale }: { cards: CaptureCard[]; relations: CaptureRelation[]; locale: Locale }) {
  const positions = useMemo(() => {
    const result: Record<string, { x: number; y: number }> = {};
    const groups = [
      cards.filter((card) => card.goalLevel === "main"),
      cards.filter((card) => card.goalLevel === "subgoal"),
      cards.filter((card) => card.goalLevel === "suspended"),
      cards.filter((card) => !card.goalLevel),
    ];
    groups.forEach((group, row) => group.forEach((card, column) => {
      result[card.id] = { x: 60 + column * 190, y: 20 + row * 105 };
    }));
    return result;
  }, [cards]);
  const nodes = useMemo<Node<FlowData>[]>(() => cards.map((card) => ({
    id: card.id,
    type: "reasoning",
    position: positions[card.id] || { x: 0, y: 0 },
    data: { label: card.content[locale], status: card.status },
  })), [cards, locale, positions]);
  const edges = useMemo<Edge[]>(() => relations.map((relation) => ({
    id: relation.id,
    source: relation.sourceCardId,
    target: relation.targetCardId,
    label: relation.relationType,
    animated: relation.relationType === "leads_to",
    style: { stroke: relation.relationType === "challenges" ? "#c58a2c" : "#8992a6" },
    labelStyle: { fontSize: 9, fill: "#687083" },
  })), [relations]);
  return <div className="h-[360px] overflow-hidden rounded-2xl border bg-white">
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView minZoom={0.45} maxZoom={1.5}>
      <Background gap={22} size={1} color="#e7e9ef" />
      <Controls position="bottom-right" showInteractive={false} />
    </ReactFlow>
  </div>;
}

function CheckpointGuide({ locale, open, onOpenChange }: { locale: Locale; open: boolean; onOpenChange: (open: boolean) => void }) {
  const chinese=locale==="zh-CN";
  const items=[
    ["checkpoint-goals",Target,chinese?"目标结构":"Goal structure",chinese?"这里汇总主目标、活跃子目标、挂起目标和已排除路径。":"This area summarizes the main, active, suspended, and rejected paths."],
    ["checkpoint-state",Brain,chinese?"候选 Problem State":"Candidate problem state",chinese?"仅当 DeepSeek 成功分析你实际写下的内容后，这里才会显示候选状态。":"Candidate state appears only after DeepSeek successfully analyzes participant-authored content."],
    ["checkpoint-network",Graph,chinese?"知识网络":"Knowledge network",chinese?"仅展示本次成功提取出的卡片及其关系，不使用预置演示节点。":"Only cards and relations extracted in this run are shown; no preset demo nodes are used."],
  ];
  const [step,setStep]=useState(0);
  const [rect,setRect]=useState<DOMRect|null>(null);
  const targetId=String(items[step][0]);
  useEffect(()=>{
    if(!open)return;
    const update=()=>{
      const target=document.querySelector(`[data-tour="${targetId}"]`);
      if(target)setRect(target.getBoundingClientRect());
    };
    const frame=requestAnimationFrame(update);
    window.addEventListener("resize",update);
    window.addEventListener("scroll",update,true);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener("resize",update);window.removeEventListener("scroll",update,true);};
  },[open,targetId]);
  if(!open||!rect)return null;
  const [,I,title,description]=items[step];
  const Icon=I as typeof Brain;
  const gap=8;
  const top=Math.max(0,rect.top-gap);
  const left=Math.max(0,rect.left-gap);
  const right=Math.min(window.innerWidth,rect.right+gap);
  const bottom=Math.min(window.innerHeight,rect.bottom+gap);
  const calloutStyle={top:`${Math.max(16,Math.min(window.innerHeight-250,rect.top+12))}px`,left:right+340<window.innerWidth?`${right+18}px`:`${Math.max(16,left-338)}px`};
  const finish=()=>{setStep(0);onOpenChange(false);};
  return <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={chinese?"保存窗口分步导览":"Save-window tour"}>
    <div className="absolute bg-slate-950/55 backdrop-blur-[2px]" style={{inset:"0 0 auto 0",height:top}}/>
    <div className="absolute bg-slate-950/55 backdrop-blur-[2px]" style={{top,left:0,width:left,height:bottom-top}}/>
    <div className="absolute bg-slate-950/55 backdrop-blur-[2px]" style={{top,left:right,right:0,height:bottom-top}}/>
    <div className="absolute bg-slate-950/55 backdrop-blur-[2px]" style={{top:bottom,left:0,right:0,bottom:0}}/>
    <div className="pointer-events-none absolute rounded-2xl ring-4 ring-white shadow-[0_0_0_2px_var(--primary),0_18px_70px_rgba(13,22,48,.32)]" style={{top,left,width:right-left,height:bottom-top}}/>
    <aside className="absolute w-80 rounded-2xl border bg-white p-5 shadow-[0_24px_80px_rgba(10,18,44,.28)]" style={calloutStyle}>
      <div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><Icon size={21}/></span><span className="text-xs font-semibold text-muted-foreground">{step+1} / {items.length}</span></div>
      <h2 className="mt-4 text-lg font-semibold">{String(title)}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{String(description)}</p>
      <div className="mt-5 flex justify-between"><Button variant="ghost" size="sm" onClick={finish}>{chinese?"退出导览":"Exit"}</Button><Button size="sm" onClick={()=>step===items.length-1?finish():setStep(current=>current+1)}>{step===items.length-1?(chinese?"完成":"Done"):(chinese?"下一步":"Next")}<ArrowRight/></Button></div>
    </aside>
  </div>;
}

export function RmwCheckpoint({
  locale,
  taskId,
  memo,
  messages,
  testMode,
  onBack,
  onContinue,
}: {
  locale: Locale;
  taskId: ResearchTaskId;
  memo: string;
  messages: Array<{ role: "user" | "assistant"; text: string }>;
  testMode: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  const t = labels[locale];
  const [cards, setCards] = useState<CaptureCard[]>([]);
  const [relations, setRelations] = useState<CaptureRelation[]>([]);
  const [mode, setMode] = useState<"loading" | "live" | "insufficient" | "unavailable" | "error">("loading");
  const [guideOpen, setGuideOpen] = useState(true);
  const [earlyNotice, setEarlyNotice] = useState(false);
  const remaining = useCheckpointCountdown(testMode);

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
        const result = await response.json() as {
          mode?: "live" | "insufficient" | "unavailable";
          cards?: ExtractedCard[];
          relations?: CaptureRelation[];
          error?: string;
        };
        if (!response.ok) throw new Error(result.error || "Extraction failed");
        if (result.mode === "live" && result.cards?.length) {
          const extracted = result.cards.map((card) => ({
            ...card,
            content: { "zh-CN": card.content, en: card.content },
            detail: { "zh-CN": card.detail, en: card.detail },
            source: { "zh-CN": card.source, en: card.source },
            why: { "zh-CN": card.why, en: card.why },
          }));
          setCards(extracted);
          if (result.relations?.length) setRelations(result.relations);
          setMode("live");
          eventLog("checkpoint_extraction_completed", {
            taskId,
            mode: "live",
            cards: extracted,
            relations: result.relations || [],
          }, { stage: "checkpoint" });
          return;
        }
        const skippedMode = result.mode === "insufficient" ? "insufficient" : "unavailable";
        setCards([]);
        setRelations([]);
        setMode(skippedMode);
        eventLog("checkpoint_extraction_skipped", { taskId, reason: skippedMode }, { stage: "checkpoint" });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMode("error");
        eventLog("checkpoint_extraction_failed", { taskId }, { stage: "checkpoint" });
      }
    };
    void extract();
    return () => controller.abort();
  }, [locale, memo, messages, taskId]);

  const main = cards.find((card) => card.goalLevel === "main");
  const active = cards.filter((card) => card.goalLevel === "subgoal").slice(0, 4);
  const suspended = cards.filter((card) => card.goalLevel === "suspended").slice(0, 3);
  const rejected = cards.find((card) => card.kind === "path");
  const extractionReady = mode === "live";
  const modeLabel = mode === "live" ? "DeepSeek" : mode === "loading"
    ? (locale === "zh-CN" ? "分析中" : "Analyzing")
    : mode === "insufficient"
      ? (locale === "zh-CN" ? "未生成" : "Not generated")
      : mode === "unavailable"
        ? (locale === "zh-CN" ? "DeepSeek 未配置" : "DeepSeek unavailable")
        : (locale === "zh-CN" ? "分析失败" : "Analysis failed");
  const emptyMessage = mode === "loading"
    ? (locale === "zh-CN" ? "正在检查 memo 与对话，并请求 DeepSeek 提取……" : "Checking the memo and chat, then requesting DeepSeek extraction…")
    : mode === "insufficient"
      ? (locale === "zh-CN" ? "没有检测到参与者实际写入的 memo 或对话，因此未生成 Problem State。预填的问题和模板不算作参与者推理。" : "No participant-authored memo or chat was detected, so no problem state was generated. The prefilled question and template do not count as participant reasoning.")
      : mode === "unavailable"
        ? (locale === "zh-CN" ? "服务器未配置 DeepSeek API Key，因此本次没有生成 Problem State，也不会显示演示卡片。" : "The server has no DeepSeek API key, so no problem state was generated and no demo cards are shown.")
        : (locale === "zh-CN" ? "DeepSeek 提取失败，本次没有生成 Problem State。" : "DeepSeek extraction failed, so no problem state was generated.");
  const footerStatus = mode === "loading"
    ? (locale === "zh-CN" ? "正在等待提取结果" : "Waiting for extraction")
    : !extractionReady
      ? (testMode ? (locale === "zh-CN" ? "测试模式可跳过；正式实验不可继续" : "Test mode may skip; the formal study cannot continue") : (locale === "zh-CN" ? "未生成 Problem State，无法进入中断任务" : "No problem state was generated; interruption is blocked"))
      : testMode
        ? (locale === "zh-CN" ? "测试模式：可直接继续" : "Test mode: continue anytime")
        : remaining > 0 ? t.waiting : (locale === "zh-CN" ? "可以进入中断任务" : "Interruption task is ready");

  return <div className="min-h-screen bg-[#f7f6f2] px-6 py-5">
    <CheckpointGuide locale={locale} open={guideOpen} onOpenChange={setGuideOpen}/>
    <div className="mx-auto max-w-[1480px]">
      <ExperimentTimeline locale={locale} active="save" />
      <header className="flex items-end justify-between py-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={mode === "live" ? "default" : "secondary"}>{modeLabel}</Badge>
          <button onClick={() => setGuideOpen(true)} aria-label={locale === "zh-CN" ? "查看说明" : "View guide"} className="grid size-9 place-items-center rounded-lg border bg-white hover:bg-muted"><Question size={18} /></button>
        </div>
      </header>

      {mode === "live" ? <>
      <section className="grid grid-cols-[1fr_1.15fr] gap-5">
        <article data-tour="checkpoint-goals" className="rounded-2xl border bg-white p-5 shadow-[0_12px_40px_rgba(35,43,70,.05)]">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">{t.main}</h2><Badge variant="outline"><Target size={13} />1</Badge></div>
          {main && <StateTile card={main} locale={locale} />}
          <div className="mt-4 grid grid-cols-[1.2fr_.8fr_.8fr] gap-3">
            <div><p className="mb-2 text-[10px] font-semibold text-muted-foreground">{t.active} · {active.length}</p><div className="space-y-2">{active.map((card) => <StateTile key={card.id} card={card} locale={locale} />)}</div></div>
            <div><p className="mb-2 text-[10px] font-semibold text-muted-foreground">{t.suspended} · {suspended.length}</p><div className="space-y-2">{suspended.map((card) => <StateTile key={card.id} card={card} locale={locale} />)}</div></div>
            <div><p className="mb-2 text-[10px] font-semibold text-muted-foreground">{t.rejected}</p>{rejected && <StateTile card={rejected} locale={locale} />}</div>
          </div>
        </article>

        <article data-tour="checkpoint-state" className="rounded-2xl border bg-white p-5 shadow-[0_12px_40px_rgba(35,43,70,.05)]">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">{t.candidates}</h2><p className="mt-1 text-xs text-muted-foreground">{locale === "zh-CN" ? "由 DeepSeek 归纳；不声称读取你的真实想法。" : "Summarized by DeepSeek; it does not claim access to your mind."}</p></div><Badge variant="secondary">{cards.length}</Badge></div>
          <div className="grid max-h-[360px] grid-cols-2 gap-2 overflow-y-auto pr-1">{cards.filter((card) => card.goalLevel !== "main").map((card) => <StateTile key={card.id} card={card} locale={locale} />)}</div>
        </article>
      </section>

      <section data-tour="checkpoint-network" className="mt-5">
        <div className="mb-3 flex items-center justify-between"><div><h2 className="flex items-center gap-2 font-semibold"><Graph size={20} className="text-primary" />{t.network}</h2><p className="mt-1 text-xs text-muted-foreground">{locale === "zh-CN" ? "节点与关系均来自本次 DeepSeek 提取结果。" : "Nodes and relations come from this DeepSeek extraction."}</p></div><Badge variant="outline">{relations.length} relations</Badge></div>
        <CheckpointNetwork cards={cards} relations={relations} locale={locale} />
      </section>
      </> : <section className="rounded-2xl border bg-white px-8 py-16 text-center shadow-[0_12px_40px_rgba(35,43,70,.05)]">
        <div className="mx-auto grid size-12 place-items-center rounded-xl bg-secondary text-primary">{mode === "loading" ? <Brain size={25} /> : <WarningCircle size={25} />}</div>
        <h2 className="mt-5 text-lg font-semibold">{locale === "zh-CN" ? "没有可显示的 Problem State" : "No problem state to display"}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{emptyMessage}</p>
        {mode !== "loading" && <Button variant="outline" className="mt-6" onClick={onBack}>{locale === "zh-CN" ? "返回工作区继续研究" : "Return to the workspace"}</Button>}
      </section>}

      <div className="mt-5 flex items-center justify-between rounded-2xl border bg-white p-4">
        <div className="flex items-center gap-3 text-sm"><Clock size={20} className="text-primary" /><div><p className="font-medium">{footerStatus}</p>{!testMode&&extractionReady&&<p className="text-xs text-muted-foreground">{remaining > 0 ? formatClock(remaining) : "00:00"}</p>}</div></div>
        <div className="text-right">
          {!testMode&&earlyNotice && remaining > 0 && <p role="status" className="mb-2 text-xs text-amber-700">{t.early}</p>}
          <Button variant={extractionReady&&(testMode||remaining === 0) ? "default" : "secondary"} disabled={mode === "loading" || (!testMode&&!extractionReady)} className="h-11 px-6" onClick={() => {
            if (!extractionReady) {
              if (testMode) {
                eventLog("checkpoint_skipped_in_test_mode", { taskId, reason: mode }, { stage: "checkpoint" });
                onContinue();
              }
              return;
            }
            if (!testMode&&remaining > 0) {
              setEarlyNotice(true);
              eventLog("checkpoint_continue_blocked", { remaining }, { stage: "checkpoint" });
              return;
            }
            eventLog("checkpoint_completed", { taskId, cards, relations }, { stage: "checkpoint" });
            onContinue();
          }}>{!extractionReady&&testMode?(locale === "zh-CN"?"仅测试模式：跳过保存":"Test mode only: skip save"):t.saveAndBreak}<ArrowRight /></Button>
        </div>
      </div>
    </div>
  </div>;
}

const letterSequence = ["A", "C", "A", "B", "D", "B", "C", "D"];
const colorTrials = [
  { word: "蓝", color: "red", answer: "red" },
  { word: "绿", color: "blue", answer: "blue" },
  { word: "红", color: "green", answer: "green" },
  { word: "蓝", color: "blue", answer: "blue" },
  { word: "红", color: "red", answer: "red" },
  { word: "绿", color: "green", answer: "green" },
] as const;
const colorCss = { red: "text-red-600", blue: "text-blue-600", green: "text-emerald-600" };
const colorWordEn: Record<string, string> = { 红: "RED", 蓝: "BLUE", 绿: "GREEN" };

export function InterruptionTask({ locale, onComplete }: { locale: Locale; fastMode: boolean; onComplete: () => void }) {
  const t = labels[locale];
  const [game, setGame] = useState<"letter" | "color">("letter");
  const [index, setIndex] = useState(2);
  const [correct, setCorrect] = useState(0);
  const [letterPassed, setLetterPassed] = useState(false);
  const [colorIndex, setColorIndex] = useState(0);
  const [colorCorrect, setColorCorrect] = useState(0);
  const letterComplete = index >= letterSequence.length;
  const colorComplete = colorIndex >= colorTrials.length;
  const letterTotal = letterSequence.length - 2;
  const expectedSame = !letterComplete && letterSequence[index] === letterSequence[index - 2];

  const answerLetter = (same: boolean) => {
    const isCorrect = same === expectedSame;
    if (isCorrect) setCorrect((value) => value + 1);
    eventLog("letter_game_answered", { index, same, expectedSame, correct: isCorrect }, { stage: "interruption" });
    setIndex((value) => value + 1);
  };
  const restartLetter = () => {
    setIndex(2);
    setCorrect(0);
  };
  const answerColor = (answer: "red" | "blue" | "green") => {
    const trial = colorTrials[colorIndex];
    const isCorrect = answer === trial.answer;
    if (isCorrect) setColorCorrect((value) => value + 1);
    eventLog("color_game_answered", { index: colorIndex, answer, expected: trial.answer, correct: isCorrect }, { stage: "interruption" });
    setColorIndex((value) => value + 1);
  };
  const restartColor = () => {
    setColorIndex(0);
    setColorCorrect(0);
  };

  return <div className="min-h-screen bg-[#f7f6f2] px-6 py-5">
    <div className="mx-auto max-w-5xl">
      <ExperimentTimeline locale={locale} active="break" />
      <header className="py-9 text-center"><Badge variant="secondary" className="mb-4"><PauseCircle size={14} />{t.interruption}</Badge><h1 className="text-3xl font-semibold">{game === "letter" ? t.letterGame : t.colorGame}</h1><p className="mt-3 text-sm text-muted-foreground">{game === "letter" ? t.letterHint : t.colorHint}</p></header>
      <section className="mx-auto max-w-2xl rounded-2xl border bg-white p-8 text-center shadow-[0_18px_60px_rgba(35,40,65,.07)]">
        {game === "letter" ? <>
          <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{t.trial} {Math.min(index - 1, letterTotal)} / {letterTotal}</span><span>{correct} / {Math.max(0, index - 2)}</span></div>
          <Progress value={((index - 2) / letterTotal) * 100} className="mt-3 h-1.5" />
          {!letterComplete ? <>
            <div className="my-10 flex items-center justify-center gap-3">{letterSequence.slice(0, index + 1).slice(-3).map((letter, position, current) => <span key={`${letter}-${position}`} className={`grid place-items-center rounded-2xl border font-mono font-semibold ${position === current.length - 1 ? "size-32 bg-primary text-6xl text-white shadow-lg" : "size-16 bg-muted text-2xl text-muted-foreground"}`}>{letter}</span>)}</div>
            <div className="grid grid-cols-2 gap-3"><Button variant="outline" className="h-14 text-base" onClick={() => answerLetter(false)}>{t.different}</Button><Button className="h-14 text-base" onClick={() => answerLetter(true)}>{t.same}</Button></div>
          </> : <div className="py-8"><ScoreResult score={correct} total={letterTotal} locale={locale} />{correct === letterTotal ? <Button className="mt-6 w-full" onClick={() => { setLetterPassed(true); setGame("color"); eventLog("letter_game_passed", { score: correct }, { stage: "interruption" }); }}>{t.nextGame}<ArrowRight /></Button> : <Button className="mt-6 w-full" variant="outline" onClick={restartLetter}>{t.retry}</Button>}</div>}
        </> : <>
          <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{t.trial} {Math.min(colorIndex + 1, colorTrials.length)} / {colorTrials.length}</span><span>{colorCorrect} / {colorIndex}</span></div>
          <Progress value={(colorIndex / colorTrials.length) * 100} className="mt-3 h-1.5" />
          {!colorComplete ? <><div className="my-14"><p className={`text-7xl font-bold ${colorCss[colorTrials[colorIndex].color]}`}>{locale === "zh-CN" ? colorTrials[colorIndex].word : colorWordEn[colorTrials[colorIndex].word]}</p></div><div className="grid grid-cols-3 gap-3">{(["red", "blue", "green"] as const).map((color) => <Button key={color} variant="outline" className="h-14 text-base" onClick={() => answerColor(color)}>{locale === "zh-CN" ? { red: "红色", blue: "蓝色", green: "绿色" }[color] : color[0].toUpperCase() + color.slice(1)}</Button>)}</div></> : <div className="py-8"><ScoreResult score={colorCorrect} total={colorTrials.length} locale={locale} />{colorCorrect === colorTrials.length && letterPassed ? <Button className="mt-6 w-full" onClick={() => { eventLog("interruption_completed", { letterScore: correct, colorScore: colorCorrect, perfect: true }, { stage: "interruption" }); onComplete(); }}>{t.finish}<ArrowRight /></Button> : <Button className="mt-6 w-full" variant="outline" onClick={restartColor}>{t.retry}</Button>}</div>}
        </>}
        <p className="mt-5 text-xs text-muted-foreground">{t.fullScore}</p>
      </section>
    </div>
  </div>;
}

function ScoreResult({ score, total, locale }: { score: number; total: number; locale: Locale }) {
  const perfect = score === total;
  return <><div className={`mx-auto grid size-16 place-items-center rounded-2xl ${perfect ? "bg-[var(--active-soft)] text-[var(--active)]" : "bg-amber-50 text-amber-700"}`}>{perfect ? <CheckCircle size={36} weight="fill" /> : <WarningCircle size={36} />}</div><p className="mt-5 text-2xl font-semibold">{score} / {total}</p><p className="mt-2 text-sm text-muted-foreground">{perfect ? (locale === "zh-CN" ? "满分通过" : "Perfect score") : (locale === "zh-CN" ? "需要满分才能继续" : "A perfect score is required")}</p></>;
}
