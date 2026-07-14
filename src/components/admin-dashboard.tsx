"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Brain, CheckCircle, Clock, DownloadSimple, Flask, MagnifyingGlass, Users, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const participants = [
  ["P-001","RMW","中文","Day 2 · Active","18:42","Approved"],
  ["P-002","Summary","English","Waiting","—","Approved"],
  ["P-003","Notes","中文","Day 1 · Checkpoint","03:11","—"],
  ["P-004","RMW","English","Review needed","—","Needs review"],
  ["P-005","Summary","中文","Complete","00:00","Approved"],
];

export function AdminDashboard(){
  const [selected,setSelected]=useState("P-004");
  return <div className="min-h-screen bg-[#f7f6f2] text-foreground">
    <header className="flex h-16 items-center justify-between border-b bg-white px-7"><div className="flex items-center gap-5"><Link href="/" className="grid size-9 place-items-center rounded-lg hover:bg-muted" aria-label="Back"><ArrowLeft size={18}/></Link><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-primary text-white"><Brain size={20}/></div><div><p className="font-semibold">RMW Research Console</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">CHI 2027 · Pilot 01</p></div></div></div><div className="flex gap-3"><Button variant="outline"><DownloadSimple/>Export data</Button><Button><Flask/>Study settings</Button></div></header>
    <main className="mx-auto max-w-[1500px] p-7"><div className="mb-7 flex items-end justify-between"><div><h1 className="text-3xl font-semibold tracking-tight">Study overview</h1><p className="mt-2 text-sm text-muted-foreground">Monitor sessions, review recovery artifacts, and export anonymized data.</p></div><Badge variant="outline" className="bg-white"><span className="size-2 rounded-full bg-emerald-500"/>Study active</Badge></div>
      <section className="mb-7 grid grid-cols-4 gap-4">{[
        [Users,"Participants","18","12 completed"],[Clock,"Day 2 return","78%","14 of 18"],[Brain,"RMW reviews","3","1 needs review"],[CheckCircle,"Extraction quality","86%","held-out validation"]
      ].map(([I,label,value,detail])=>{const Icon=I as typeof Users;return <article key={String(label)} className="rounded-xl border bg-white p-5"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{String(label)}</span><Icon size={20} className="text-primary"/></div><p className="mt-3 text-3xl font-semibold tracking-tight">{String(value)}</p><p className="mt-2 text-xs text-muted-foreground">{String(detail)}</p></article>})}</section>
      <div className="grid grid-cols-[1.6fr_.8fr] gap-5"><section className="overflow-hidden rounded-xl border bg-white"><div className="flex h-16 items-center justify-between border-b px-5"><div><h2 className="font-semibold">Participants</h2><p className="text-xs text-muted-foreground">Anonymous session IDs only</p></div><div className="relative"><MagnifyingGlass size={16} className="absolute left-3 top-3 text-muted-foreground"/><Input className="w-60 pl-9" placeholder="Search participant…"/></div></div><Table><TableHeader><TableRow><TableHead>Participant</TableHead><TableHead>Condition</TableHead><TableHead>Language</TableHead><TableHead>Stage</TableHead><TableHead>Timer</TableHead><TableHead>Review</TableHead></TableRow></TableHeader><TableBody>{participants.map(p=><TableRow key={p[0]} onClick={()=>setSelected(p[0])} className={`cursor-pointer ${selected===p[0]?"bg-secondary/55":""}`}><TableCell className="font-mono text-xs">{p[0]}</TableCell><TableCell><Badge variant="secondary">{p[1]}</Badge></TableCell><TableCell>{p[2]}</TableCell><TableCell>{p[3]}</TableCell><TableCell className="font-mono text-xs">{p[4]}</TableCell><TableCell>{p[5]==="Needs review"?<span className="flex items-center gap-1.5 text-xs text-amber-700"><WarningCircle/>{p[5]}</span>:<span className="text-xs text-muted-foreground">{p[5]}</span>}</TableCell></TableRow>)}</TableBody></Table></section>
        <aside className="rounded-xl border bg-white"><div className="border-b p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Review queue</h2><Badge variant="secondary">1 open</Badge></div><p className="mt-1 text-xs text-muted-foreground">Wizard-of-Oz quality gate</p></div><div className="p-5"><div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4"><div className="flex items-start justify-between"><div><p className="font-mono text-xs text-muted-foreground">{selected}</p><h3 className="mt-1 text-sm font-semibold">High-impact uncertain card</h3></div><WarningCircle size={21} className="text-amber-600"/></div><p className="mt-3 text-xs leading-5 text-muted-foreground">The extraction marks an explanation-effect claim as Active, but Material 2 indicates conflicting evidence.</p><div className="mt-4 flex gap-2"><Button size="sm">Open review <ArrowRight/></Button><Button size="sm" variant="outline">Assign</Button></div></div><div className="mt-6"><div className="mb-2 flex justify-between text-xs"><span>Card accuracy target</span><span>86 / 100</span></div><Progress value={86}/></div><div className="mt-6 space-y-3 border-t pt-5 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Cards</span><span>8</span></div><div className="flex justify-between"><span className="text-muted-foreground">Source coverage</span><span>100%</span></div><div className="flex justify-between"><span className="text-muted-foreground">Researcher edits</span><span>2</span></div><div className="flex justify-between"><span className="text-muted-foreground">Participant calibration</span><span>4 actions</span></div></div></div></aside></div>
    </main>
  </div>
}
