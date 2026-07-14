"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, BookOpenText, Brain, ChatCircleDots, Check, CheckCircle, Clock,
  Globe, Question, Info, LinkSimple, MagnifyingGlass,
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
import { materials, initialCards, relations } from "@/lib/demo-data";
import type { Condition, EpistemicStatus, Locale, ReasoningCard } from "@/lib/rmw-types";

type Screen = "landing" | "survey" | "tutorial" | "workspace" | "recall" | "complete";

const copy = {
  "zh-CN": {
    study: "推理连续性研究", intro: "帮助你在中断后快速找回思路，并继续完成研究任务。",
    privacy: "研究会记录聊天、编辑与界面操作。请勿输入真实敏感信息。所有导出数据使用匿名编号。",
    code: "参与者代码", codeHint: "演示代码：RMW-DEMO", consent: "我已阅读并同意参与研究",
    enter: "开始研究", preview: "直接预览 Day 2 RMW", admin: "研究者后台", language: "界面语言",
    pretitle: "开始前，先了解你的经验", next: "继续", back: "返回", tutorial: "界面快速导览",
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
    study: "Reasoning Continuity Study", intro: "Recover your line of thought after an interruption and continue a research task with confidence.",
    privacy: "The study records chat, edits, and interface actions. Do not enter sensitive information. Exports use anonymous IDs.",
    code: "Participant code", codeHint: "Demo code: RMW-DEMO", consent: "I have read the information and agree to participate",
    enter: "Start study", preview: "Preview Day 2 RMW", admin: "Research console", language: "Interface language",
    pretitle: "A few questions about your experience", next: "Continue", back: "Back", tutorial: "Quick workspace tour",
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

function eventLog(type: string, payload: Record<string, unknown> = {}) {
  const item = { id: crypto.randomUUID(), type, payload, at: new Date().toISOString() };
  const current = JSON.parse(localStorage.getItem("rmw-demo-events") || "[]");
  localStorage.setItem("rmw-demo-events", JSON.stringify([...current, item].slice(-500)));
}

export function RmwApp() {
  const [locale, setLocale] = useState<Locale>("zh-CN");
  const [screen, setScreen] = useState<Screen>("landing");
  const [condition, setCondition] = useState<Condition>("rmw");
  const t = copy[locale];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    const c = params.get("condition") as Condition | null;
    const lang = params.get("lang") as Locale | null;
    queueMicrotask(() => {
      if (lang === "en" || lang === "zh-CN") setLocale(lang);
      if (c && ["summary", "notes", "rmw"].includes(c)) setCondition(c);
      if (view === "day2") setScreen("workspace");
      if (view === "recall") setScreen("recall");
    });
  }, []);

  return (
    <>
      <div className="desktop-required fixed inset-0 z-50 hidden items-center justify-center bg-[#f7f6f2] p-8 text-center">
        <div className="max-w-md"><SquaresFour size={42} className="mx-auto mb-5 text-primary" /><h1 className="text-2xl font-semibold">{t.desktop}</h1><p className="mt-3 text-muted-foreground">{t.desktopText}</p></div>
      </div>
      <main className="desktop-app min-h-screen">
        {screen === "landing" && <Landing locale={locale} setLocale={setLocale} setScreen={setScreen} t={t} />}
        {screen === "survey" && <Survey setScreen={setScreen} t={t} />}
        {screen === "tutorial" && <Tutorial setScreen={setScreen} t={t} />}
        {screen === "recall" && <Recall setScreen={setScreen} t={t} />}
        {screen === "workspace" && <Workspace locale={locale} condition={condition} setScreen={setScreen} t={t} />}
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

function Landing({ locale, setLocale, setScreen, t }: { locale: Locale; setLocale: (l: Locale) => void; setScreen: (s: Screen) => void; t: typeof copy[Locale] }) {
  const [consent, setConsent] = useState(true); const [code, setCode] = useState("RMW-DEMO");
  return <div className="min-h-screen bg-[#f8f7f3]">
    <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-8"><Brand /><LanguageChoice locale={locale} setLocale={setLocale} /></header>
    <section className="mx-auto grid max-w-6xl grid-cols-[1.08fr_.92fr] items-center gap-16 px-8 py-20">
      <div><Badge variant="secondary" className="mb-6 rounded-full px-3 py-1 text-primary"><Brain size={15} /> CHI 2027 Research Prototype</Badge><h1 className="max-w-xl text-[54px] font-semibold leading-[1.08] tracking-[-.04em]">{t.study}</h1><p className="mt-6 max-w-xl text-xl leading-8 text-muted-foreground">{t.intro}</p>
        <div className="mt-10 grid max-w-xl grid-cols-3 gap-5">{[[Target,"恢复目标","Recover goals"],[LinkSimple,"检查证据","Check evidence"],[ArrowRight,"继续下一步","Resume action"]].map(([I,zh,en]) => { const Icon=I as typeof Target; return <div key={String(zh)} className="border-t pt-4"><Icon size={23} className="mb-3 text-primary"/><p className="text-sm font-medium">{locale === "zh-CN" ? String(zh) : String(en)}</p></div>})}</div>
      </div>
      <div className="rounded-2xl border bg-white/90 p-8 shadow-[0_24px_70px_rgba(34,42,70,.10)] backdrop-blur"><div className="mb-6 flex items-center gap-3"><ShieldCheck size={25} className="text-[var(--active)]"/><div><h2 className="font-semibold">{t.enter}</h2><p className="text-sm text-muted-foreground">Session access is anonymous</p></div></div>
        <label className="text-sm font-medium">{t.code}</label><Input value={code} onChange={e=>setCode(e.target.value)} className="mt-2 h-12" /><p className="mt-2 text-xs text-muted-foreground">{t.codeHint}</p>
        <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm leading-6"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 size-4 accent-[var(--primary)]"/><span>{t.consent}</span></label><p className="mt-4 rounded-lg bg-muted/70 p-4 text-xs leading-5 text-muted-foreground">{t.privacy}</p>
        <Button disabled={!consent || !code} onClick={()=>{eventLog("consent_submitted",{locale});setScreen("survey")}} className="mt-6 h-12 w-full">{t.enter}<ArrowRight /></Button>
        <div className="mt-4 grid grid-cols-2 gap-3"><Button variant="outline" onClick={()=>{eventLog("demo_day2_opened");setScreen("workspace")}}>{t.preview}</Button><Link className="inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium hover:bg-muted" href="/admin">{t.admin}</Link></div>
      </div>
    </section>
  </div>;
}

function Survey({ setScreen, t }: { setScreen:(s:Screen)=>void;t:typeof copy[Locale] }) {
  const items=["LLM / AI tools","Research writing","Literature synthesis","Topic familiarity","Confidence in this task"];
  return <CenteredShell step="1 / 3" title={t.pretitle}><div className="space-y-7">{items.map((x,i)=><div key={x}><div className="mb-3 flex justify-between text-sm"><span>{x}</span><span className="text-muted-foreground">{i%2?"3 / 5":"4 / 5"}</span></div><input className="w-full accent-[var(--primary)]" type="range" min="1" max="5" defaultValue={i%2?3:4}/></div>)}</div><Button onClick={()=>{eventLog("pre_survey_completed");setScreen("tutorial")}} className="mt-10 h-12 w-full">{t.next}<ArrowRight/></Button></CenteredShell>;
}

function Tutorial({ setScreen,t }: { setScreen:(s:Screen)=>void;t:typeof copy[Locale] }) {
  const rows=[[BookOpenText,t.materials,"Read the evidence pack and open sources."],[ChatCircleDots,t.chat,"Compare framings and ask focused questions."],[NotePencil,t.memo,"Build your research memo as you work."],[Brain,t.recovery,"Review a short, calibrated reasoning state after interruption."]];
  return <CenteredShell step="2 / 3" title={t.tutorial}><div className="space-y-2">{rows.map(([I,name,desc])=>{const Icon=I as typeof Brain;return <div key={String(name)} className="flex gap-4 rounded-xl p-4 hover:bg-muted/60"><div className="grid size-11 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><Icon size={22}/></div><div><h3 className="font-medium">{String(name)}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{String(desc)}</p></div></div>})}</div><Button onClick={()=>{eventLog("tutorial_completed");setScreen("workspace")}} className="mt-8 h-12 w-full">{t.next}<ArrowRight/></Button></CenteredShell>;
}

function CenteredShell({step,title,children}:{step:string;title:string;children:React.ReactNode}) { return <div className="min-h-screen bg-[#f7f6f2]"><header className="mx-auto flex h-20 max-w-5xl items-center justify-between px-8"><Brand/><span className="font-mono text-xs text-muted-foreground">{step}</span></header><section className="mx-auto max-w-2xl px-8 py-16"><h1 className="mb-10 text-3xl font-semibold tracking-tight">{title}</h1><div className="rounded-2xl border bg-white p-8 shadow-[0_18px_60px_rgba(35,40,65,.07)]">{children}</div></section></div> }

function Brand(){return <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-primary text-white"><Brain size={23} weight="duotone"/></div><div><div className="font-semibold tracking-tight">RMW</div><div className="text-[10px] uppercase tracking-[.16em] text-muted-foreground">Reasoning Memory</div></div></div>}

function Recall({ setScreen,t }: {setScreen:(s:Screen)=>void;t:typeof copy[Locale]}) { const prompts=[t.currentGoal,t.position,t.uncertain,t.ruled,t.nextStep]; return <CenteredShell step="Day 2 · 01:30" title={t.recallTitle}><p className="mb-7 text-sm leading-6 text-muted-foreground">{t.recallSub}</p><div className="space-y-4">{prompts.map((p,i)=><label key={p} className="block"><span className="mb-2 block text-sm font-medium">{i+1}. {p}</span><Textarea rows={2} placeholder="…"/></label>)}</div><Button className="mt-8 h-12 w-full" onClick={()=>{eventLog("unsupported_recall_submitted");setScreen("workspace")}}>{t.submitRecall}<ArrowRight/></Button></CenteredShell> }

function Workspace({locale,condition,setScreen,t}:{locale:Locale;condition:Condition;setScreen:(s:Screen)=>void;t:typeof copy[Locale]}) {
  const [cards,setCards]=useState(initialCards); const [selected,setSelected]=useState("uncertain"); const [memo,setMemo]=useState(locale==="zh-CN"?"研究问题：AI Tutor 的价值是否更应该被理解为促进学习者解释自己的错误，而不只是更快提供反馈？\n\n初步框架：反馈类型 → 自我调节与认知负荷 → 学习成效。":"Research question: Should the value of an AI tutor be framed as helping learners explain their errors, rather than simply providing faster feedback?\n\nInitial framing: feedback type → self-regulation and cognitive load → learning outcomes.");
  const [message,setMessage]=useState(""); const [chat,setChat]=useState([{role:"assistant",text:locale==="zh-CN"?"欢迎回来。先看右侧的恢复摘要，它只保留继续任务所需的信息。":"Welcome back. Start with the recovery brief on the right—it only keeps what you need to resume."},{role:"user",text:locale==="zh-CN"?"我想先确认解释型反馈在高认知负荷下是否仍然有效。":"I want to check whether explanatory feedback still works under high cognitive load."},{role:"assistant",text:locale==="zh-CN"?"材料 2 提示它可能增加额外负担。建议把这个判断保留为 Uncertain，并先核查证据。":"Material 2 suggests it may add burden. Keep this claim Uncertain and verify the evidence first."}]);
  const updateStatus=(id:string,status:EpistemicStatus)=>{setCards(cs=>cs.map(c=>c.id===id?{...c,status,revision:c.revision+1}:c));eventLog("card_status_changed",{id,status})};
  const send=()=>{if(!message.trim())return;setChat(v=>[...v,{role:"user",text:message},{role:"assistant",text:locale==="zh-CN"?"这是一个重要检查点。我会把回答与材料 2、4 对照，并保留不确定性。":"That is an important checkpoint. I’ll compare it with Materials 2 and 4 and preserve the uncertainty."}]);eventLog("chat_message_sent");setMessage("")};
  return <div className="h-screen min-h-[720px] overflow-hidden bg-[#f8f7f3]">
    <header className="flex h-[68px] items-center justify-between border-b bg-white/90 px-5"><div className="flex items-center gap-6"><Brand/><Badge variant="secondary" className="rounded-full">{t.day}</Badge></div><div className="flex items-center gap-5 text-sm"><span className="flex items-center gap-2 font-mono text-primary"><Timer size={18}/>18:42</span><span className="flex items-center gap-2 text-[var(--active)]"><CheckCircle size={18}/>{t.saved}</span><span className="flex items-center gap-2 text-muted-foreground"><Globe size={18}/>{locale==="zh-CN"?"中文":"English"}</span><button aria-label={t.help} title={t.readFirst} className="grid size-10 place-items-center rounded-lg hover:bg-muted"><Question size={20}/></button></div></header>
    <div className="workspace-grid grid h-[calc(100vh-68px)] min-h-0 overflow-hidden">
      <MaterialsPanel locale={locale} t={t}/><ChatPanel chat={chat} message={message} setMessage={setMessage} send={send} t={t}/>
      <section className="grid min-h-0 min-w-0 grid-rows-[minmax(0,42%)_minmax(0,58%)] overflow-hidden bg-white"><MemoPanel memo={memo} setMemo={setMemo} t={t}/><RecoveryPanel locale={locale} condition={condition} cards={cards} selected={selected} setSelected={setSelected} updateStatus={updateStatus} setScreen={setScreen} t={t}/></section>
    </div>
  </div>
}

function MaterialsPanel({locale,t}:{locale:Locale;t:typeof copy[Locale]}) { const [active,setActive]=useState("m2"); return <aside className="min-h-0 min-w-0 overflow-hidden border-r bg-[#fbfaf7]"><div className="flex h-14 items-center justify-between border-b px-5"><h2 className="flex items-center gap-2 font-semibold"><BookOpenText size={20}/>{t.materials}</h2><button className="grid size-9 place-items-center rounded-lg hover:bg-muted" aria-label="Search"><MagnifyingGlass size={18}/></button></div><div className="px-5 py-4"><div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>{t.progress}</span><span>4 / 12</span></div><Progress value={33} className="h-1.5"/></div><div className="hide-scrollbar h-[calc(100%-154px)] overflow-y-auto px-3 pb-4">{materials.map(m=><button key={m.id} onClick={()=>{setActive(m.id);eventLog("material_opened",{id:m.id})}} className={`mb-1 w-full rounded-lg px-3 py-4 text-left transition ${active===m.id?"bg-white shadow-[0_5px_18px_rgba(35,43,70,.07)] ring-1 ring-primary/15":"hover:bg-white/80"}`}><div className="mb-2 flex items-center justify-between"><span className="grid size-6 place-items-center rounded-md bg-secondary text-xs font-semibold text-primary">{m.n}</span><span className="font-mono text-[10px] text-muted-foreground">p. {m.n*3}</span></div><h3 className="text-sm font-semibold leading-5">{m.title[locale]}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{m.excerpt[locale]}</p><p className="mt-3 text-[10px] text-primary">{m.meta}</p></button>)}</div></aside> }

function ChatPanel({chat,message,setMessage,send,t}:{chat:{role:string;text:string}[];message:string;setMessage:(s:string)=>void;send:()=>void;t:typeof copy[Locale]}) { return <section className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r bg-white"><div className="flex h-14 shrink-0 items-center justify-between border-b px-5"><h2 className="flex items-center gap-2 font-semibold"><Sparkle size={19} className="text-primary" weight="fill"/>{t.chat}</h2><button className="grid size-9 place-items-center rounded-lg hover:bg-muted"><Info size={18}/></button></div><div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5"><div className="mb-5 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground"><div className="h-px flex-1 bg-border"/>Today<div className="h-px flex-1 bg-border"/></div>{chat.map((m,i)=><div key={i} className={`mb-4 flex ${m.role==="user"?"justify-end":"justify-start"}`}><div className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-6 ${m.role==="user"?"bg-secondary text-secondary-foreground":"bg-[#f5f6f8]"}`}>{m.text}{m.role!=="user"&&i===2&&<div className="mt-3 flex gap-2"><Badge variant="outline" className="bg-white text-[10px]">2</Badge><Badge variant="outline" className="bg-white text-[10px]">4</Badge></div>}</div></div>)}</div><div className="shrink-0 p-4 pt-0"><div className="rounded-xl border bg-white p-3 shadow-[0_8px_30px_rgba(35,43,70,.06)]"><Textarea value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}} rows={2} className="resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0" placeholder={t.ask}/><div className="mt-2 flex justify-end"><Button size="icon" onClick={send} aria-label="Send"><PaperPlaneTilt size={18} weight="fill"/></Button></div></div><p className="mt-2 text-center text-[10px] text-muted-foreground">{t.disclaimer}</p></div></section> }

function MemoPanel({memo,setMemo,t}:{memo:string;setMemo:(s:string)=>void;t:typeof copy[Locale]}) { return <div className="min-h-0 border-b bg-white"><div className="flex h-14 items-center justify-between border-b px-5"><h2 className="flex items-center gap-2 font-semibold"><NotePencil size={20}/>{t.memo}</h2><span className="flex items-center gap-2 text-xs text-muted-foreground"><Check size={15}/>{t.saved} · 18:41</span></div><div className="h-[calc(100%-56px)] px-6 py-4"><Textarea value={memo} onChange={e=>{setMemo(e.target.value);eventLog("memo_edited")}} className="h-full resize-none border-0 p-0 text-[15px] leading-7 shadow-none focus-visible:ring-0" placeholder={t.memoPlaceholder}/><div className="-mt-6 text-right font-mono text-[10px] text-muted-foreground">{memo.length} {t.words}</div></div></div> }

function RecoveryPanel({locale,condition,cards,selected,setSelected,updateStatus,setScreen,t}:{locale:Locale;condition:Condition;cards:ReasoningCard[];selected:string;setSelected:(s:string)=>void;updateStatus:(id:string,s:EpistemicStatus)=>void;setScreen:(s:Screen)=>void;t:typeof copy[Locale]}) {
  if(condition==="summary") return <RecoveryShell t={t}><div className="mx-6 mt-4 rounded-xl bg-muted/60 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Auto Summary</p><p className="mt-3 text-sm leading-7">{locale==="zh-CN"?"昨天你比较了 AI Tutor 的三种反馈方式，倾向于把元认知提示视为促进自我调节的核心机制。解释型反馈在高认知负荷下的效果仍需检查。下一步阅读材料 2，并完成研究问题。":"Yesterday you compared three AI tutor feedback approaches and leaned toward metacognitive prompting as the mechanism for self-regulation. The effect of explanatory feedback under high load still needs checking. Next, review Material 2 and complete the research question."}</p></div><PrimaryContinue setScreen={setScreen} t={t}/></RecoveryShell>;
  if(condition==="notes") return <RecoveryShell t={t}><div className="mx-6 mt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your notes</p><Textarea className="min-h-40 leading-7" defaultValue={locale==="zh-CN"?"倾向：元认知提示 → 自我调节 → 学习成效。\n存疑：高认知负荷下解释型反馈是否仍有效。\n下一步：检查材料 2。":"Leading idea: metacognitive prompts → self-regulation → learning.\nUncertain: explanatory feedback under high cognitive load.\nNext: check Material 2."}/></div><PrimaryContinue setScreen={setScreen} t={t}/></RecoveryShell>;
  return <RecoveryShell t={t}><Tabs defaultValue="cards" className="flex min-h-0 flex-1 flex-col"><div className="flex items-center justify-between border-b px-5"><TabsList className="h-11 bg-transparent p-0"><TabsTrigger className="h-11 rounded-none border-b-2 border-transparent px-3 data-active:border-primary data-active:bg-transparent" value="brief">{t.resume}</TabsTrigger><TabsTrigger className="h-11 rounded-none border-b-2 border-transparent px-3 data-active:border-primary data-active:bg-transparent" value="cards">{t.cards}</TabsTrigger><TabsTrigger className="h-11 rounded-none border-b-2 border-transparent px-3 data-active:border-primary data-active:bg-transparent" value="network">{t.network}</TabsTrigger></TabsList><span className="text-[10px] text-muted-foreground">6 {t.allCards}</span></div>
    <TabsContent value="brief" className="m-0 min-h-0 flex-1 overflow-auto"><ResumeBrief locale={locale} t={t}/><PrimaryContinue setScreen={setScreen} t={t}/></TabsContent>
    <TabsContent value="cards" className="m-0 grid min-h-0 flex-1 grid-cols-[1.08fr_.92fr]"><div className="hide-scrollbar min-h-0 overflow-y-auto border-r px-4 py-3"><div className="mb-3 rounded-lg bg-secondary/70 p-3 text-xs leading-5 text-secondary-foreground"><strong>{t.ready}：</strong>{t.readFirst}</div>{cards.map(card=><ReasoningCardView key={card.id} card={card} locale={locale} selected={selected===card.id} onSelect={()=>{setSelected(card.id);eventLog("card_selected",{id:card.id})}} updateStatus={updateStatus} t={t}/>)}</div><KnowledgeNetwork locale={locale} cards={cards} selected={selected} setSelected={setSelected} compact/></TabsContent>
    <TabsContent value="network" className="m-0 min-h-0 flex-1"><KnowledgeNetwork locale={locale} cards={cards} selected={selected} setSelected={setSelected}/></TabsContent>
  </Tabs><PrimaryContinue setScreen={setScreen} t={t}/></RecoveryShell>;
}

function RecoveryShell({children,t}:{children:React.ReactNode;t:typeof copy[Locale]}) { return <div className="flex min-h-0 flex-col bg-[#fbfcfe]"><div className="flex h-14 shrink-0 items-center justify-between border-b px-5"><div><h2 className="flex items-center gap-2 font-semibold"><Brain size={20} className="text-primary"/>{t.recovery}</h2></div><Badge variant="outline" className="bg-white text-[10px]"><Clock size={13}/>24h</Badge></div>{children}</div> }

function ResumeBrief({locale,t}:{locale:Locale;t:typeof copy[Locale]}) { const rows=[[Target,t.currentGoal,locale==="zh-CN"?"确定 AI Tutor 反馈的核心研究机制":"Define the core mechanism of AI tutor feedback"],[Brain,t.position,locale==="zh-CN"?"当前倾向“元认知提示 → 自我调节”":"Leading framing: metacognitive prompts → self-regulation"],[WarningCircle,t.uncertain,locale==="zh-CN"?"解释型反馈在高负荷下是否仍有效":"Whether explanations still help under high load"],[XCircle,t.ruled,locale==="zh-CN"?"只增加反馈速度":"Only making feedback faster"],[ArrowRight,t.nextStep,locale==="zh-CN"?"检查材料 2 的认知负荷证据":"Check Material 2 for cognitive-load evidence"]]; return <div className="mx-auto max-w-2xl px-6 py-5"><div className="divide-y rounded-xl border bg-white">{rows.map(([I,label,value],i)=>{const Icon=I as typeof Target;return <div key={String(label)} className={`grid grid-cols-[32px_120px_1fr] items-start gap-2 px-4 py-3 ${i===4?"bg-[var(--active-soft)]":""}`}><Icon size={18} className={i===2?"text-[var(--uncertain)]":i===4?"text-[var(--active)]":"text-primary"}/><span className="text-xs font-medium text-muted-foreground">{String(label)}</span><span className="text-sm leading-5">{String(value)}</span></div>})}</div></div> }

function ReasoningCardView({card,locale,selected,onSelect,updateStatus,t}:{card:ReasoningCard;locale:Locale;selected:boolean;onSelect:()=>void;updateStatus:(id:string,s:EpistemicStatus)=>void;t:typeof copy[Locale]}) { const status={active:{label:"Active",icon:CheckCircle,cls:"border-l-[var(--active)] bg-[var(--active-soft)]/55 text-[var(--active)]"},uncertain:{label:"Uncertain",icon:WarningCircle,cls:"border-l-[var(--uncertain)] bg-[var(--uncertain-soft)]/60 text-[var(--uncertain)]"},expired:{label:"Expired",icon:PauseCircle,cls:"border-l-[var(--expired)] bg-muted/50 text-[var(--expired)]"},draft:{label:"Draft",icon:Clock,cls:"border-l-primary bg-secondary/40 text-primary"}}[card.status]; const Icon=status.icon; return <article onClick={onSelect} className={`mb-2 cursor-pointer rounded-lg border border-l-[3px] bg-white p-3 transition ${status.cls} ${selected?"ring-2 ring-primary/20 shadow-sm":"hover:shadow-sm"}`}><div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[10px] font-semibold"><Icon size={14}/>{status.label}{card.priority==="pinned"&&<PushPin size={13} weight="fill"/>}</span><span className="text-[9px] text-muted-foreground">v{card.revision}</span></div><h3 className="mt-2 text-[13px] font-semibold leading-5 text-foreground">{card.content[locale]}</h3><p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{card.detail[locale]}</p><div className="mt-2 flex items-center justify-between border-t pt-2"><button onClick={e=>{e.stopPropagation();eventLog("evidence_opened",{card:card.id})}} className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"><LinkSimple size={12}/>{t.evidence} · {card.sourceRefs[0]?.label}</button>{card.status==="uncertain"?<button onClick={e=>{e.stopPropagation();updateStatus(card.id,"active")}} className="text-[10px] font-medium text-[var(--active)] hover:underline">{t.verify}</button>:card.status==="expired"?<button onClick={e=>{e.stopPropagation();updateStatus(card.id,"active")}} className="text-[10px] hover:underline">{t.restore}</button>:<button onClick={e=>{e.stopPropagation();updateStatus(card.id,"expired")}} className="text-[10px] text-muted-foreground hover:underline">{t.expire}</button>}</div></article> }

type FlowData={ label:string; status:EpistemicStatus; selected:boolean };
function FlowNode({data}:{data:FlowData}) { const colors=data.status==="active"?"border-emerald-400 bg-emerald-50":data.status==="uncertain"?"border-amber-400 bg-amber-50":"border-slate-300 bg-slate-50"; return <div className={`w-[118px] rounded-lg border-2 px-3 py-2 text-center text-[10px] font-medium leading-4 shadow-sm ${colors} ${data.selected?"ring-4 ring-indigo-100":""}`}><Handle type="target" position={Position.Left}/>{data.label}<Handle type="source" position={Position.Right}/></div> }
const nodeTypes={reason:FlowNode};
const flowPositions:Record<string,{x:number;y:number}>={goal:{x:220,y:25},hypothesis:{x:220,y:120},uncertain:{x:20,y:120},constraint:{x:420,y:120},path:{x:20,y:230},next:{x:220,y:230}};
function KnowledgeNetwork({locale,cards,selected,setSelected,compact=false}:{locale:Locale;cards:ReasoningCard[];selected:string;setSelected:(s:string)=>void;compact?:boolean}) { const nodes=useMemo<Node<FlowData>[]>(()=>cards.map(c=>({id:c.id,type:"reason",position:flowPositions[c.id]||{x:0,y:0},data:{label:c.content[locale],status:c.status,selected:c.id===selected}})),[cards,locale,selected]); const edges=useMemo<Edge[]>(()=>relations.map(r=>({id:r.id,source:r.sourceCardId,target:r.targetCardId,label:compact?undefined:r.relationType,animated:r.relationType==="leads_to",style:{stroke:r.relationType==="challenges"?"#c58a2c":"#8a93a5"},labelStyle:{fontSize:9,fill:"#6b7280"}})),[compact]); return <div className="h-full min-h-0 bg-[#fcfcfd]"><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView minZoom={.45} maxZoom={1.4} onNodeClick={(_,n)=>{setSelected(n.id);eventLog("network_node_clicked",{id:n.id})}}><Background gap={22} size={1} color="#e8eaf0"/>{!compact&&<Controls position="bottom-right" showInteractive={false}/>}</ReactFlow></div> }

function PrimaryContinue({setScreen,t}:{setScreen:(s:Screen)=>void;t:typeof copy[Locale]}) { return <div className="shrink-0 border-t bg-white px-5 py-3"><Button className="h-11 w-full text-sm" onClick={()=>{eventLog("continue_research_clicked");setScreen("complete")}}>{t.continue}<ArrowRight size={17}/></Button></div> }

function Complete({setScreen,t}:{setScreen:(s:Screen)=>void;t:typeof copy[Locale]}) { return <div className="grid min-h-screen place-items-center bg-[#f7f6f2] p-8"><div className="max-w-lg text-center"><div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[var(--active-soft)] text-[var(--active)]"><CheckCircle size={36} weight="fill"/></div><h1 className="mt-6 text-3xl font-semibold">{t.completed}</h1><p className="mt-3 text-muted-foreground">{t.completeText}</p><Button variant="outline" className="mt-8" onClick={()=>setScreen("landing")}>{t.back}</Button></div></div> }
