"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, BookOpenText, Brain, ChatCircleDots, Check, CheckCircle, Clock,
  Globe, Graph, Question, LinkSimple,
  NotePencil, PaperPlaneTilt, PauseCircle, PushPin, ShieldCheck, Sparkle,
  SquaresFour, Target, Timer, WarningCircle, XCircle,
} from "@phosphor-icons/react";
import { Background, Controls, Handle, Position, ReactFlow, type Edge, type Node } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createInitialCards, relations } from "@/lib/demo-data";
import { eventLog, exportExperimentArchive } from "@/lib/event-log";
import {
  assignResearchTaskFromCode,
  getResearchTask,
  isResearchTaskId,
  memoQuestions,
  phaseOneGoals,
  taskOverview,
  type ResearchTaskId,
} from "@/lib/research-task";
import type { Condition, EpistemicStatus, Locale, ReasoningCard } from "@/lib/rmw-types";
import { ExperimentTimeline, InterruptionTask, RmwCheckpoint } from "@/components/rmw-checkpoint";

type Screen = "landing" | "topics" | "brief" | "survey" | "tutorial" | "work" | "checkpoint" | "interruption" | "workspace" | "recall" | "complete";
type ChatMessage = { role: "user" | "assistant"; text: string };
type DeepSeekModel = "deepseek-v4-flash" | "deepseek-v4-pro";

const copy = {
  "zh-CN": {
    study: "大学生科研思考与恢复研究", intro: "阅读材料、与 AI 比较问题框架，并在中断后准确找回你的科研思路。",
    privacy: "研究会记录聊天、编辑与界面操作。请勿输入真实敏感信息。所有导出数据使用匿名编号。",
    code: "参与者代码", codeHint: "演示代码：RMW-DEMO", consent: "我已阅读并同意参与研究",
    enter: "开始研究", language: "界面语言",
    pretitle: "开始前，先了解你的经验", next: "继续", back: "返回", tutorial: "界面快速导览",
    materials: "材料", chat: "AI 助手", memo: "研究备忘录", recovery: "推理恢复支持",
    day: "Day 2 · 恢复阶段", saved: "已保存", help: "帮助", progress: "阅读进度",
    ask: "", disclaimer: "AI 可能出错，请结合材料与证据判断。",
    memoPlaceholder: "继续写下你的研究问题、发现与实验计划…", words: "字",
    resume: "恢复摘要", cards: "推理卡片", network: "知识网络", relations: "关系列表",
    currentGoal: "当前目标", position: "推理位置", uncertain: "仍未验证", ruled: "已排除", nextStep: "最小下一步",
    continue: "完成研究", evidence: "查看证据", pin: "置顶", verify: "已核查", expire: "过期", restore: "恢复",
    allCards: "全部卡片", ready: "从这里继续", readFirst: "先花一分钟看恢复摘要，再检查存疑内容。",
    recallTitle: "在查看恢复支持前，请先回忆", recallSub: "请根据记忆回答。提交后才会显示昨天的恢复材料。",
    submitRecall: "提交并查看恢复支持", completed: "任务已完成", completeText: "感谢参与。你的回答已安全保存。",
    desktop: "请使用桌面设备", desktopText: "为了保证实验条件一致，本研究需要至少 1100px 宽的桌面浏览器。",
  },
  en: {
    study: "Student Research Framing & Recovery Study", intro: "Read evidence, compare research framings with AI, and recover your reasoning accurately after interruption.",
    privacy: "The study records chat, edits, and interface actions. Do not enter sensitive information. Exports use anonymous IDs.",
    code: "Participant code", codeHint: "Demo code: RMW-DEMO", consent: "I have read the information and agree to participate",
    enter: "Start study", language: "Interface language",
    pretitle: "A few questions about your experience", next: "Continue", back: "Back", tutorial: "Quick workspace tour",
    materials: "Materials", chat: "AI assistant", memo: "Research memo", recovery: "Reasoning recovery",
    day: "Day 2 · Resume", saved: "Saved", help: "Help", progress: "Reading progress",
    ask: "", disclaimer: "AI can make mistakes. Check important claims against the evidence.",
    memoPlaceholder: "Continue your research problem, findings, and study plan…", words: "words",
    resume: "Resume brief", cards: "Reasoning cards", network: "Knowledge network", relations: "Relation list",
    currentGoal: "Current goal", position: "Reasoning position", uncertain: "Still uncertain", ruled: "Ruled out", nextStep: "Next step",
    continue: "Complete research", evidence: "View evidence", pin: "Pin", verify: "Verified", expire: "Expire", restore: "Restore",
    allCards: "All cards", ready: "Resume from here", readFirst: "Review the brief first, then inspect the uncertain claim.",
    recallTitle: "Before viewing recovery support, recall yesterday’s work", recallSub: "Answer from memory. Your recovery material appears only after submission.",
    submitRecall: "Submit and reveal support", completed: "Study complete", completeText: "Thank you. Your responses have been saved securely.",
    desktop: "Desktop device required", desktopText: "To keep experimental conditions consistent, use a desktop browser at least 1100px wide.",
  },
};

export function RmwApp() {
  const [locale, setLocale] = useState<Locale>("zh-CN");
  const [screen, setScreen] = useState<Screen>("landing");
  const [condition, setCondition] = useState<Condition>("rmw");
  const [participantCode, setParticipantCode] = useState("RMW-DEMO");
  const [taskId, setTaskId] = useState<ResearchTaskId>("library");
  const [memo, setMemo] = useState(() => getResearchTask("library").starterMemo["zh-CN"]);
  const [chat, setChat] = useState<ChatMessage[]>(() => [{ role: "assistant", text: getResearchTask("library").assistantIntro["zh-CN"] }]);
  const [recallResponses, setRecallResponses] = useState<string[]>(["", "", ""]);
  const [testMode, setTestMode] = useState(true);
  const [deepSeekModel, setDeepSeekModel] = useState<DeepSeekModel>("deepseek-v4-flash");
  const t = copy[locale];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    const c = params.get("condition") as Condition | null;
    const lang = params.get("lang") as Locale | null;
    const task = params.get("task");
    const frame = requestAnimationFrame(() => {
      const nextLocale: Locale = lang === "en" || lang === "zh-CN" ? lang : "zh-CN";
      setTestMode(params.get("timed") !== "1");
      if (lang === "en" || lang === "zh-CN") setLocale(lang);
      if (c && ["summary", "notes", "rmw"].includes(c)) setCondition(c);
      if (isResearchTaskId(task)) {
        const assignedTask = getResearchTask(task);
        setTaskId(task);
        setMemo(assignedTask.starterMemo[nextLocale]);
        setChat([{ role: "assistant", text: assignedTask.assistantIntro[nextLocale] }]);
      }
      if (view === "checkpoint") setScreen("checkpoint");
      if (view === "interruption") setScreen("interruption");
      if (view === "day2") setScreen("workspace");
      if (view === "recall") setScreen("recall");
      if (view === "topics") setScreen("topics");
      if (view === "task") setScreen("brief");
      if (view === "work") setScreen("work");
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      <div className="desktop-required fixed inset-0 z-50 hidden items-center justify-center bg-[#f7f6f2] p-8 text-center">
        <div className="max-w-md"><SquaresFour size={42} className="mx-auto mb-5 text-primary" /><h1 className="text-2xl font-semibold">{t.desktop}</h1><p className="mt-3 text-muted-foreground">{t.desktopText}</p></div>
      </div>
      <main className="desktop-app min-h-screen">
        {screen === "landing" && <Landing locale={locale} setLocale={setLocale} participantCode={participantCode} setParticipantCode={setParticipantCode} deepSeekModel={deepSeekModel} setDeepSeekModel={setDeepSeekModel} onStart={() => {
          const assignedTaskId = assignResearchTaskFromCode(participantCode);
          const assignedTask = getResearchTask(assignedTaskId);
          setTaskId(assignedTaskId);
          setMemo(assignedTask.starterMemo[locale]);
          setChat([{ role: "assistant", text: assignedTask.assistantIntro[locale] }]);
          eventLog("research_task_assigned", { taskId: assignedTaskId, method: "participant_code_hash_v1" }, { stage: "task_setup" });
          setScreen("topics");
        }} t={t} />}
        {screen === "topics" && <TaskAssignment locale={locale} taskId={taskId} setScreen={setScreen} />}
        {screen === "brief" && <TaskBrief locale={locale} taskId={taskId} setScreen={setScreen} />}
        {screen === "survey" && <Survey locale={locale} taskId={taskId} setScreen={setScreen} t={t} />}
        {screen === "tutorial" && <Tutorial locale={locale} setScreen={setScreen} t={t} />}
        {screen === "work" && <Workspace key={`work-${taskId}-${locale}`} locale={locale} condition={condition} taskId={taskId} phase="work" memo={memo} setMemo={setMemo} chat={chat} setChat={setChat} setScreen={setScreen} testMode={testMode} deepSeekModel={deepSeekModel} t={t} />}
        {screen === "checkpoint" && <RmwCheckpoint locale={locale} taskId={taskId} memo={memo} messages={chat} testMode={testMode} deepSeekModel={deepSeekModel} onContinue={() => setScreen("interruption")} />}
        {screen === "interruption" && <InterruptionTask locale={locale} fastMode={testMode} onComplete={() => setScreen("recall")} />}
        {screen === "recall" && <Recall responses={recallResponses} setResponses={setRecallResponses} setScreen={setScreen} t={t} />}
        {screen === "workspace" && <Workspace key={`recovery-${taskId}-${locale}`} locale={locale} condition={condition} taskId={taskId} phase="recovery" memo={memo} setMemo={setMemo} chat={chat} setChat={setChat} setScreen={setScreen} testMode={testMode} deepSeekModel={deepSeekModel} t={t} />}
        {screen === "complete" && <Complete participantCode={participantCode} locale={locale} condition={condition} taskId={taskId} memo={memo} chat={chat} recallResponses={recallResponses} setScreen={setScreen} t={t} />}
      </main>
    </>
  );
}

function LanguageChoice({ locale, setLocale }: { locale: Locale; setLocale: (l: Locale) => void }) {
  return <div className="flex rounded-lg bg-muted p-1" role="group" aria-label="Language">
    {(["zh-CN", "en"] as Locale[]).map(l => <button key={l} onClick={() => setLocale(l)} className={`min-h-10 rounded-md px-4 text-sm font-medium transition ${locale === l ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{l === "zh-CN" ? "中文" : "English"}</button>)}
  </div>;
}

function Landing({
  locale,
  setLocale,
  participantCode,
  setParticipantCode,
  deepSeekModel,
  setDeepSeekModel,
  onStart,
  t,
}: {
  locale: Locale;
  setLocale: (l: Locale) => void;
  participantCode: string;
  setParticipantCode: (code: string) => void;
  deepSeekModel: DeepSeekModel;
  setDeepSeekModel: (model: DeepSeekModel) => void;
  onStart: () => void;
  t: typeof copy[Locale];
}) {
  const [consent, setConsent] = useState(true);
  return <div className="min-h-screen bg-[#f8f7f3]">
    <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6"><Brand /><LanguageChoice locale={locale} setLocale={setLocale} /></header>
    <section className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1.35fr)_minmax(420px,.85fr)] items-center gap-8 px-6 py-20">
      <div><Badge variant="secondary" className="mb-6 rounded-full px-3 py-1 text-primary"><Brain size={15} /> CHI 2027 Research Prototype</Badge><h1 className={`whitespace-nowrap font-semibold leading-tight tracking-[-.035em] ${locale === "zh-CN" ? "text-[40px]" : "text-[36px]"}`}>{t.study}</h1><p className={`mt-5 whitespace-nowrap leading-7 text-muted-foreground ${locale === "zh-CN" ? "text-[16px]" : "text-[15px]"}`}>{t.intro}</p>
        <div className="mt-10 grid max-w-xl grid-cols-3 gap-5">{[[Target,"恢复目标","Recover goals"],[LinkSimple,"检查证据","Check evidence"],[ArrowRight,"继续下一步","Resume action"]].map(([I,zh,en]) => { const Icon=I as typeof Target; return <div key={String(zh)} className="border-t pt-4"><Icon size={23} className="mb-3 text-primary"/><p className="text-sm font-medium">{locale === "zh-CN" ? String(zh) : String(en)}</p></div>})}</div>
      </div>
      <div className="rounded-2xl border bg-white/90 p-8 shadow-[0_24px_70px_rgba(34,42,70,.10)] backdrop-blur"><div className="mb-6 flex items-center gap-3"><ShieldCheck size={25} className="text-[var(--active)]"/><div><h2 className="font-semibold">{t.enter}</h2><p className="text-sm text-muted-foreground">Session access is anonymous</p></div></div>
        <label className="text-sm font-medium">{t.code}</label><Input value={participantCode} onChange={e=>setParticipantCode(e.target.value)} className="mt-2 h-12" /><p className="mt-2 text-xs text-muted-foreground">{t.codeHint}</p>
        <label className="mt-5 block text-sm font-medium" htmlFor="deepseek-model">{locale === "zh-CN" ? "AI 模型" : "AI model"}</label>
        <select id="deepseek-model" value={deepSeekModel} onChange={event=>setDeepSeekModel(event.target.value as DeepSeekModel)} className="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring">
          <option value="deepseek-v4-flash">DeepSeek V4 Flash · {locale === "zh-CN" ? "速度优先" : "Faster"}</option>
          <option value="deepseek-v4-pro">DeepSeek V4 Pro · {locale === "zh-CN" ? "推理优先" : "Stronger reasoning"}</option>
        </select>
        <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm leading-6"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 size-4 accent-[var(--primary)]"/><span>{t.consent}</span></label><p className="mt-4 rounded-lg bg-muted/70 p-4 text-xs leading-5 text-muted-foreground">{t.privacy}</p>
        <Button disabled={!consent || !participantCode.trim()} onClick={()=>{eventLog("consent_submitted",{locale});onStart()}} className="mt-6 h-12 w-full">{t.enter}<ArrowRight /></Button>
      </div>
    </section>
  </div>;
}

function TaskAssignment({ locale, taskId, setScreen }: {
  locale: Locale;
  taskId: ResearchTaskId;
  setScreen: (screen: Screen) => void;
}) {
  const task = getResearchTask(taskId);
  return <div className="min-h-screen bg-[#f7f6f2]">
    <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-8"><Brand/><span className="font-mono text-xs text-muted-foreground">Task setup · 1 / 2</span></header>
    <section className="mx-auto max-w-3xl px-8 py-16">
      <Badge variant="secondary" className="rounded-full text-primary">{locale==="zh-CN"?"大学生科研思考任务":"Research framing task"}</Badge>
      <h1 className="mt-5 text-4xl font-semibold tracking-tight">{locale==="zh-CN"?"你的研究任务已分配":"Your research task is assigned"}</h1>
      <p className="mt-3 text-base leading-7 text-muted-foreground">{locale==="zh-CN"?"为保证实验条件可比，系统依据参与者代码随机指定一个议题，本轮任务不可自行更换。":"To keep study conditions comparable, the system assigns one topic from the participant code. It cannot be changed during this session."}</p>
      <div className="mt-9 rounded-2xl border border-primary/20 bg-white p-7 shadow-[0_18px_48px_rgba(56,65,116,.10)]">
        <div className="flex items-start justify-between">
          <div className="grid size-12 place-items-center rounded-xl bg-secondary text-primary"><BookOpenText size={25}/></div>
          <Badge className="rounded-full"><Check size={13}/>{locale==="zh-CN"?"随机分配":"Assigned"}</Badge>
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[.14em] text-primary">{task.eyebrow[locale]} · {locale==="zh-CN"?`任务 ${task.code}`:`Task ${task.code}`}</p>
        <h2 className="mt-2 text-2xl font-semibold">{task.label[locale]}</h2>
        <p className="mt-4 text-base font-medium leading-7">{task.question[locale]}</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{task.description[locale]}</p>
      </div>
      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" onClick={()=>setScreen("landing")}>{locale==="zh-CN"?"返回":"Back"}</Button>
        <Button className="h-11 px-6" onClick={()=>setScreen("brief")}>{locale==="zh-CN"?"查看任务说明":"Review task brief"}<ArrowRight/></Button>
      </div>
    </section>
  </div>;
}

function TaskBrief({locale,taskId,setScreen}:{locale:Locale;taskId:ResearchTaskId;setScreen:(screen:Screen)=>void}) {
  const task=getResearchTask(taskId);
  return <CenteredShell step="Task setup · 2 / 2" title={locale==="zh-CN"?"研究任务说明":"Research task brief"}>
    <Badge variant="secondary" className="rounded-full text-primary">{locale==="zh-CN"?`任务 ${task.code}`:`Task ${task.code}`} · {task.label[locale]}</Badge>
    <p className="mt-5 text-lg font-semibold leading-8">{task.question[locale]}</p>
    <p className="mt-4 rounded-xl bg-secondary/55 p-4 text-sm leading-7 text-secondary-foreground">{taskOverview[locale]}</p>
    <div className="mt-6">
      <h2 className="text-sm font-semibold">{locale==="zh-CN"?"第一阶段结束时，你不需要完成最终 memo，但应尽量：":"By the end of Phase 1, you do not need a final memo, but should try to:"}</h2>
      <div className="mt-3 space-y-2">{phaseOneGoals.map((goal,index)=><div key={goal[locale]} className="flex gap-3 rounded-lg border bg-white px-3 py-2.5 text-sm leading-6"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-primary">{index+1}</span>{goal[locale]}</div>)}</div>
    </div>
    <div className="mt-7 border-t pt-6">
      <h2 className="text-sm font-semibold">{locale==="zh-CN"?"最终 memo（600–900 字）需回答：":"The final memo (600–900 words) should answer:"}</h2>
      <ol className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">{memoQuestions.map((question,index)=><li key={question[locale]}><span className="mr-2 font-mono text-primary">{index+1}.</span>{question[locale]}</li>)}</ol>
    </div>
    <div className="mt-8 grid grid-cols-[auto_1fr] gap-3">
      <Button variant="outline" onClick={()=>setScreen("topics")}>{locale==="zh-CN"?"返回":"Back"}</Button>
      <Button className="h-11" onClick={()=>{eventLog("task_brief_confirmed",{taskId},{stage:"task_setup"});setScreen("survey")}}>{locale==="zh-CN"?"确认并继续":"Confirm and continue"}<ArrowRight/></Button>
    </div>
  </CenteredShell>;
}

function Survey({ locale, taskId, setScreen, t }: { locale:Locale;taskId:ResearchTaskId;setScreen:(s:Screen)=>void;t:typeof copy[Locale] }) {
  const task=getResearchTask(taskId);
  const items=locale==="zh-CN"
    ?["LLM / AI 工具使用经验","研究写作经验","材料综合分析经验",`对“${task.label["zh-CN"]}”议题的熟悉程度`,"完成本任务的信心"]
    :["Experience with LLM / AI tools","Research-writing experience","Evidence-synthesis experience",`Familiarity with “${task.label.en}”`,"Confidence in completing this task"];
  const [responses,setResponses]=useState(()=>items.map(()=>3));
  return <CenteredShell step="1 / 3" title={t.pretitle}><div className="space-y-7">{items.map((item,index)=><div key={item}><div className="mb-3 flex justify-between text-sm"><span>{item}</span><span className="text-muted-foreground">{responses[index]} / 5</span></div><input className="w-full accent-[var(--primary)]" type="range" min="1" max="5" value={responses[index]} onChange={event=>setResponses(current=>current.map((value,responseIndex)=>responseIndex===index?Number(event.target.value):value))}/></div>)}</div><Button onClick={()=>{eventLog("pre_survey_completed",{taskId,responses,topicFamiliarity:responses[3]},{stage:"pre_survey"});setScreen("tutorial")}} className="mt-10 h-12 w-full">{t.next}<ArrowRight/></Button></CenteredShell>;
}

function Tutorial({ locale,setScreen,t }: { locale:Locale;setScreen:(s:Screen)=>void;t:typeof copy[Locale] }) {
  const chinese=locale==="zh-CN";
  const rows=[
    [BookOpenText,t.materials,chinese?"阅读本轮分配的 5 段实验材料。":"Read the five materials assigned for this session."],
    [ChatCircleDots,t.chat,chinese?"比较问题框架，并追问证据、约束与不确定性。":"Compare framings and ask about evidence, constraints, and uncertainty."],
    [NotePencil,t.memo,chinese?"边思考边记录框架、假设、排除路径和下一步。":"Record framings, hypotheses, rejected paths, and next steps as you work."],
    [Brain,t.recovery,chinese?"中断前校准候选状态，回来后先做无辅助回忆。":"Calibrate candidate state before interruption, then complete unsupported recall on return."],
  ];
  return <CenteredShell step="2 / 3" title={t.tutorial}><div className="space-y-2">{rows.map(([I,name,desc])=>{const Icon=I as typeof Brain;return <div key={String(name)} className="flex gap-4 rounded-xl p-4 hover:bg-muted/60"><div className="grid size-11 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><Icon size={22}/></div><div><h3 className="font-medium">{String(name)}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{String(desc)}</p></div></div>})}</div><Button onClick={()=>{eventLog("tutorial_completed",{}, {stage:"tutorial"});setScreen("work")}} className="mt-8 h-12 w-full">{t.next}<ArrowRight/></Button></CenteredShell>;
}

function CenteredShell({step,title,children}:{step:string;title:string;children:React.ReactNode}) { return <div className="min-h-screen bg-[#f7f6f2]"><header className="mx-auto flex h-20 max-w-5xl items-center justify-between px-8"><Brand/><span className="font-mono text-xs text-muted-foreground">{step}</span></header><section className="mx-auto max-w-2xl px-8 py-16"><h1 className="mb-10 text-3xl font-semibold tracking-tight">{title}</h1><div className="rounded-2xl border bg-white p-8 shadow-[0_18px_60px_rgba(35,40,65,.07)]">{children}</div></section></div> }

function Brand(){return <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-primary text-white"><Brain size={23} weight="duotone"/></div><div><div className="font-semibold tracking-tight">RMW</div><div className="text-[10px] uppercase tracking-[.16em] text-muted-foreground">Reasoning Memory</div></div></div>}

function Recall({ responses,setResponses,setScreen,t }: {responses:string[];setResponses:(responses:string[])=>void;setScreen:(s:Screen)=>void;t:typeof copy[Locale]}) {
  const prompts=[t.currentGoal,t.position,t.uncertain];
  return <CenteredShell step="Day 2 · 01:30" title={t.recallTitle}><p className="mb-7 text-sm leading-6 text-muted-foreground">{t.recallSub}</p><div className="space-y-4">{prompts.map((p,i)=><label key={p} className="block"><span className="mb-2 block text-sm font-medium">{i+1}. {p}</span><Textarea rows={2} placeholder="…" value={responses[i]||""} onChange={event=>setResponses(responses.map((value,index)=>index===i?event.target.value:value))}/></label>)}</div><Button className="mt-8 h-12 w-full" onClick={()=>{eventLog("unsupported_recall_submitted",{responses,answeredCount:responses.filter(Boolean).length,responseLengths:responses.map(value=>value.length)},{stage:"unsupported_recall"});eventLog("recovery_support_revealed",{}, {stage:"recovery"});setScreen("workspace")}}>{t.submitRecall}<ArrowRight/></Button></CenteredShell>
}

function useStageCountdown(key:string,durationSeconds:number,enabled:boolean) {
  const [remaining,setRemaining]=useState(durationSeconds);
  useEffect(()=>{
    if(!enabled)return;
    const storageKey=`rmw-timer-${key}`;
    const stored=Number(sessionStorage.getItem(storageKey));
    const endAt=Number.isFinite(stored)&&stored>Date.now()?stored:Date.now()+durationSeconds*1000;
    sessionStorage.setItem(storageKey,String(endAt));
    const update=()=>setRemaining(Math.max(0,Math.ceil((endAt-Date.now())/1000)));
    update();
    const timer=window.setInterval(update,250);
    return()=>window.clearInterval(timer);
  },[durationSeconds,enabled,key]);
  return enabled?remaining:durationSeconds;
}

function formatClock(totalSeconds:number) {
  const minutes=Math.floor(totalSeconds/60);
  const seconds=totalSeconds%60;
  return `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
}

function WorkspaceGuide({locale,phase,open,onOpenChange}:{locale:Locale;phase:"work"|"recovery";open:boolean;onOpenChange:(open:boolean)=>void}) {
  const chinese=locale==="zh-CN";
  const items=phase==="work"
    ?[
      ["materials",BookOpenText,chinese?"材料":"Materials",chinese?"阅读 5 段材料。点击任意材料卡片即可查看完整内容，系统会记录阅读进度。":"Read the five sources. Open any material card to see its full content."],
      ["chat",Sparkle,chinese?"AI 助手":"AI assistant",chinese?"在这里比较问题框架、核查证据并标记不确定性。AI 不会替你完成最终答案。":"Compare framings, check evidence, and mark uncertainty here."],
      ["memo",NotePencil,chinese?"研究备忘录":"Research memo",chinese?"随时记录候选框架、假设、排除方向和下一步，内容会自动保存。":"Record framings, hypotheses, rejected paths, and next actions. Changes autosave."],
      ["support",Target,chinese?"第一阶段目标":"Phase 1 goals",chinese?"这里帮助你检查当前任务要求。测试模式下可以随时进入保存窗口。":"Use this checklist to review the task. Test mode lets you open the save window at any time."],
    ]
    :[
      ["materials",BookOpenText,chinese?"材料":"Materials",chinese?"需要核对结论时回到证据原文，避免只依赖恢复摘要。":"Return to the source when checking a claim."],
      ["chat",Sparkle,chinese?"AI 助手":"AI assistant",chinese?"继续向 AI 追问证据、替代解释和仍未验证的问题。":"Continue asking about evidence, alternatives, and open questions."],
      ["memo",NotePencil,chinese?"研究备忘录":"Research memo",chinese?"在这里继续完成 600–900 字研究 memo，修改会自动保存。":"Complete the 600–900 word memo here. Changes autosave."],
      ["support",Brain,chinese?"推理恢复支持":"Reasoning recovery",chinese?"通过恢复摘要、推理卡片和知识网络找回中断前的推理位置。":"Use the brief, cards, and network to recover your prior reasoning position."],
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
    return()=>{cancelAnimationFrame(frame);window.removeEventListener("resize",update);};
  },[open,targetId]);
  if(!open||!rect)return null;
  const [,I,title,description]=items[step];
  const Icon=I as typeof Brain;
  const gap=8;
  const top=Math.max(0,rect.top-gap);
  const left=Math.max(0,rect.left-gap);
  const right=Math.min(window.innerWidth,rect.right+gap);
  const bottom=Math.min(window.innerHeight,rect.bottom+gap);
  const calloutOnRight=right+340<window.innerWidth;
  const calloutStyle={
    top:`${Math.max(16,Math.min(window.innerHeight-260,rect.top+18))}px`,
    left:calloutOnRight?`${right+18}px`:`${Math.max(16,left-338)}px`,
  };
  const finish=()=>{setStep(0);eventLog("workspace_tour_completed",{phase},{stage:phase});onOpenChange(false);};
  return <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={chinese?"工作区分步导览":"Workspace tour"}>
    <div className="absolute bg-slate-950/55 backdrop-blur-[2px]" style={{inset:"0 0 auto 0",height:top}}/>
    <div className="absolute bg-slate-950/55 backdrop-blur-[2px]" style={{top,left:0,width:left,height:bottom-top}}/>
    <div className="absolute bg-slate-950/55 backdrop-blur-[2px]" style={{top,left:right,right:0,height:bottom-top}}/>
    <div className="absolute bg-slate-950/55 backdrop-blur-[2px]" style={{top:bottom,left:0,right:0,bottom:0}}/>
    <div className="pointer-events-none absolute rounded-2xl ring-4 ring-white shadow-[0_0_0_2px_var(--primary),0_18px_70px_rgba(13,22,48,.32)]" style={{top,left,width:right-left,height:bottom-top}}/>
    <aside className="absolute w-80 rounded-2xl border bg-white p-5 shadow-[0_24px_80px_rgba(10,18,44,.28)]" style={calloutStyle}>
      <div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><Icon size={21}/></span><span className="text-xs font-semibold text-muted-foreground">{step+1} / {items.length}</span></div>
      <h2 className="mt-4 text-lg font-semibold">{String(title)}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{String(description)}</p>
      <div className="mt-5 flex items-center justify-between"><Button variant="ghost" size="sm" onClick={finish}>{chinese?"退出导览":"Exit"}</Button><Button size="sm" onClick={()=>step===items.length-1?finish():setStep(current=>current+1)}>{step===items.length-1?(chinese?"完成":"Done"):(chinese?"下一步":"Next")}<ArrowRight/></Button></div>
    </aside>
  </div>;
}

function Workspace({
  locale,
  condition,
  taskId,
  phase,
  memo,
  setMemo,
  chat,
  setChat,
  setScreen,
  testMode,
  deepSeekModel,
  t,
}: {
  locale: Locale;
  condition: Condition;
  taskId: ResearchTaskId;
  phase: "work" | "recovery";
  memo: string;
  setMemo: (memo: string) => void;
  chat: ChatMessage[];
  setChat: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setScreen: (screen: Screen) => void;
  testMode: boolean;
  deepSeekModel: DeepSeekModel;
  t: typeof copy[Locale];
}) {
  const [cards,setCards]=useState(()=>createInitialCards(taskId));
  const [selected,setSelected]=useState("uncertain");
  const [message,setMessage]=useState("");
  const [isLoading,setIsLoading]=useState(false);
  const [guideOpen,setGuideOpen]=useState(true);
  const phaseDuration=10*60;
  const recoveryDuration=15*60;
  const remaining=useStageCountdown(`${phase}-${taskId}`,phase==="work"?phaseDuration:recoveryDuration,!testMode);
  const updateStatus=(id:string,status:EpistemicStatus)=>{setCards(cs=>cs.map(c=>c.id===id?{...c,status,revision:c.revision+1}:c));eventLog("card_status_changed",{status},{stage:"recovery",targetType:"reasoning_card",targetId:id})};
  const togglePin=(id:string)=>{setCards(cs=>cs.map(c=>c.id===id?{...c,priority:c.priority==="pinned"?"normal":"pinned",revision:c.revision+1}:c));eventLog("card_pin_toggled",{id},{stage:"recovery",targetType:"reasoning_card",targetId:id})};
  const updateContent=(id:string,value:string)=>{setCards(cs=>cs.map(c=>c.id===id?{...c,content:{...c.content,[locale]:value},revision:c.revision+1}:c));eventLog("card_content_edited",{locale},{stage:"recovery",targetType:"reasoning_card",targetId:id})};
  const send=async()=>{
    const userText=message.trim();
    if(!userText||isLoading)return;
    const history:ChatMessage[]=[...chat,{role:"user",text:userText}];
    setChat(history);
    setMessage("");
    setIsLoading(true);
    eventLog("chat_message_sent",{taskId,phase},{stage:"research_work"});
    try{
      const response=await fetch("/api/chat",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          locale,
          taskId,
          model:deepSeekModel,
          messages:history.map(item=>({role:item.role,content:item.text})),
        }),
      });
      const result=await response.json() as {content?:string;mode?:string;error?:string};
      if(!response.ok||!result.content)throw new Error(result.error||"No model response");
      setChat(current=>[...current,{role:"assistant",text:result.content!}]);
      eventLog("chat_response_received",{taskId,providerMode:result.mode||"unknown"},{stage:"research_work"});
    }catch{
      setChat(current=>[...current,{role:"assistant",text:locale==="zh-CN"?"暂时无法连接 AI。你的材料阅读和 memo 已保留；请稍后重试，并继续把证据与推断分开记录。":"The AI is temporarily unavailable. Your materials and memo are preserved; retry later and continue separating evidence from inference."}]);
      eventLog("chat_response_failed",{taskId},{stage:"research_work"});
    }finally{
      setIsLoading(false);
    }
  };
  return <div className="h-screen min-h-[720px] overflow-hidden bg-[#f8f7f3]">
    <WorkspaceGuide locale={locale} phase={phase} open={guideOpen} onOpenChange={setGuideOpen}/>
    <header className="flex h-[68px] items-center justify-between border-b bg-white/90 px-5"><div className="flex items-center gap-4"><Brand/>{phase==="work"&&<Badge variant="secondary" className="rounded-full">{locale==="zh-CN"?"第一阶段":"Phase 1"}</Badge>}<Badge variant="outline" className="rounded-full bg-white text-[10px]">{deepSeekModel==="deepseek-v4-pro"?"V4 Pro":"V4 Flash"}</Badge></div><div className="flex items-center gap-5 text-sm"><span className="flex items-center gap-2 font-mono text-primary"><Timer size={18}/>{testMode?(locale==="zh-CN"?"测试模式":"Test mode"):formatClock(remaining)}</span><span className="flex items-center gap-2 text-[var(--active)]"><CheckCircle size={18}/>{t.saved}</span><span className="flex items-center gap-2 text-muted-foreground"><Globe size={18}/>{locale==="zh-CN"?"中文":"English"}</span><button onClick={()=>setGuideOpen(true)} aria-label={t.help} className="grid size-10 place-items-center rounded-lg hover:bg-muted"><Question size={20}/></button></div></header>
    <ExperimentTimeline locale={locale} active={phase==="work"?"task":"resume"} compact/>
    <div className="workspace-grid grid h-[calc(100vh-120px)] min-h-0 overflow-hidden">
      <MaterialsPanel locale={locale} taskId={taskId} t={t}/>
      <ChatPanel locale={locale} chat={chat} message={message} setMessage={setMessage} send={send} isLoading={isLoading} t={t}/>
      <section className="grid min-h-0 min-w-0 grid-rows-[minmax(0,38%)_minmax(0,62%)] overflow-hidden bg-white">
        <MemoPanel locale={locale} memo={memo} setMemo={setMemo} t={t}/>
        {phase==="work"
          ?<PhaseOnePanel locale={locale} taskId={taskId} memo={memo} remaining={remaining} unlockAt={3*60} testMode={testMode} setScreen={setScreen}/>
          :<RecoveryPanel locale={locale} condition={condition} cards={cards} selected={selected} setSelected={setSelected} updateStatus={updateStatus} togglePin={togglePin} updateContent={updateContent} remaining={remaining} unlockAt={7*60} testMode={testMode} setScreen={setScreen} t={t}/>}
      </section>
    </div>
  </div>
}

function MaterialsPanel({locale,taskId,t}:{locale:Locale;taskId:ResearchTaskId;t:typeof copy[Locale]}) {
  const task=getResearchTask(taskId);
  const materials=task.materials;
  const [active,setActive]=useState(materials[0].id);
  const [read,setRead]=useState<Set<string>>(()=>new Set([materials[0].id]));
  const openMaterial=(id:string)=>{
    setActive(id);
    setRead(current=>new Set([...current,id]));
    eventLog("material_opened",{id,taskId},{stage:"research_work",targetType:"material",targetId:id});
  };
  return <aside data-tour="materials" className="min-h-0 min-w-0 overflow-hidden border-r bg-[#fbfaf7]">
    <div className="flex h-14 items-center justify-between border-b px-5"><h2 className="flex items-center gap-2 font-semibold"><BookOpenText size={20}/>{t.materials}</h2><Badge variant="outline" className="text-[10px]">5 passages</Badge></div>
    <div className="px-5 py-4"><div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>{t.progress}</span><span>{read.size} / {materials.length}</span></div><Progress value={(read.size/materials.length)*100} className="h-1.5"/></div>
    <div className="hide-scrollbar h-[calc(100%-118px)] overflow-y-auto px-3 pb-4">{materials.map(material=><button key={material.id} onClick={()=>openMaterial(material.id)} className={`mb-2 w-full rounded-xl px-3 py-4 text-left transition ${active===material.id?"bg-white shadow-[0_5px_18px_rgba(35,43,70,.07)] ring-1 ring-primary/15":"hover:bg-white/80"}`}><div className="mb-2 flex items-center justify-between"><span className="grid size-6 place-items-center rounded-md bg-secondary text-xs font-semibold text-primary">{material.n}</span>{read.has(material.id)&&<span className="flex items-center gap-1 text-[10px] text-[var(--active)]"><Check size={12}/>{locale==="zh-CN"?"已阅读":"Read"}</span>}</div><h3 className="text-sm font-semibold leading-5">{material.title[locale]}</h3><p className={`mt-2 whitespace-pre-line text-xs leading-5 text-muted-foreground ${active===material.id?"":"line-clamp-3"}`}>{material.excerpt[locale]}</p><p className="mt-3 text-[10px] text-primary">{material.meta[locale]}</p></button>)}</div>
  </aside>;
}

function ChatPanel({locale,chat,message,setMessage,send,isLoading,t}:{locale:Locale;chat:ChatMessage[];message:string;setMessage:(s:string)=>void;send:()=>void;isLoading:boolean;t:typeof copy[Locale]}) {
  return <section data-tour="chat" className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r bg-white">
    <div className="flex h-14 shrink-0 items-center justify-between border-b px-5"><h2 className="flex items-center gap-2 font-semibold"><Sparkle size={19} className="text-primary" weight="fill"/>{t.chat}</h2><Badge variant="outline" className="text-[10px]">DeepSeek</Badge></div>
    <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5">
      <div className="mb-5 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground"><div className="h-px flex-1 bg-border"/>Research session<div className="h-px flex-1 bg-border"/></div>
      {chat.map((item,index)=><div key={`${item.role}-${index}`} className={`mb-4 flex ${item.role==="user"?"justify-end":"justify-start"}`}><div className={`max-w-[88%] whitespace-pre-wrap rounded-xl px-4 py-3 text-sm leading-6 ${item.role==="user"?"bg-secondary text-secondary-foreground":"bg-[#f5f6f8]"}`}>{item.text}</div></div>)}
      {isLoading&&<div className="mb-4 flex justify-start"><div className="rounded-xl bg-[#f5f6f8] px-4 py-3 text-xs text-muted-foreground"><Sparkle size={14} className="mr-2 inline animate-pulse text-primary"/>{locale==="zh-CN"?"DeepSeek 正在对照材料…":"DeepSeek is comparing the evidence…"}</div></div>}
    </div>
    <div className="shrink-0 border-t bg-[#fcfcfd] px-4 pb-3 pt-3"><div className="flex items-end gap-2"><Textarea value={message} disabled={isLoading} onChange={event=>setMessage(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();send()}}} rows={2} className="min-h-[72px] flex-1 resize-none rounded-xl border bg-white px-3 py-2.5 shadow-none focus-visible:ring-2" placeholder={t.ask}/><Button size="icon" className="mb-0.5 size-10 shrink-0 rounded-xl" onClick={send} disabled={isLoading||!message.trim()} aria-label="Send"><PaperPlaneTilt size={18} weight="fill"/></Button></div><p className="mt-2 text-center text-[10px] text-muted-foreground">{t.disclaimer}</p></div>
  </section>;
}

function MemoPanel({locale,memo,setMemo,t}:{locale:Locale;memo:string;setMemo:(s:string)=>void;t:typeof copy[Locale]}) {
  const count=locale==="zh-CN"?memo.replace(/\s/g,"").length:(memo.trim()?memo.trim().split(/\s+/).length:0);
  return <div data-tour="memo" className="min-h-0 border-b bg-white">
    <div className="flex h-14 items-center justify-between border-b px-5"><h2 className="flex items-center gap-2 font-semibold"><NotePencil size={20}/>{t.memo}</h2><span className="flex items-center gap-2 text-xs text-muted-foreground"><Check size={15}/>{t.saved} · {locale==="zh-CN"?"目标 600–900 字":"Target 600–900 words"}</span></div>
    <div className="h-[calc(100%-56px)] px-6 py-4"><Textarea value={memo} onChange={event=>{const next=event.target.value;const nextCount=locale==="zh-CN"?next.replace(/\s/g,"").length:(next.trim()?next.trim().split(/\s+/).length:0);setMemo(next);eventLog("memo_edited",{count:nextCount},{stage:"research_work",targetType:"memo"})}} className="h-full resize-none border-0 p-0 pb-7 text-[15px] leading-7 shadow-none focus-visible:ring-0" placeholder={t.memoPlaceholder}/><div className="-mt-6 text-right font-mono text-[10px] text-muted-foreground">{count} {t.words} · 600–900</div></div>
  </div>;
}

function PhaseOnePanel({locale,taskId,memo,remaining,unlockAt,testMode,setScreen}:{locale:Locale;taskId:ResearchTaskId;memo:string;remaining:number;unlockAt:number;testMode:boolean;setScreen:(screen:Screen)=>void}) {
  const task=getResearchTask(taskId);
  const [completed,setCompleted]=useState<Set<number>>(()=>new Set());
  const [lockNotice,setLockNotice]=useState(false);
  const toggleGoal=(index:number)=>setCompleted(current=>{
    const next=new Set(current);
    if(next.has(index))next.delete(index);else next.add(index);
    eventLog("phase_goal_toggled",{taskId,index,completed:!current.has(index)},{stage:"research_work"});
    return next;
  });
  const memoCount=locale==="zh-CN"?memo.replace(/\s/g,"").length:(memo.trim()?memo.trim().split(/\s+/).length:0);
  return <section data-tour="support" className="flex min-h-0 flex-col bg-[#fbfcfe]">
    <div className="flex h-14 shrink-0 items-center justify-between border-b px-5"><h2 className="flex items-center gap-2 font-semibold"><Target size={20} className="text-primary"/>{locale==="zh-CN"?"第一阶段目标":"Phase 1 goals"}</h2><Badge variant="outline" className="bg-white text-[10px]">{completed.size} / {phaseOneGoals.length}</Badge></div>
    <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4">
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700">{task.label[locale]} · Research question</p><p className="mt-2 text-sm font-semibold leading-6 text-indigo-950">{task.question[locale]}</p></div>
      <div className="mt-4 space-y-2">{phaseOneGoals.map((goal,index)=><label key={goal[locale]} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-xs leading-5 transition ${completed.has(index)?"border-emerald-200 bg-emerald-50/60":"bg-white"}`}><input type="checkbox" checked={completed.has(index)} onChange={()=>toggleGoal(index)} className="mt-0.5 size-4 accent-[var(--active)]"/><span>{goal[locale]}</span></label>)}</div>
      <details className="mt-4 rounded-xl border bg-white p-4"><summary className="cursor-pointer text-xs font-semibold">{locale==="zh-CN"?"查看最终 memo 的 6 个问题":"View the six final-memo questions"}</summary><ol className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">{memoQuestions.map((question,index)=><li key={question[locale]}>{index+1}. {question[locale]}</li>)}</ol></details>
    </div>
    <div className="shrink-0 border-t bg-white px-5 py-3">
      <div className="mb-2 flex justify-between text-[10px] text-muted-foreground"><span>{locale==="zh-CN"?"当前工作区":"Current workspace"}</span><span>{testMode?(locale==="zh-CN"?"测试模式 · 可直接进入":"Test mode · Open anytime"):remaining<=unlockAt?(locale==="zh-CN"?"保存窗口已开放":"Save window open"):(locale==="zh-CN"?`最后 3 分钟开放 · ${formatClock(remaining)}`:`Opens in final 3 minutes · ${formatClock(remaining)}`)}</span></div>
      {!testMode&&lockNotice&&remaining>unlockAt&&<p role="status" className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-800">{locale==="zh-CN"?"倒计时进入最后 3 分钟后，才可以进入保存窗口。请继续完成当前推理。":"The save window opens only in the final three minutes. Continue your reasoning for now."}</p>}
      <Button variant={testMode||remaining<=unlockAt?"default":"secondary"} className="h-11 w-full text-sm" onClick={()=>{
        if(!testMode&&remaining>unlockAt){setLockNotice(true);eventLog("checkpoint_open_blocked",{remaining},{stage:"research_work"});return;}
        eventLog("phase_one_checkpoint_requested",{taskId,completedGoals:completed.size,memoCount,remaining},{stage:"research_work"});
        setScreen("checkpoint");
      }}>{locale==="zh-CN"?"进入保存窗口":"Open save window"}<ArrowRight size={17}/></Button>
    </div>
  </section>;
}

function RecoveryPanel({locale,condition,cards,selected,setSelected,updateStatus,togglePin,updateContent,remaining,unlockAt,testMode,setScreen,t}:{locale:Locale;condition:Condition;cards:ReasoningCard[];selected:string;setSelected:(s:string)=>void;updateStatus:(id:string,s:EpistemicStatus)=>void;togglePin:(id:string)=>void;updateContent:(id:string,value:string)=>void;remaining:number;unlockAt:number;testMode:boolean;setScreen:(s:Screen)=>void;t:typeof copy[Locale]}) {
  const main=cards.find(card=>card.goalLevel==="main");
  const position=cards.filter(card=>card.goalLevel==="subgoal"&&card.status!=="expired").slice(0,2).map(card=>card.content[locale]).join("；");
  const uncertain=cards.find(card=>card.status==="uncertain");
  const ruled=cards.find(card=>card.cardType==="path"&&card.status==="expired");
  const next=cards.find(card=>card.cardType==="next_action");
  const summary=locale==="zh-CN"
    ?`当前目标：${main?.content[locale]||"未识别"}。推理位置：${position||"未识别"}。仍需核查：${uncertain?.content[locale]||"未识别"}。下一步：${next?.content[locale]||"未识别"}。`
    :`Current goal: ${main?.content[locale]||"not identified"}. Reasoning position: ${position||"not identified"}. Still uncertain: ${uncertain?.content[locale]||"not identified"}. Next step: ${next?.content[locale]||"not identified"}.`;
  const notes=locale==="zh-CN"
    ?`当前目标：${main?.content[locale]||"—"}\n推理位置：${position||"—"}\n存疑：${uncertain?.content[locale]||"—"}\n已排除：${ruled?.content[locale]||"—"}\n下一步：${next?.content[locale]||"—"}`
    :`Current goal: ${main?.content[locale]||"—"}\nReasoning position: ${position||"—"}\nUncertain: ${uncertain?.content[locale]||"—"}\nRuled out: ${ruled?.content[locale]||"—"}\nNext step: ${next?.content[locale]||"—"}`;
  if(condition==="summary") return <RecoveryShell t={t}><div className="mx-6 mt-4 rounded-xl bg-muted/60 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Auto Summary</p><p className="mt-3 text-sm leading-7">{summary}</p></div><PrimaryContinue remaining={remaining} unlockAt={unlockAt} testMode={testMode} setScreen={setScreen} t={t}/></RecoveryShell>;
  if(condition==="notes") return <RecoveryShell t={t}><div className="mx-6 mt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your notes</p><Textarea className="min-h-40 leading-7" defaultValue={notes}/></div><PrimaryContinue remaining={remaining} unlockAt={unlockAt} testMode={testMode} setScreen={setScreen} t={t}/></RecoveryShell>;
  return <RecoveryShell t={t}><Tabs defaultValue="brief" className="flex min-h-0 flex-1 flex-col"><div className="flex items-center justify-between border-b bg-white px-4 py-2"><TabsList className="h-10 rounded-xl bg-secondary/70 p-1"><TabsTrigger className="h-8 min-w-24 rounded-lg border-0 px-3 text-xs data-active:bg-white data-active:text-primary data-active:shadow-sm" value="brief"><Brain weight="duotone"/>{t.resume}</TabsTrigger><TabsTrigger className="h-8 min-w-24 rounded-lg border-0 px-3 text-xs data-active:bg-white data-active:text-primary data-active:shadow-sm" value="cards"><SquaresFour weight="duotone"/>{t.cards}</TabsTrigger><TabsTrigger className="h-8 min-w-24 rounded-lg border-0 px-3 text-xs data-active:bg-white data-active:text-primary data-active:shadow-sm" value="network"><Graph weight="duotone"/>{t.network}</TabsTrigger></TabsList><span className="rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground">{cards.length} {t.allCards}</span></div>
    <TabsContent value="brief" className="m-0 min-h-0 flex-1 overflow-auto"><ResumeBrief locale={locale} cards={cards} t={t}/></TabsContent>
    <TabsContent value="cards" className="m-0 grid min-h-0 flex-1 grid-cols-[1.18fr_.82fr]"><div className="hide-scrollbar min-h-0 overflow-y-auto border-r px-4 py-3"><div className="mb-3 rounded-lg bg-secondary/70 p-3 text-xs leading-5 text-secondary-foreground"><strong>{t.ready}：</strong>{t.readFirst}</div><GoalHierarchy cards={cards} locale={locale} selected={selected} setSelected={setSelected}/><p className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Problem state cards</p>{cards.filter(card=>card.cardType!=="goal").map(card=><ReasoningCardView key={card.id} card={card} locale={locale} selected={selected===card.id} onSelect={()=>{setSelected(card.id);eventLog("card_selected",{id:card.id},{stage:"recovery",targetType:"reasoning_card",targetId:card.id})}} updateStatus={updateStatus} t={t}/>)}</div><CardInspector key={`${selected}-${locale}`} card={cards.find(card=>card.id===selected) || cards[0]} locale={locale} updateStatus={updateStatus} togglePin={togglePin} updateContent={updateContent} t={t}/></TabsContent>
    <TabsContent value="network" className="m-0 min-h-0 flex-1"><KnowledgeNetwork locale={locale} cards={cards} selected={selected} setSelected={setSelected}/></TabsContent>
  </Tabs><PrimaryContinue remaining={remaining} unlockAt={unlockAt} testMode={testMode} setScreen={setScreen} t={t}/></RecoveryShell>;
}

function RecoveryShell({children,t}:{children:React.ReactNode;t:typeof copy[Locale]}) { return <div data-tour="support" className="flex min-h-0 flex-col bg-[#fbfcfe]"><div className="flex h-14 shrink-0 items-center justify-between border-b px-5"><div><h2 className="flex items-center gap-2 font-semibold"><Brain size={20} className="text-primary"/>{t.recovery}</h2></div><Badge variant="outline" className="bg-white text-[10px]"><Clock size={13}/>24h</Badge></div>{children}</div> }

function ResumeBrief({locale,cards,t}:{locale:Locale;cards:ReasoningCard[];t:typeof copy[Locale]}) {
  const main=cards.find(card=>card.goalLevel==="main");
  const subgoals=cards.filter(card=>card.goalLevel==="subgoal"&&card.status!=="expired").slice(0,2);
  const uncertain=cards.find(card=>card.status==="uncertain");
  const ruled=cards.find(card=>card.cardType==="path"&&card.status==="expired");
  const next=cards.find(card=>card.cardType==="next_action");
  const rows=[
    [Target,t.currentGoal,main?.content[locale]||"—"],
    [Brain,t.position,subgoals.map(card=>card.content[locale]).join(" · ")],
    [WarningCircle,t.uncertain,uncertain?.content[locale]||"—"],
    [XCircle,t.ruled,ruled?.content[locale]||"—"],
    [ArrowRight,t.nextStep,next?.content[locale]||main?.nextAction?.[locale]||"—"],
  ];
  return <div className="mx-auto max-w-2xl px-6 py-5"><div className="mb-3 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-xs leading-5 text-indigo-900">{locale==="zh-CN"?"以下仅显示中断前已保存的恢复关键点；存疑内容不会被压平为结论。":"Only the calibrated recovery-critical state is shown; uncertain content is not flattened into a conclusion."}</div><div className="divide-y rounded-xl border bg-white">{rows.map(([I,label,value],i)=>{const Icon=I as typeof Target;return <div key={String(label)} className={`grid grid-cols-[32px_120px_1fr] items-start gap-2 px-4 py-3 ${i===4?"bg-[var(--active-soft)]":""}`}><Icon size={18} className={i===2?"text-[var(--uncertain)]":i===4?"text-[var(--active)]":"text-primary"}/><span className="text-xs font-medium text-muted-foreground">{String(label)}</span><span className="text-sm leading-5">{String(value)}</span></div>})}</div></div>
}

function GoalHierarchy({cards,locale,selected,setSelected}:{cards:ReasoningCard[];locale:Locale;selected:string;setSelected:(id:string)=>void}) {
  const main=cards.find(card=>card.goalLevel==="main");
  const active=cards.filter(card=>card.goalLevel==="subgoal").slice(0,4);
  const suspended=cards.filter(card=>card.goalLevel==="suspended").slice(0,3);
  const tile=(card:ReasoningCard)=> {
    const tone=card.status==="uncertain"?"border-amber-200 bg-amber-50/70":card.status==="expired"?"border-slate-200 bg-slate-50 text-slate-500":"border-emerald-200 bg-emerald-50/55";
    return <button key={card.id} onClick={()=>{setSelected(card.id);eventLog("goal_selected",{goalLevel:card.goalLevel},{stage:"recovery",targetType:"reasoning_card",targetId:card.id})}} className={`w-full rounded-lg border p-2.5 text-left ${tone} ${selected===card.id?"ring-2 ring-primary/25":""}`}><div className="flex items-center justify-between"><span className="text-[9px] font-semibold uppercase tracking-wider">{card.status}</span>{card.priority==="pinned"&&<PushPin size={12} weight="fill" className="text-primary"/>}</div><p className="mt-1.5 text-[11px] font-semibold leading-4 text-foreground">{card.content[locale]}</p>{card.nextAction&&<p className="mt-1 line-clamp-1 text-[9px] text-muted-foreground">→ {card.nextAction[locale]}</p>}</button>
  };
  return <div className="rounded-xl border bg-white p-3"><div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{locale==="zh-CN"?"目标层级":"Goal hierarchy"}</p><Badge variant="outline" className="text-[9px]">{active.length}/4 active</Badge></div>{main&&tile(main)}<div className="mt-2 grid grid-cols-[1.25fr_.75fr] gap-2"><div><p className="mb-1.5 text-[9px] font-medium text-muted-foreground">{locale==="zh-CN"?"活跃子目标":"Active subgoals"}</p><div className="grid grid-cols-2 gap-2">{active.map(tile)}</div></div><details open className="rounded-lg bg-muted/40 p-2"><summary className="cursor-pointer text-[9px] font-medium text-muted-foreground">{locale==="zh-CN"?"挂起目标":"Suspended goals"} · {suspended.length}</summary><div className="mt-2 space-y-2">{suspended.map(tile)}</div></details></div></div>
}

function CardInspector({card,locale,updateStatus,togglePin,updateContent,t}:{card:ReasoningCard;locale:Locale;updateStatus:(id:string,s:EpistemicStatus)=>void;togglePin:(id:string)=>void;updateContent:(id:string,value:string)=>void;t:typeof copy[Locale]}) {
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(card.content[locale]);
  return <aside className="min-h-0 overflow-y-auto bg-[#fcfcfd] p-4"><div className="flex items-start justify-between"><div><Badge variant="outline" className="text-[9px]">{card.goalLevel||card.cardType}</Badge><h3 className="mt-3 text-sm font-semibold leading-5">{card.content[locale]}</h3></div>{card.priority==="pinned"&&<PushPin size={16} weight="fill" className="text-primary"/>}</div>{editing?<div className="mt-4"><Textarea value={draft} onChange={e=>setDraft(e.target.value)} className="min-h-24 text-xs leading-5"/><div className="mt-2 flex gap-2"><Button size="sm" onClick={()=>{updateContent(card.id,draft);setEditing(false)}}><Check/>{t.verify}</Button><Button size="sm" variant="ghost" onClick={()=>setEditing(false)}>Cancel</Button></div></div>:<p className="mt-3 text-xs leading-5 text-muted-foreground">{card.detail[locale]}</p>}<div className="mt-4 rounded-lg border bg-white p-3"><div className="flex gap-2"><LinkSimple size={14} className="mt-0.5 shrink-0 text-primary"/><div><p className="text-[10px] font-semibold">{locale==="zh-CN"?"来源与回链":"Source backlink"}</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{card.sourceRefs.map(source=>source.label).join(" · ")||"No source"}</p></div></div>{card.riskTags.length>0&&<div className="mt-3 flex flex-wrap gap-1">{card.riskTags.map(tag=><Badge key={tag} variant="secondary" className="text-[8px]">{tag}</Badge>)}</div>}</div>{typeof card.confidence==="number"&&<div className="mt-4"><div className="mb-1 flex justify-between text-[10px]"><span>{locale==="zh-CN"?"提取置信度":"Extraction confidence"}</span><span>{card.confidence}%</span></div><Progress value={card.confidence} className="h-1.5"/></div>}<div className="mt-5 grid grid-cols-2 gap-2"><Button size="sm" variant={card.status==="active"?"secondary":"outline"} onClick={()=>updateStatus(card.id,"active")}><CheckCircle/>{t.verify}</Button><Button size="sm" variant="outline" onClick={()=>setEditing(true)}><NotePencil/>{locale==="zh-CN"?"编辑":"Edit"}</Button><Button size="sm" variant="outline" onClick={()=>togglePin(card.id)}><PushPin/>{t.pin}</Button><Button size="sm" variant="outline" onClick={()=>updateStatus(card.id,"uncertain")}><WarningCircle/>{locale==="zh-CN"?"存疑":"Uncertain"}</Button><Button size="sm" variant="ghost" className="col-span-2" onClick={()=>updateStatus(card.id,"expired")}><PauseCircle/>{t.expire}</Button></div><p className="mt-4 text-[9px] leading-4 text-muted-foreground">{locale==="zh-CN"?"接受、编辑、置顶、存疑和过期都会被作为独立事件记录。":"Accept, edit, pin, uncertainty, and expiry are logged as separate events."}</p></aside>
}

function ReasoningCardView({card,locale,selected,onSelect,updateStatus,t}:{card:ReasoningCard;locale:Locale;selected:boolean;onSelect:()=>void;updateStatus:(id:string,s:EpistemicStatus)=>void;t:typeof copy[Locale]}) { const status={active:{label:"Active",icon:CheckCircle,cls:"border-l-[var(--active)] bg-[var(--active-soft)]/55 text-[var(--active)]"},uncertain:{label:"Uncertain",icon:WarningCircle,cls:"border-l-[var(--uncertain)] bg-[var(--uncertain-soft)]/60 text-[var(--uncertain)]"},expired:{label:"Expired",icon:PauseCircle,cls:"border-l-[var(--expired)] bg-muted/50 text-[var(--expired)]"},draft:{label:"Draft",icon:Clock,cls:"border-l-primary bg-secondary/40 text-primary"}}[card.status]; const Icon=status.icon; return <article onClick={onSelect} className={`mb-2 cursor-pointer rounded-lg border border-l-[3px] bg-white p-3 transition ${status.cls} ${selected?"ring-2 ring-primary/20 shadow-sm":"hover:shadow-sm"}`}><div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[10px] font-semibold"><Icon size={14}/>{status.label}{card.priority==="pinned"&&<PushPin size={13} weight="fill"/>}</span><span className="text-[9px] text-muted-foreground">v{card.revision}</span></div><h3 className="mt-2 text-[13px] font-semibold leading-5 text-foreground">{card.content[locale]}</h3><p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{card.detail[locale]}</p><div className="mt-2 flex items-center justify-between border-t pt-2"><button onClick={e=>{e.stopPropagation();eventLog("evidence_opened",{card:card.id})}} className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"><LinkSimple size={12}/>{t.evidence} · {card.sourceRefs[0]?.label}</button>{card.status==="uncertain"?<button onClick={e=>{e.stopPropagation();updateStatus(card.id,"active")}} className="text-[10px] font-medium text-[var(--active)] hover:underline">{t.verify}</button>:card.status==="expired"?<button onClick={e=>{e.stopPropagation();updateStatus(card.id,"active")}} className="text-[10px] hover:underline">{t.restore}</button>:<button onClick={e=>{e.stopPropagation();updateStatus(card.id,"expired")}} className="text-[10px] text-muted-foreground hover:underline">{t.expire}</button>}</div></article> }

type FlowData={ label:string; status:EpistemicStatus; selected:boolean };
function FlowNode({data}:{data:FlowData}) { const colors=data.status==="active"?"border-emerald-400 bg-emerald-50":data.status==="uncertain"?"border-amber-400 bg-amber-50":"border-slate-300 bg-slate-50"; return <div className={`w-[118px] rounded-lg border-2 px-3 py-2 text-center text-[10px] font-medium leading-4 shadow-sm ${colors} ${data.selected?"ring-4 ring-indigo-100":""}`}><Handle type="target" position={Position.Left}/>{data.label}<Handle type="source" position={Position.Right}/></div> }
const nodeTypes={reason:FlowNode};
const flowPositions:Record<string,{x:number;y:number}>={
  goal:{x:260,y:0},
  "goal-compare":{x:60,y:90},
  "goal-load":{x:220,y:90},
  "goal-prior":{x:380,y:90},
  "goal-longitudinal":{x:530,y:190},
  "goal-domain":{x:530,y:270},
  hypothesis:{x:220,y:210},
  uncertain:{x:40,y:300},
  constraint:{x:390,y:300},
  path:{x:40,y:410},
  next:{x:230,y:410},
};
function KnowledgeNetwork({locale,cards,selected,setSelected,compact=false}:{locale:Locale;cards:ReasoningCard[];selected:string;setSelected:(s:string)=>void;compact?:boolean}) { const nodes=useMemo<Node<FlowData>[]>(()=>cards.map(c=>({id:c.id,type:"reason",position:flowPositions[c.id]||{x:0,y:0},data:{label:c.content[locale],status:c.status,selected:c.id===selected}})),[cards,locale,selected]); const edges=useMemo<Edge[]>(()=>relations.map(r=>({id:r.id,source:r.sourceCardId,target:r.targetCardId,label:compact?undefined:r.relationType,animated:r.relationType==="leads_to",style:{stroke:r.relationType==="challenges"?"#c58a2c":"#8a93a5"},labelStyle:{fontSize:9,fill:"#6b7280"}})),[compact]); return <div className="h-full min-h-0 bg-[#fcfcfd]"><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView minZoom={.45} maxZoom={1.4} onNodeClick={(_,n)=>{setSelected(n.id);eventLog("network_node_clicked",{id:n.id})}}><Background gap={22} size={1} color="#e8eaf0"/>{!compact&&<Controls position="bottom-right" showInteractive={false}/>}</ReactFlow></div> }

function PrimaryContinue({remaining,unlockAt,testMode,setScreen,t}:{remaining:number;unlockAt:number;testMode:boolean;setScreen:(s:Screen)=>void;t:typeof copy[Locale]}) {
  const [notice,setNotice]=useState(false);
  const chinese=t.continue==="完成研究";
  return <div className="shrink-0 border-t bg-white px-5 py-3">
    {!testMode&&notice&&remaining>unlockAt&&<p role="status" className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">{chinese?`倒计时剩余 7 分钟后才可完成研究。当前剩余 ${formatClock(remaining)}。`:`You can complete the study when seven minutes remain. Current time: ${formatClock(remaining)}.`}</p>}
    <Button variant={testMode||remaining<=unlockAt?"default":"secondary"} className="h-11 w-full text-sm" onClick={()=>{
      if(!testMode&&remaining>unlockAt){setNotice(true);eventLog("study_completion_blocked",{remaining},{stage:"recovery"});return;}
      eventLog("study_completion_requested",{remaining},{stage:"recovery"});
      setScreen("complete");
    }}>{t.continue}<ArrowRight size={17}/></Button>
  </div>;
}

function Complete({participantCode,locale,condition,taskId,memo,chat,recallResponses,setScreen,t}:{participantCode:string;locale:Locale;condition:Condition;taskId:ResearchTaskId;memo:string;chat:ChatMessage[];recallResponses:string[];setScreen:(s:Screen)=>void;t:typeof copy[Locale]}) {
  const [exported,setExported]=useState(false);
  const exportArchive=()=>{
    exportExperimentArchive({participantCode,locale,condition,taskId,memo,chat,recallResponses});
    setExported(true);
  };
  useEffect(()=>{
    eventLog("experiment_completed",{taskId,condition,memoLength:memo.length,chatTurns:chat.length},{stage:"complete"});
  },[chat.length,condition,memo.length,taskId]);
  return <div className="grid min-h-screen place-items-center bg-[#f7f6f2] p-8"><div className="max-w-lg rounded-2xl border bg-white p-10 text-center shadow-[0_18px_60px_rgba(35,40,65,.07)]"><div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[var(--active-soft)] text-[var(--active)]"><CheckCircle size={36} weight="fill"/></div><h1 className="mt-6 text-3xl font-semibold">{t.completed}</h1><p className="mt-3 text-muted-foreground">{t.completeText}</p><p className="mt-5 rounded-xl bg-muted/60 p-4 text-left text-sm leading-6 text-muted-foreground">{locale==="zh-CN"?"系统已将聊天、memo、回忆回答、计时门槛和全部界面操作归纳为一个结构化 JSON 文件。点击下方按钮下载。":"The system organized chat, memo, recall, timing gates, and all interface events into one structured JSON file."}</p><Button className="mt-6 h-11 w-full" onClick={exportArchive}>{exported?(locale==="zh-CN"?"再次下载交互数据":"Download data again"):(locale==="zh-CN"?"导出全部交互数据":"Export all interaction data")}</Button><Button variant="ghost" className="mt-3" onClick={()=>setScreen("landing")}>{t.back}</Button></div></div>;
}
