import { NextResponse } from "next/server";
import { z } from "zod";
import { getResearchTask } from "@/lib/research-task";

const bodySchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user","assistant"]), content: z.string().min(1).max(8000) })).min(1).max(60),
  locale: z.enum(["zh-CN","en"]).default("zh-CN"),
  taskId: z.enum(["library","waste","bike"]).default("library"),
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
1. 先给一句不超过 25 字的核心判断，再给 2–4 个有先后逻辑的要点；
2. 每个要点只表达一个意思，使用“1. 2. 3.”编号，不使用冗长段落；
3. 重要判断必须使用“[材料 ${task.code}1]”这样的编号回链；
4. 明确标注“材料证据 / 推断 / 仍需验证”，不可把推断写成事实；
5. 信息不足时直接说明缺口，并给出一个最小下一步，不编造外部事实；
6. 不假定存在预设正确框架，不替学生写最终 memo；
7. 除材料编号外，不复述题目；总长度控制在 220 个汉字以内。

五段研究材料：
${evidencePack}`
    :`You are a research-framing tutor for university students. The student is investigating: ${task.question.en}

Help the student compare framings, form testable hypotheses, mark uncertainty, rule out infeasible directions, and choose a next action. Do not write the final memo.

Every response must:
1. Start with one core judgment of no more than 18 words.
2. Follow with 2–4 numbered points in a clear reasoning order; one idea per point.
3. Cite consequential claims with backlinks such as [Material ${task.code}1].
4. Explicitly label evidence, inference, and unverified assumptions.
5. State the evidence gap and one minimum next step when information is insufficient.
6. Never invent external facts or assume a predetermined correct framing.
7. Stay under 140 words and avoid repeating the task.

Evidence pack:
${evidencePack}`;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || process.env.LLM_BASE_URL || "https://api.deepseek.com";
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.LLM_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || process.env.LLM_MODEL || "deepseek-v4-flash";
  if (!apiKey) {
    return NextResponse.json({
      mode: "demo",
      content: locale === "zh-CN"
        ? `当前是无 API Key 的演示模式。请先写出两个相互竞争的解释，并为每个解释标出至少一段材料编号（例如 [材料 ${task.code}1]）。然后说明：哪一条是材料直接支持的证据，哪一条仍只是需要验证的推断？`
        : `This preview has no API key. Start with two competing explanations and cite at least one material for each (for example, [Material ${task.code}1]). Then distinguish direct evidence from an inference that still needs testing.`,
      promptVersion: "three_isomorphic_tasks_v2_structured_concise",
    });
  }
  try{
    const response = await fetch(`${baseUrl.replace(/\/$/,"")}/chat/completions`, {
      method: "POST",
      headers: { "content-type":"application/json", authorization:`Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages:[{role:"system",content:systemPrompt},...parsed.data.messages],
        temperature: .3,
        max_tokens: 900,
      }),
    });
    if (!response.ok) return NextResponse.json({ error: "DeepSeek provider unavailable" }, { status: 502 });
    const completion=completionSchema.safeParse(await response.json());
    if(!completion.success||!completion.data.choices[0].message.content){
      return NextResponse.json({error:"Invalid DeepSeek response"},{status:502});
    }
    return NextResponse.json({ mode:"live", provider:"deepseek", model, promptVersion:"three_isomorphic_tasks_v2_structured_concise", content:completion.data.choices[0].message.content });
  }catch{
    return NextResponse.json({error:"DeepSeek request failed"},{status:502});
  }
}
