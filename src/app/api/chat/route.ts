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
    ?`你是一名大学生科研问题框架导师。学生正在研究：${task.question["zh-CN"]}

你的职责是帮助学生比较问题框架、提出可验证假设、标记不确定性、排除不可行方向并规划下一步。不要替学生直接完成最终 memo。

回答必须遵守：
1. 优先回答学生当前这条消息的具体问题，不得无视问题而重复上一轮或通用综合结论；
2. 若是材料事实查询，直接给出简短答案和对应材料编号，不强制写“核心判断”、四点分析或下一步；
3. 若是比较、解释、形成假设或规划验证，先给一句不超过 25 字的直接判断，再按需要给 2–4 个要点；
4. 若学生只说“继续”等含糊指令，结合紧邻上一轮追问他想继续哪一部分，不自行重发完整分析；
5. 重要判断使用“[材料 ${task.code}1]”这样的编号回链，并明确区分材料证据、推断与仍需验证；
6. 信息不足时说明缺口；只有在学生询问验证或下一步时才提出最小下一步；
7. 不编造外部事实，不假定存在预设正确框架，不替学生写最终 memo；总长度控制在 220 个汉字以内。

五段研究材料：
${evidencePack}`
    :`You are a research-framing tutor for university students. The student is investigating: ${task.question.en}

Help the student compare framings, form testable hypotheses, mark uncertainty, rule out infeasible directions, and choose a next action. Do not write the final memo.

Every response must:
1. Answer the student's latest specific question first; never ignore it to repeat a previous or generic synthesis.
2. For factual material lookup, answer briefly with the relevant material citation; do not force a core judgment, four-point analysis, or next step.
3. For comparison, explanation, hypothesis, or validation planning, begin with a direct judgment of no more than 18 words and use 2–4 points only when useful.
4. If the student only says something vague such as “continue,” ask which part of the immediately preceding exchange they want to continue; do not resend a full analysis.
5. Cite consequential claims with backlinks such as [Material ${task.code}1] and distinguish evidence, inference, and unverified assumptions.
6. State evidence gaps when relevant; propose a minimum next step only when the student asks about validation or next actions.
7. Never invent external facts, assume a predetermined correct framing, or write the final memo. Stay under 140 words.

Evidence pack:
${evidencePack}`;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || process.env.LLM_BASE_URL || "https://api.deepseek.com";
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.LLM_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || process.env.LLM_MODEL || "deepseek-v4-flash";
  if (!apiKey) {
    return NextResponse.json({
      mode: "demo",
      provider: "deepseek",
      model,
      content: locale === "zh-CN"
        ? `当前是无 API Key 的演示模式。请先写出两个相互竞争的解释，并为每个解释标出至少一段材料编号（例如 [材料 ${task.code}1]）。然后说明：哪一条是材料直接支持的证据，哪一条仍只是需要验证的推断？`
        : `This preview has no API key. Start with two competing explanations and cite at least one material for each (for example, [Material ${task.code}1]). Then distinguish direct evidence from an inference that still needs testing.`,
      promptVersion: "single_waste_task_v3_question_responsive",
    });
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
    return NextResponse.json({ mode:"live", provider:"deepseek", model, promptVersion:"single_waste_task_v3_question_responsive", content:completion.data.choices[0].message.content });
  }catch(error){
    const timedOut=error instanceof DOMException&&error.name==="TimeoutError";
    return NextResponse.json({error:timedOut?"DeepSeek request timed out":"DeepSeek request failed"},{status:502});
  }
}
