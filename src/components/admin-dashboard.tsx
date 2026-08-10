"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ArrowLeft, Brain, CheckCircle, Clock, DownloadSimple, LockKey,
  SignOut, Users, WarningCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ResultSummary = {
  participant_code: string;
  locale: string;
  condition: string;
  task_id: string;
  status: "started" | "completed";
  consented_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type ParticipantResult = ResultSummary & {
  pre_survey: Record<string, number> | null;
  memo: string | null;
  chat: Array<{ role: "user" | "assistant"; text: string }> | null;
  problem_state: unknown;
  recall: Record<string, string> | null;
  recovery_state: unknown;
};

type ResultEvent = {
  id: string;
  sequence_number: number;
  event_type: string;
  stage: string;
  client_timestamp: string;
};

type AccessState = "loading" | "login" | "ready" | "unavailable";

function formatTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function JsonBlock({ value }: { value: unknown }) {
  return <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/45 p-3 text-[11px] leading-5 text-muted-foreground">{value == null ? "—" : JSON.stringify(value, null, 2)}</pre>;
}

export function AdminDashboard() {
  const [access, setAccess] = useState<AccessState>("loading");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [selected, setSelected] = useState("");
  const [detail, setDetail] = useState<ParticipantResult | null>(null);
  const [events, setEvents] = useState<ResultEvent[]>([]);

  const loadResults = useCallback(async () => {
    const response = await fetch("/api/research/results", { cache: "no-store" });
    if (response.status === 401) { setAccess("login"); return; }
    if (response.status === 503) { setAccess("unavailable"); return; }
    if (!response.ok) { setError("无法读取研究结果，请稍后重试。"); setAccess("login"); return; }
    const body = await response.json() as { results?: ResultSummary[] };
    const nextResults = body.results || [];
    setResults(nextResults);
    setAccess("ready");
    setSelected((current) => current || nextResults[0]?.participant_code || "");
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void loadResults(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadResults]);

  useEffect(() => {
    if (access !== "ready" || !selected) return;
    const controller = new AbortController();
    void fetch(`/api/research/results?participantCode=${encodeURIComponent(selected)}`, {
      cache: "no-store",
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("detail_failed");
      return await response.json() as { result: ParticipantResult; events: ResultEvent[] };
    }).then((body) => {
      setDetail(body.result);
      setEvents(body.events);
    }).catch((requestError: unknown) => {
      if (requestError instanceof DOMException && requestError.name === "AbortError") return;
      setError("无法读取该被试的详细结果。");
    });
    return () => controller.abort();
  }, [access, selected]);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/research/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setError(response.status === 503 ? "研究者后台尚未配置。" : "密码错误。");
      return;
    }
    setPassword("");
    await loadResults();
  };

  const logout = async () => {
    await fetch("/api/research/login", { method: "DELETE" });
    setResults([]);
    setSelected("");
    setDetail(null);
    setAccess("login");
  };

  const exportResults = async () => {
    const response = await fetch("/api/research/results?export=1", { cache: "no-store" });
    if (!response.ok) { setError("导出失败，请稍后重试。"); return; }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `rmw-central-results-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (access === "loading") return <div className="grid min-h-screen place-items-center bg-[#f7f6f2] text-sm text-muted-foreground">正在验证研究者身份…</div>;

  if (access === "login" || access === "unavailable") return <div className="grid min-h-screen place-items-center bg-[#f7f6f2] p-8">
    <form onSubmit={login} className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-[0_18px_60px_rgba(35,40,65,.08)]">
      <div className="mx-auto grid size-12 place-items-center rounded-xl bg-secondary text-primary"><LockKey size={25}/></div>
      <h1 className="mt-5 text-center text-2xl font-semibold">研究者后台</h1>
      <p className="mt-2 text-center text-sm leading-6 text-muted-foreground">被试无法查看此处数据。请输入研究者密码继续。</p>
      {access === "unavailable" && <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">尚未配置 Supabase 或研究者后台环境变量。</div>}
      <label className="mt-6 block text-sm font-medium" htmlFor="researcher-password">研究者密码</label>
      <Input id="researcher-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2" />
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <Button type="submit" className="mt-5 h-11 w-full" disabled={!password}>登录</Button>
      <Link href="/" className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft/>返回实验入口</Link>
    </form>
  </div>;

  const completed = results.filter((result) => result.status === "completed").length;
  return <div className="min-h-screen bg-[#f7f6f2] text-foreground">
    <header className="flex h-16 items-center justify-between border-b bg-white px-7">
      <div className="flex items-center gap-4"><div className="grid size-9 place-items-center rounded-lg bg-primary text-white"><Brain size={20}/></div><div><p className="font-semibold">RMW 研究者后台</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Central participant results</p></div></div>
      <div className="flex gap-2"><Button variant="outline" onClick={exportResults}><DownloadSimple/>导出全部结果</Button><Button variant="ghost" onClick={logout}><SignOut/>退出</Button></div>
    </header>
    <main className="mx-auto max-w-[1500px] p-7">
      {error && <div className="mb-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><WarningCircle/>{error}</div>}
      <section className="mb-6 grid grid-cols-3 gap-4">
        <article className="rounded-xl border bg-white p-5"><Users className="text-primary"/><p className="mt-3 text-3xl font-semibold">{results.length}</p><p className="mt-1 text-sm text-muted-foreground">全部被试</p></article>
        <article className="rounded-xl border bg-white p-5"><CheckCircle className="text-emerald-600"/><p className="mt-3 text-3xl font-semibold">{completed}</p><p className="mt-1 text-sm text-muted-foreground">已完成</p></article>
        <article className="rounded-xl border bg-white p-5"><Clock className="text-primary"/><p className="mt-3 text-3xl font-semibold">{results.length - completed}</p><p className="mt-1 text-sm text-muted-foreground">进行中</p></article>
      </section>
      <div className="grid grid-cols-[1.05fr_.95fr] gap-5">
        <section className="overflow-hidden rounded-xl border bg-white">
          <div className="border-b p-5"><h2 className="font-semibold">被试结果</h2><p className="mt-1 text-xs text-muted-foreground">数据由实验页面通过服务器增量保存。</p></div>
          {results.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">还没有收到被试结果。</div> : <Table><TableHeader><TableRow><TableHead>编号</TableHead><TableHead>状态</TableHead><TableHead>语言</TableHead><TableHead>开始</TableHead><TableHead>完成</TableHead></TableRow></TableHeader><TableBody>{results.map((result) => <TableRow key={result.participant_code} onClick={() => setSelected(result.participant_code)} className={`cursor-pointer ${selected === result.participant_code ? "bg-secondary/55" : ""}`}><TableCell className="font-mono text-xs">{result.participant_code}</TableCell><TableCell><Badge variant={result.status === "completed" ? "default" : "secondary"}>{result.status === "completed" ? "已完成" : "进行中"}</Badge></TableCell><TableCell>{result.locale}</TableCell><TableCell className="text-xs">{formatTime(result.consented_at)}</TableCell><TableCell className="text-xs">{formatTime(result.completed_at)}</TableCell></TableRow>)}</TableBody></Table>}
        </section>
        <aside className="min-h-[620px] rounded-xl border bg-white p-5">
          {!detail ? <div className="grid h-full min-h-96 place-items-center text-sm text-muted-foreground">选择一个被试查看详细记录</div> : <div className="space-y-5">
            <div className="flex items-center justify-between"><div><p className="font-mono text-sm font-semibold">{detail.participant_code}</p><p className="mt-1 text-xs text-muted-foreground">{detail.condition} · {detail.locale} · {events.length} 个事件</p></div><Badge>{detail.status === "completed" ? "已完成" : "进行中"}</Badge></div>
            <section><h3 className="mb-2 text-sm font-semibold">最终 Memo</h3><div className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/45 p-3 text-xs leading-6">{detail.memo || "尚未保存"}</div></section>
            <section><h3 className="mb-2 text-sm font-semibold">AI 对话</h3><JsonBlock value={detail.chat}/></section>
            <section><h3 className="mb-2 text-sm font-semibold">Problem State</h3><JsonBlock value={detail.problem_state}/></section>
            <section><h3 className="mb-2 text-sm font-semibold">前测答案</h3><JsonBlock value={detail.pre_survey}/></section>
            <section><h3 className="mb-2 text-sm font-semibold">无辅助回忆</h3><JsonBlock value={detail.recall}/></section>
            <section><h3 className="mb-2 text-sm font-semibold">恢复阶段状态</h3><JsonBlock value={detail.recovery_state}/></section>
            <section><h3 className="mb-2 text-sm font-semibold">最近事件</h3><JsonBlock value={events.slice(-30)}/></section>
          </div>}
        </aside>
      </div>
    </main>
  </div>;
}
