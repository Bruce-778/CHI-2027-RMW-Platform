"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, BookOpenText, Brain, Check, CheckCircle, Clock,
  Globe, Question, LinkSimple,
  NotePencil, PaperPlaneTilt, PauseCircle, PushPin, Sparkle,
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
import { eventLog } from "@/lib/event-log";
import {
  getResearchTask,
  memoQuestions,
  phaseOneGoals,
  taskOverview,
  type ResearchTaskId,
} from "@/lib/research-task";
import type { Condition, EpistemicStatus, Locale, ReasoningCard } from "@/lib/rmw-types";
import { InterruptionTask, RmwCheckpoint } from "@/components/rmw-checkpoint";
import { TimedButton } from "@/components/timed-button";

type Screen = "landing" | "brief" | "survey" | "work" | "checkpoint" | "interruption" | "workspace" | "recall" | "complete";
type ChatMessage = { role: "user" | "assistant"; text: string };

const copy = {
  "zh-CN": {
    study: "大学生科研思考与恢复研究", consent: "我已阅读并同意参与研究",
    anonymous: "匿名登入", anonymousPlaceholder: "请输入匿名编号", enter: "开始研究", language: "界面语言",
    pretitle: "开始前，先了解你的经验", next: "继续", back: "返回",
    materials: "材料", chat: "AI 助手", memo: "研究备忘录", recovery: "推理恢复支持",
    day: "Day 2 · 恢复阶段", saved: "已保存", help: "帮助", progress: "阅读进度",
    ask: "向 AI 助手提问…", disclaimer: "AI 可能出错，请结合材料与证据判断。",
    memoPlaceholder: "继续写下你的研究问题、发现与实验计划…", words: "字",
    resume: "恢复摘要", cards: "推理卡片", network: "知识网络", relations: "关系列表",
    currentGoal: "当前目标", position: "推理位置", uncertain: "仍未验证", ruled: "已排除", nextStep: "最小下一步",
    continue: "继续研究", evidence: "查看证据", pin: "置顶", verify: "已核查", expire: "过期", restore: "恢复",
    allCards: "全部卡片", ready: "从这里继续", readFirst: "先花一分钟看恢复摘要，再检查存疑内容。",
    recallTitle: "在查看恢复支持前，请先回忆", recallSub: "请根据记忆回答。提交后才会显示昨天的恢复材料。",
    submitRecall: "提交并查看恢复支持", completed: "任务已完成", completeText: "感谢参与。你的回答已安全保存。",
    desktop: "请使用桌面设备", desktopText: "为了保证实验条件一致，本研究需要至少 1100px 宽的桌面浏览器。",
  },
  en: {
    study: "Student Research Framing & Recovery Study", consent: "I have read the information and agree to participate",
    anonymous: "Anonymous login", anonymousPlaceholder: "Enter an anonymous ID", enter: "Start study", language: "Interface language",
    pretitle: "A few questions about your experience", next: "Continue", back: "Back",
    materials: "Materials", chat: "AI assistant", memo: "Research memo", recovery: "Reasoning recovery",
    day: "Day 2 · Resume", saved: "Saved", help: "Help", progress: "Reading progress",
    ask: "Ask the AI assistant…", disclaimer: "AI can make mistakes. Check important claims against the evidence.",
    memoPlaceholder: "Continue your research problem, findings, and study plan…", words: "words",
    resume: "Resume brief", cards: "Reasoning cards", network: "Knowledge network", relations: "Relation list",
    currentGoal: "Current goal", position: "Reasoning position", uncertain: "Still uncertain", ruled: "Ruled out", nextStep: "Next step",
    continue: "Continue research", evidence: "View evidence", pin: "Pin", verify: "Verified", expire: "Expire", restore: "Restore",
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
  const taskId: ResearchTaskId = "waste";
  const [memo, setMemo] = useState(() => getResearchTask("waste").starterMemo["zh-CN"]);
  const [chat, setChat] = useState<ChatMessage[]>(() => [{ role: "assistant", text: getResearchTask("waste").assistantIntro["zh-CN"] }]);
  const t = copy[locale];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    const c = params.get("condition") as Condition | null;
    const lang = params.get("lang") as Locale | null;
    const frame = requestAnimationFrame(() => {
      if (lang === "en" || lang === "zh-CN") setLocale(lang);
      if (c && ["summary", "notes", "rmw"].includes(c)) setCondition(c);
      if (view === "checkpoint") setScreen("checkpoint");
      if (view === "interruption") setScreen("interruption");
      if (view === "day2") setScreen("workspace");
      if (view === "recall") setScreen("recall");
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
        {screen === "landing" && <Landing locale={locale} setLocale={setLocale} onStart={() => {
          const task = getResearchTask("waste");
          setMemo(task.starterMemo[locale]);
          setChat([{ role: "assistant", text: task.assistantIntro[locale] }]);
          eventLog("research_task_started", { taskId: "waste", assignment: "single_task" }, { stage: "task_setup" });
          setScreen("brief");
        }} t={t} />}
        {screen === "brief" && <TaskBrief locale={locale} taskId={taskId} setScreen={setScreen} />}
        {screen === "survey" && <Survey locale={locale} taskId={taskId} setScreen={setScreen} t={t} />}
        {screen === "work" && <Workspace key={`work-${taskId}-${locale}`} locale={locale} condition={condition} taskId={taskId} phase="work" memo={memo} setMemo={setMemo} chat={chat} setChat={setChat} setScreen={setScreen} t={t} />}
        {screen === "checkpoint" && <RmwCheckpoint locale={locale} taskId={taskId} memo={memo} messages={chat} onContinue={() => setScreen("interruption")} />}
        {screen === "interruption" && <InterruptionTask locale={locale} onComplete={() => setScreen("recall")} />}
        {screen === "recall" && <Recall locale={locale} setScreen={setScreen} t={t} />}
        {screen === "workspace" && <Workspace key={`recovery-${taskId}-${locale}`} locale={locale} condition={condition} taskId={taskId} phase="recovery" memo={memo} setMemo={setMemo} chat={chat} setChat={setChat} setScreen={setScreen} t={t} />}
        {screen === "complete" && <Complete setScreen={setScreen} t={t} />}
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
  onStart,
  t,
}: {
  locale: Locale;
  setLocale: (l: Locale) => void;
  onStart: () => void;
  t: typeof copy[Locale];
}) {
  const [consent, setConsent] = useState(true);
  const [anonymousId, setAnonymousId] = useState("");
  return <div className="min-h-screen bg-[#f8f7f3]">
    <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-8"><Brand /><LanguageChoice locale={locale} setLocale={setLocale} /></header>
    <section className="mx-auto grid max-w-6xl grid-cols-[1.08fr_.92fr] items-center gap-16 px-8 py-20">
      <div><h1 className="max-w-xl text-[54px] font-semibold leading-[1.08] tracking-[-.04em]">{t.study}</h1></div>
      <div className="rounded-2xl border bg-white/90 p-8 shadow-[0_24px_70px_rgba(34,42,70,.10)] backdrop-blur">
        <label className="text-sm font-semibold" htmlFor="anonymous-id">{t.anonymous}</label>
        <Input id="anonymous-id" autoComplete="off" value={anonymousId} onChange={event=>setAnonymousId(event.target.value)} placeholder={t.anonymousPlaceholder} className="mt-3 h-12" />
        <label className="mt-7 flex cursor-pointer items-start gap-3 text-sm leading-6"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 size-4 accent-[var(--primary)]"/><span>{t.consent}</span></label>
        <TimedButton seconds={5} ready={consent&&Boolean(anonymousId.trim())} locale={locale} label={t.enter} blockedLabel={locale==="zh-CN"?"请填写匿名编号并勾选同意":"Enter an anonymous ID and provide consent"} onClick={()=>{eventLog("consent_submitted",{locale,access:"anonymous",anonymousId:anonymousId.trim().slice(0,64)});onStart()}} className="mt-7 h-12 w-full" />
        <p className="mt-3 text-center text-[11px] text-muted-foreground">{locale==="zh-CN"?"按钮将在阅读时间结束且信息完整后开放。":"The button unlocks after the reading time and required fields are complete."}</p>
      </div>
    </section>
  </div>;
}

function TaskBrief({locale,taskId,setScreen}:{locale:Locale;taskId:ResearchTaskId;setScreen:(screen:Screen)=>void}) {
  const task=getResearchTask(taskId);
  return <CenteredShell step="Task setup · 1 / 2" title={locale==="zh-CN"?"研究任务说明":"Research task brief"}>
    <Badge variant="secondary" className="rounded-full text-primary">{task.label[locale]}</Badge>
    <p className="mt-5 text-lg font-semibold leading-8">{task.question[locale]}</p>
    <p className="mt-4 rounded-xl bg-secondary/55 p-4 text-sm leading-7 text-secondary-foreground">{taskOverview[locale]}</p>
    <div className="mt-6">
      <h2 className="text-sm font-semibold">{locale==="zh-CN"?"第一阶段包含 3 个目标，每个目标有多个评价点：":"Phase 1 contains three goals, each with multiple evaluation criteria:"}</h2>
      <div className="mt-3 space-y-3">{phaseOneGoals.map((goal,index)=><section key={goal.id} className="rounded-xl border bg-white p-4">
        <div className="flex items-center gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-primary">{index+1}</span><h3 className="text-sm font-semibold">{goal.title[locale]}</h3></div>
        <ul className="ml-10 mt-3 space-y-2 text-xs leading-5 text-muted-foreground">{goal.criteria.map(criterion=><li key={criterion[locale]} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/55"/><span>{criterion[locale]}</span></li>)}</ul>
      </section>)}</div>
    </div>
    <div className="mt-7 border-t pt-6">
      <h2 className="text-sm font-semibold">{locale==="zh-CN"?"最终 memo（600–900 字）需回答：":"The final memo (600–900 words) should answer:"}</h2>
      <ol className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">{memoQuestions.map((question,index)=><li key={question[locale]}><span className="mr-2 font-mono text-primary">{index+1}.</span>{question[locale]}</li>)}</ol>
    </div>
    <div className="mt-8 grid grid-cols-[auto_1fr] gap-3">
      <Button variant="outline" onClick={()=>setScreen("landing")}>{locale==="zh-CN"?"返回":"Back"}</Button>
      <TimedButton seconds={8} locale={locale} label={locale==="zh-CN"?"确认并继续":"Confirm and continue"} className="h-11" onClick={()=>{eventLog("task_brief_confirmed",{taskId},{stage:"task_setup"});setScreen("survey")}} />
    </div>
  </CenteredShell>;
}

function Survey({ locale, taskId, setScreen, t }: { locale:Locale;taskId:ResearchTaskId;setScreen:(s:Screen)=>void;t:typeof copy[Locale] }) {
  const groups = locale === "zh-CN" ? [
    {
      id: "ai_literacy",
      title: "测量目标 1 · AI 使用与评估能力",
      instruction: "请选择你对每项陈述的同意程度。",
      anchors: ["非常不同意", "不同意", "一般", "同意", "非常同意"],
      source: "改编自 Artificial Intelligence Literacy Scale 的“使用”和“评估”维度；本研究采用任务化短版，不使用原量表总分。",
      items: [
        "我能使用 AI 帮助整理材料并澄清研究问题。",
        "我能判断 AI 的回答是否得到所给材料的支持。",
        "我能识别 AI 回答中的错误、遗漏或缺乏证据的推断。",
      ],
    },
    {
      id: "research_self_efficacy",
      title: "测量目标 2 · 研究任务自我效能",
      instruction: "请选择你目前完成每项任务的信心水平。",
      anchors: ["完全没信心", "较没信心", "一般", "较有信心", "非常有信心"],
      source: "依据 Research Self-Efficacy Scale / Self-Efficacy in Research Measure 的问题概念化与研究设计维度进行任务化改编；不等同于原量表计分。",
      items: [
        "我有信心从相互冲突的材料中界定一个可研究的问题。",
        "我有信心比较至少两个不同的问题框架。",
        "我有信心提出可验证的假设，并指出仍不确定之处。",
        "我有信心在现实约束下设计可行的验证方案。",
      ],
    },
    {
      id: "topic_familiarity",
      title: "测量目标 3 · 议题先验熟悉度",
      instruction: "请选择最符合你当前情况的程度。",
      anchors: ["完全不符合", "较不符合", "一般", "较符合", "非常符合"],
      source: "研究者编制的协变量题项，用于控制垃圾分类议题的先验熟悉度；不是标准化心理量表。",
      items: [
        "我熟悉城市生活垃圾分类治理这一议题。",
        "我曾阅读或讨论过垃圾分类治理的相关案例。",
        "即使不看额外资料，我也能解释垃圾分类治理的基本流程。",
      ],
    },
  ] : [
    {
      id: "ai_literacy",
      title: "Goal 1 · AI use and evaluation",
      instruction: "Select how strongly you agree with each statement.",
      anchors: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
      source: "Task-specific adaptation of the Use and Evaluation dimensions of the Artificial Intelligence Literacy Scale; the original total score is not used.",
      items: [
        "I can use AI to organize evidence and clarify a research problem.",
        "I can judge whether an AI response is supported by the provided materials.",
        "I can identify errors, omissions, or unsupported inferences in an AI response.",
      ],
    },
    {
      id: "research_self_efficacy",
      title: "Goal 2 · Research-task self-efficacy",
      instruction: "Select your current confidence in completing each task.",
      anchors: ["No confidence", "Low confidence", "Moderate", "High confidence", "Complete confidence"],
      source: "Task-specific adaptation informed by the conceptualization and research-design dimensions of RSES/SERM; it is not scored as the original scales.",
      items: [
        "I can define a researchable problem from conflicting materials.",
        "I can compare at least two different problem framings.",
        "I can form testable hypotheses and state what remains uncertain.",
        "I can design a feasible test under real-world constraints.",
      ],
    },
    {
      id: "topic_familiarity",
      title: "Goal 3 · Prior topic familiarity",
      instruction: "Select the response that best describes you.",
      anchors: ["Not at all", "Slightly", "Moderately", "Very", "Extremely"],
      source: "Researcher-authored covariate items for prior familiarity with waste-sorting governance; this is not a standardized psychological scale.",
      items: [
        "I am familiar with urban household waste-sorting governance.",
        "I have read or discussed related waste-sorting cases.",
        "Without extra materials, I can explain the basic waste-sorting governance process.",
      ],
    },
  ];
  const flatItems=groups.flatMap(group=>group.items.map((item,index)=>({id:`${group.id}_${index+1}`,groupId:group.id,item})));
  const [responses,setResponses]=useState<Record<string,number>>({});
  const complete=flatItems.every(item=>responses[item.id]);
  return <CenteredShell step="Task setup · 2 / 2" title={t.pretitle}>
    <p className="mb-7 text-sm leading-6 text-muted-foreground">{locale==="zh-CN"?"本页包含 3 个测量目标；每个目标由多个评价点组成。所有题目均使用可点击的 5 点作答。":"This page contains three measurement goals, each represented by multiple items. All items use clickable five-point responses."}</p>
    <div className="space-y-8">
      {groups.map(group=><section key={group.id} className="rounded-xl border bg-[#fcfcfd] p-5">
        <h2 className="font-semibold">{group.title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{group.instruction}</p>
        <div className="mt-5 space-y-6">
          {group.items.map((item,itemIndex)=>{
            const id=`${group.id}_${itemIndex+1}`;
            return <fieldset key={id}>
              <legend className="text-sm font-medium leading-6">{itemIndex+1}. {item}</legend>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {group.anchors.map((anchor,index)=>{
                  const value=index+1;
                  const selected=responses[id]===value;
                  return <button type="button" key={anchor} aria-pressed={selected} aria-label={`${value} - ${anchor}`} onClick={()=>{setResponses(current=>({...current,[id]:value}));eventLog("pre_survey_item_answered",{taskId,itemId:id,value},{stage:"pre_survey",targetType:"survey_item",targetId:id})}} className={`min-h-16 rounded-lg border px-2 py-2 text-center transition ${selected?"border-primary bg-primary text-white shadow-sm":"bg-white hover:border-primary/50 hover:bg-secondary/40"}`}><span className="block text-base font-semibold">{value}</span><span className={`mt-1 block text-[10px] leading-4 ${selected?"text-white/85":"text-muted-foreground"}`}>{anchor}</span></button>
                })}
              </div>
            </fieldset>;
          })}
        </div>
        <p className="mt-5 border-t pt-3 text-[10px] leading-5 text-muted-foreground">{group.source}</p>
      </section>)}
    </div>
    <TimedButton seconds={8} ready={complete} locale={locale} label={t.next} blockedLabel={locale==="zh-CN"?"请完成全部评价点":"Answer every item"} onClick={()=>{eventLog("pre_survey_completed",{taskId,responses,constructs:groups.map(group=>group.id)},{stage:"pre_survey"});setScreen("work")}} className="mt-10 h-12 w-full" />
  </CenteredShell>;
}

function CenteredShell({step,title,children}:{step:string;title:string;children:React.ReactNode}) { return <div className="min-h-screen bg-[#f7f6f2]"><header className="mx-auto flex h-20 max-w-5xl items-center justify-between px-8"><Brand/><span className="font-mono text-xs text-muted-foreground">{step}</span></header><section className="mx-auto max-w-2xl px-8 py-16"><h1 className="mb-10 text-3xl font-semibold tracking-tight">{title}</h1><div className="rounded-2xl border bg-white p-8 shadow-[0_18px_60px_rgba(35,40,65,.07)]">{children}</div></section></div> }

function Brand(){return <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-primary text-white"><Brain size={23} weight="duotone"/></div><div><div className="font-semibold tracking-tight">RMW</div><div className="text-[10px] uppercase tracking-[.16em] text-muted-foreground">Reasoning Memory</div></div></div>}

function Recall({ locale,setScreen,t }: {locale:Locale;setScreen:(s:Screen)=>void;t:typeof copy[Locale]}) {
  const prompts=[t.currentGoal,t.position,t.uncertain,t.ruled,t.nextStep];
  const [responses,setResponses]=useState<string[]>(prompts.map(()=>""));
  const complete=responses.every(response=>response.trim());
  return <CenteredShell step="Day 2 · 01:30" title={t.recallTitle}><p className="mb-7 text-sm leading-6 text-muted-foreground">{t.recallSub}</p><div className="space-y-4">{prompts.map((p,i)=><label key={p} className="block"><span className="mb-2 block text-sm font-medium">{i+1}. {p}</span><Textarea rows={2} placeholder="…" value={responses[i]} onChange={event=>setResponses(current=>current.map((value,index)=>index===i?event.target.value:value))}/></label>)}</div><TimedButton seconds={5} ready={complete} locale={locale} label={t.submitRecall} blockedLabel={locale==="zh-CN"?"请完成全部回忆题":"Answer every recall prompt"} className="mt-8 h-12 w-full" onClick={()=>{eventLog("unsupported_recall_submitted",{answeredCount:responses.filter(Boolean).length,responseLengths:responses.map(value=>value.length)},{stage:"unsupported_recall"});eventLog("recovery_support_revealed",{}, {stage:"recovery"});setScreen("workspace")}} /></CenteredShell>
}

function WorkspaceTour({locale,onComplete}:{locale:Locale;onComplete:()=>void}) {
  const steps=locale==="zh-CN"?[
    {target:"materials",title:"先阅读实验材料",body:"这里有 5 段关于垃圾分类治理的材料。点击不同材料查看全文，系统会记录阅读进度。"},
    {target:"chat",title:"与 AI 比较问题框架",body:"在这里向 AI 提问。请要求它引用材料编号，并区分材料证据、推断和仍需验证的假设。"},
    {target:"memo",title:"同步记录你的思考",body:"在研究备忘录中写下候选框架、假设、不确定点、排除方向和下一步。AI 不会替你完成最终 memo。"},
    {target:"goals",title:"检查第一阶段目标",body:"这里用于逐项核对研究要求。完成思考后，保存当前推理位置并进入中断任务。"},
  ]:[
    {target:"materials",title:"Read the evidence first",body:"Five materials describe the waste-sorting case. Open each one to read the full text; reading progress is recorded."},
    {target:"chat",title:"Compare framings with AI",body:"Ask the AI to cite material numbers and separate evidence, inference, and unverified assumptions."},
    {target:"memo",title:"Record your reasoning",body:"Use the memo for candidate framings, hypotheses, uncertainties, rejected directions, and your next step."},
    {target:"goals",title:"Check Phase 1 goals",body:"Use this area to check the study requirements. Save your reasoning position when you are ready for the interruption task."},
  ];
  const [index,setIndex]=useState(0);
  const [rect,setRect]=useState<DOMRect|null>(null);
  const step=steps[index];

  useEffect(()=>{
    const update=()=>{
      const element=document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      setRect(element?.getBoundingClientRect()||null);
    };
    update();
    window.addEventListener("resize",update);
    eventLog("workspace_tour_step_viewed",{step:index+1,target:step.target},{stage:"tutorial",targetType:"workspace_region",targetId:step.target});
    return()=>window.removeEventListener("resize",update);
  },[index,step.target]);

  if(!rect)return null;
  const panelWidth=340;
  const preferredLeft=rect.right+24;
  const panelLeft=preferredLeft+panelWidth<=window.innerWidth-24?preferredLeft:Math.max(24,rect.left-panelWidth-24);
  const panelTop=Math.max(86,Math.min(window.innerHeight-270,rect.top+24));
  return <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={locale==="zh-CN"?"工作区新手指引":"Workspace onboarding"}>
    <div className="absolute rounded-2xl border-2 border-white/95 transition-all duration-300" style={{left:Math.max(8,rect.left-6),top:Math.max(8,rect.top-6),width:rect.width+12,height:rect.height+12,boxShadow:"0 0 0 9999px rgba(15, 19, 32, .76)"}} />
    <div className="absolute w-[340px] rounded-2xl border border-white/20 bg-white p-6 shadow-2xl" style={{left:panelLeft,top:panelTop}}>
      <div className="flex items-center justify-between"><Badge variant="secondary">{index+1} / {steps.length}</Badge><span className="text-[10px] uppercase tracking-[.16em] text-muted-foreground">Workspace guide</span></div>
      <h2 className="mt-5 text-xl font-semibold">{step.title}</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.body}</p>
      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" disabled={index===0} onClick={()=>setIndex(current=>current-1)}>{locale==="zh-CN"?"上一步":"Back"}</Button>
        <Button className="h-10 px-5" onClick={()=>{if(index<steps.length-1){setIndex(current=>current+1)}else{eventLog("workspace_tour_completed",{}, {stage:"tutorial"});onComplete()}}}>{index===steps.length-1?(locale==="zh-CN"?"开始研究":"Start research"):(locale==="zh-CN"?"下一步":"Next")}<ArrowRight/></Button>
      </div>
    </div>
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
  t: typeof copy[Locale];
}) {
  const task=getResearchTask(taskId);
  const [cards,setCards]=useState(()=>createInitialCards(taskId));
  const [selected,setSelected]=useState("uncertain");
  const [message,setMessage]=useState("");
  const [isLoading,setIsLoading]=useState(false);
  const [showTour,setShowTour]=useState(phase==="work");
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
    <header className="flex h-[68px] items-center justify-between border-b bg-white/90 px-5"><div className="flex items-center gap-4"><Brand/><Badge variant="secondary" className="rounded-full">{phase==="work"?(locale==="zh-CN"?"第一阶段 · 形成问题框架":"Phase 1 · Frame the problem"):t.day}</Badge><Badge variant="outline" className="rounded-full">{task.label[locale]}</Badge></div><div className="flex items-center gap-5 text-sm"><span className="flex items-center gap-2 font-mono text-primary"><Timer size={18}/>18:42</span><span className="flex items-center gap-2 text-[var(--active)]"><CheckCircle size={18}/>{t.saved}</span><span className="flex items-center gap-2 text-muted-foreground"><Globe size={18}/>{locale==="zh-CN"?"中文":"English"}</span><button onClick={()=>setShowTour(true)} aria-label={t.help} title={t.readFirst} className="grid size-10 place-items-center rounded-lg hover:bg-muted"><Question size={20}/></button></div></header>
    <div className="workspace-grid grid h-[calc(100vh-68px)] min-h-0 overflow-hidden">
      <MaterialsPanel locale={locale} taskId={taskId} t={t}/>
      <ChatPanel locale={locale} chat={chat} message={message} setMessage={setMessage} send={send} isLoading={isLoading} t={t}/>
      <section className="grid min-h-0 min-w-0 grid-rows-[minmax(0,38%)_minmax(0,62%)] overflow-hidden bg-white">
        <MemoPanel locale={locale} memo={memo} setMemo={setMemo} t={t}/>
        {phase==="work"
          ?<PhaseOnePanel locale={locale} taskId={taskId} memo={memo} setScreen={setScreen}/>
          :<RecoveryPanel locale={locale} condition={condition} cards={cards} selected={selected} setSelected={setSelected} updateStatus={updateStatus} togglePin={togglePin} updateContent={updateContent} setScreen={setScreen} t={t}/>}
      </section>
    </div>
    {showTour&&<WorkspaceTour locale={locale} onComplete={()=>setShowTour(false)}/>}
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
    <div className="shrink-0 p-4 pt-0"><div className="rounded-xl border bg-white p-3 shadow-[0_8px_30px_rgba(35,43,70,.06)]"><Textarea value={message} disabled={isLoading} onChange={event=>setMessage(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();send()}}} rows={2} className="resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0" placeholder={t.ask}/><div className="mt-2 flex items-center justify-between"><span className="text-[10px] text-muted-foreground">{locale==="zh-CN"?"请让 AI 引用材料编号并区分证据与推断":"Ask AI to cite material numbers and separate evidence from inference"}</span><Button size="icon" onClick={send} disabled={isLoading||!message.trim()} aria-label="Send"><PaperPlaneTilt size={18} weight="fill"/></Button></div></div><p className="mt-2 text-center text-[10px] text-muted-foreground">{t.disclaimer}</p></div>
  </section>;
}

function MemoPanel({locale,memo,setMemo,t}:{locale:Locale;memo:string;setMemo:(s:string)=>void;t:typeof copy[Locale]}) {
  const count=locale==="zh-CN"?memo.replace(/\s/g,"").length:(memo.trim()?memo.trim().split(/\s+/).length:0);
  return <div data-tour="memo" className="min-h-0 border-b bg-white">
    <div className="flex h-14 items-center justify-between border-b px-5"><h2 className="flex items-center gap-2 font-semibold"><NotePencil size={20}/>{t.memo}</h2><span className="flex items-center gap-2 text-xs text-muted-foreground"><Check size={15}/>{t.saved} · {locale==="zh-CN"?"目标 600–900 字":"Target 600–900 words"}</span></div>
    <div className="h-[calc(100%-56px)] px-6 py-4"><Textarea value={memo} onChange={event=>{const next=event.target.value;const nextCount=locale==="zh-CN"?next.replace(/\s/g,"").length:(next.trim()?next.trim().split(/\s+/).length:0);setMemo(next);eventLog("memo_edited",{count:nextCount},{stage:"research_work",targetType:"memo"})}} className="h-full resize-none border-0 p-0 pb-7 text-[15px] leading-7 shadow-none focus-visible:ring-0" placeholder={t.memoPlaceholder}/><div className="-mt-6 text-right font-mono text-[10px] text-muted-foreground">{count} {t.words} · 600–900</div></div>
  </div>;
}

function PhaseOnePanel({locale,taskId,memo,setScreen}:{locale:Locale;taskId:ResearchTaskId;memo:string;setScreen:(screen:Screen)=>void}) {
  const task=getResearchTask(taskId);
  const [completed,setCompleted]=useState<Set<string>>(()=>new Set());
  const criterionId=(goalId:string,index:number)=>`${goalId}:${index}`;
  const toggleCriterion=(goalId:string,index:number)=>setCompleted(current=>{
    const id=criterionId(goalId,index);
    const next=new Set(current);
    if(next.has(id))next.delete(id);else next.add(id);
    eventLog("phase_criterion_toggled",{taskId,goalId,criterionIndex:index,completed:!current.has(id)},{stage:"research_work"});
    return next;
  });
  const completedGoalCount=phaseOneGoals.filter(goal=>goal.criteria.every((_,index)=>completed.has(criterionId(goal.id,index)))).length;
  const totalCriteria=phaseOneGoals.reduce((total,goal)=>total+goal.criteria.length,0);
  const memoCount=locale==="zh-CN"?memo.replace(/\s/g,"").length:(memo.trim()?memo.trim().split(/\s+/).length:0);
  return <section data-tour="goals" className="flex min-h-0 flex-col bg-[#fbfcfe]">
    <div className="flex h-14 shrink-0 items-center justify-between border-b px-5"><h2 className="flex items-center gap-2 font-semibold"><Target size={20} className="text-primary"/>{locale==="zh-CN"?"第一阶段目标":"Phase 1 goals"}</h2><Badge variant="outline" className="bg-white text-[10px]">{completedGoalCount} / {phaseOneGoals.length} {locale==="zh-CN"?"个目标":"goals"}</Badge></div>
    <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4">
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700">{task.label[locale]} · Research question</p><p className="mt-2 text-sm font-semibold leading-6 text-indigo-950">{task.question[locale]}</p></div>
      <div className="mt-4 space-y-3">{phaseOneGoals.map((goal,index)=><section key={goal.id} className={`rounded-xl border p-3 transition ${goal.criteria.every((_,criterionIndex)=>completed.has(criterionId(goal.id,criterionIndex)))?"border-emerald-200 bg-emerald-50/45":"bg-white"}`}>
        <div className="flex items-center gap-2"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-[10px] font-semibold text-primary">{index+1}</span><h3 className="text-xs font-semibold">{goal.title[locale]}</h3></div>
        <div className="ml-8 mt-2 space-y-1.5">{goal.criteria.map((criterion,criterionIndex)=>{
          const id=criterionId(goal.id,criterionIndex);
          return <label key={id} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-[11px] leading-4 hover:bg-muted/50"><input type="checkbox" checked={completed.has(id)} onChange={()=>toggleCriterion(goal.id,criterionIndex)} className="mt-0.5 size-3.5 accent-[var(--active)]"/><span>{criterion[locale]}</span></label>;
        })}</div>
      </section>)}</div>
      <details className="mt-4 rounded-xl border bg-white p-4"><summary className="cursor-pointer text-xs font-semibold">{locale==="zh-CN"?"查看最终 memo 的 6 个问题":"View the six final-memo questions"}</summary><ol className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">{memoQuestions.map((question,index)=><li key={question[locale]}>{index+1}. {question[locale]}</li>)}</ol></details>
    </div>
    <div className="shrink-0 border-t bg-white px-5 py-3"><div className="mb-2 flex justify-between text-[10px] text-muted-foreground"><span>{locale==="zh-CN"?"当前 memo":"Current memo"}</span><span>{memoCount} {locale==="zh-CN"?"字":"words"} · {completed.size}/{totalCriteria} {locale==="zh-CN"?"评价点":"criteria"}</span></div><TimedButton seconds={10} locale={locale} label={locale==="zh-CN"?"保存推理位置并进入中断任务":"Save reasoning position and begin interruption"} className="h-11 w-full text-sm" onClick={()=>{eventLog("phase_one_checkpoint_requested",{taskId,completedGoals:completedGoalCount,completedCriteria:completed.size,totalCriteria,memoCount},{stage:"research_work"});setScreen("checkpoint")}} /></div>
  </section>;
}

function RecoveryPanel({locale,condition,cards,selected,setSelected,updateStatus,togglePin,updateContent,setScreen,t}:{locale:Locale;condition:Condition;cards:ReasoningCard[];selected:string;setSelected:(s:string)=>void;updateStatus:(id:string,s:EpistemicStatus)=>void;togglePin:(id:string)=>void;updateContent:(id:string,value:string)=>void;setScreen:(s:Screen)=>void;t:typeof copy[Locale]}) {
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
  if(condition==="summary") return <RecoveryShell t={t}><div className="mx-6 mt-4 rounded-xl bg-muted/60 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Auto Summary</p><p className="mt-3 text-sm leading-7">{summary}</p></div><PrimaryContinue locale={locale} setScreen={setScreen} t={t}/></RecoveryShell>;
  if(condition==="notes") return <RecoveryShell t={t}><div className="mx-6 mt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your notes</p><Textarea className="min-h-40 leading-7" defaultValue={notes}/></div><PrimaryContinue locale={locale} setScreen={setScreen} t={t}/></RecoveryShell>;
  return <RecoveryShell t={t}><Tabs defaultValue="brief" className="flex min-h-0 flex-1 flex-col"><div className="flex items-center justify-between border-b px-5"><TabsList className="h-11 bg-transparent p-0"><TabsTrigger className="h-11 rounded-none border-b-2 border-transparent px-3 data-active:border-primary data-active:bg-transparent" value="brief">{t.resume}</TabsTrigger><TabsTrigger className="h-11 rounded-none border-b-2 border-transparent px-3 data-active:border-primary data-active:bg-transparent" value="cards">{t.cards}</TabsTrigger><TabsTrigger className="h-11 rounded-none border-b-2 border-transparent px-3 data-active:border-primary data-active:bg-transparent" value="network">{t.network}</TabsTrigger></TabsList><span className="text-[10px] text-muted-foreground">{cards.length} {t.allCards}</span></div>
    <TabsContent value="brief" className="m-0 min-h-0 flex-1 overflow-auto"><ResumeBrief locale={locale} cards={cards} t={t}/></TabsContent>
    <TabsContent value="cards" className="m-0 grid min-h-0 flex-1 grid-cols-[1.18fr_.82fr]"><div className="hide-scrollbar min-h-0 overflow-y-auto border-r px-4 py-3"><div className="mb-3 rounded-lg bg-secondary/70 p-3 text-xs leading-5 text-secondary-foreground"><strong>{t.ready}：</strong>{t.readFirst}</div><GoalHierarchy cards={cards} locale={locale} selected={selected} setSelected={setSelected}/><p className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Problem state cards</p>{cards.filter(card=>card.cardType!=="goal").map(card=><ReasoningCardView key={card.id} card={card} locale={locale} selected={selected===card.id} onSelect={()=>{setSelected(card.id);eventLog("card_selected",{id:card.id},{stage:"recovery",targetType:"reasoning_card",targetId:card.id})}} updateStatus={updateStatus} t={t}/>)}</div><CardInspector key={`${selected}-${locale}`} card={cards.find(card=>card.id===selected) || cards[0]} locale={locale} updateStatus={updateStatus} togglePin={togglePin} updateContent={updateContent} t={t}/></TabsContent>
    <TabsContent value="network" className="m-0 min-h-0 flex-1"><KnowledgeNetwork locale={locale} cards={cards} selected={selected} setSelected={setSelected}/></TabsContent>
  </Tabs><PrimaryContinue locale={locale} setScreen={setScreen} t={t}/></RecoveryShell>;
}

function RecoveryShell({children,t}:{children:React.ReactNode;t:typeof copy[Locale]}) { return <div className="flex min-h-0 flex-col bg-[#fbfcfe]"><div className="flex h-14 shrink-0 items-center justify-between border-b px-5"><div><h2 className="flex items-center gap-2 font-semibold"><Brain size={20} className="text-primary"/>{t.recovery}</h2></div><Badge variant="outline" className="bg-white text-[10px]"><Clock size={13}/>24h</Badge></div>{children}</div> }

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

function PrimaryContinue({locale,setScreen,t}:{locale:Locale;setScreen:(s:Screen)=>void;t:typeof copy[Locale]}) { return <div className="shrink-0 border-t bg-white px-5 py-3"><TimedButton seconds={5} locale={locale} label={t.continue} className="h-11 w-full text-sm" onClick={()=>{eventLog("continue_research_clicked");setScreen("complete")}} /></div> }

function Complete({setScreen,t}:{setScreen:(s:Screen)=>void;t:typeof copy[Locale]}) { return <div className="grid min-h-screen place-items-center bg-[#f7f6f2] p-8"><div className="max-w-lg text-center"><div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[var(--active-soft)] text-[var(--active)]"><CheckCircle size={36} weight="fill"/></div><h1 className="mt-6 text-3xl font-semibold">{t.completed}</h1><p className="mt-3 text-muted-foreground">{t.completeText}</p><Button variant="outline" className="mt-8" onClick={()=>setScreen("landing")}>{t.back}</Button></div></div> }
