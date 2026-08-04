import { NextResponse } from "next/server";
import { z } from "zod";
import { getResearchTask } from "@/lib/research-task";

const bodySchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user","assistant"]), content: z.string().min(1).max(8000) })).min(1).max(60),
  locale: z.enum(["zh-CN","en"]).default("zh-CN"),
  taskId: z.literal("waste").default("waste"),
});

const completionSchema=z.object({
  choices:z.array(z.object({
    message:z.object({content:z.string().nullable()}),
  })).min(1),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid chat request" }, { status: 400 });
  const {locale,taskId}=parsed.data;
  const task=getResearchTask(taskId);
  const evidencePack=task.materials.map(material=>`[${locale==="zh-CN"?"材料":"Material"} ${material.code}] ${material.excerpt[locale]}`).join("\n\n");
  const systemPrompt=locale==="zh-CN"
    ?`你是研究任务中的 AI 助手。学生正在研究：${task.question["zh-CN"]}

请像一位自然、耐心的研究讨论伙伴一样对话。先理解学生当前真正想问什么，再结合紧邻的上下文作答。直接问题就直接回答；开放问题可以一起梳理；表达含糊时，用一个简短问题确认他的意思。不要因为系统里有完整材料，就在每一轮主动倾倒一套完整分析，也不要机械重复上一轮。

回答以自然中文为主，通常使用一到三个短段落。只有当比较多个选项、拆解复杂推理或学生明确要求列表时，才使用项目符号或编号。不要固定使用“核心判断”“材料证据”“推断”“仍需验证”“信息缺口”“最小下一步”等标题；这些区别应在需要时自然表达。

当回答涉及材料中的具体事实或重要判断时，用 [材料 ${task.code}1] 这样的编号标明依据。材料没有支持的内容要明确说是推测或尚不确定，但不必给每句话贴标签。不要引入材料之外的事实，不设定唯一正确框架，也不要替学生直接写完整最终 memo。你的目标是帮助学生把自己的问题想清楚，而不是代替他完成任务。

五段研究材料：
${evidencePack}`
    :`You are the AI assistant in a research task. The student is investigating: ${task.question.en}

Talk like a natural, patient research partner. First understand what the student is asking now, then respond in light of the immediately preceding conversation. Answer direct questions directly, work through open questions collaboratively, and ask one brief clarifying question when the request is ambiguous. Do not dump a complete analysis merely because the full evidence pack is available, and do not mechanically repeat an earlier answer.

Use one to three short paragraphs in ordinary conversation. Use bullets or numbering only when comparing several options, unpacking genuinely complex reasoning, or when the student requests a list. Do not force headings such as “core judgment,” “evidence,” “inference,” “uncertainty,” “evidence gap,” or “minimum next step.” Express those distinctions naturally when they matter.

When citing a concrete fact or consequential claim from the materials, include a backlink such as [Material ${task.code}1]. Say naturally when something is an inference or remains uncertain, without labeling every sentence. Do not introduce facts outside the evidence pack, assume a single correct framing, or write the student's complete final memo. Help the student clarify their own reasoning rather than completing the task for them.

Evidence pack:
${evidencePack}`;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || process.env.LLM_BASE_URL || "https://api.deepseek.com";
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.LLM_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || process.env.LLM_MODEL || "deepseek-v4-flash";
  if (!apiKey) {
    return NextResponse.json({
      mode: "unavailable",
      error: locale === "zh-CN" ? "DeepSeek 尚未配置" : "DeepSeek is not configured",
      promptVersion: "single_waste_task_v4_conversational",
    }, { status: 503 });
  }
  try{
    const response = await fetch(`${baseUrl.replace(/\/$/,"")}/chat/completions`, {
      method: "POST",
      headers: { "content-type":"application/json", authorization:`Bearer ${apiKey}` },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        model,
        messages:[{role:"system",content:systemPrompt},...parsed.data.messages],
        thinking: { type: "disabled" },
        temperature: .3,
        max_tokens: 900,
      }),
    });
    if (!response.ok) return NextResponse.json({ error: "DeepSeek provider unavailable" }, { status: 502 });
    const completion=completionSchema.safeParse(await response.json());
    if(!completion.success||!completion.data.choices[0].message.content){
      return NextResponse.json({error:"Invalid DeepSeek response"},{status:502});
    }
    return NextResponse.json({ mode:"live", provider:"deepseek", model, promptVersion:"single_waste_task_v4_conversational", content:completion.data.choices[0].message.content });
  }catch(error){
    const timedOut=error instanceof DOMException&&error.name==="TimeoutError";
    return NextResponse.json({error:timedOut?"DeepSeek request timed out":"DeepSeek request failed"},{status:502});
  }
}
