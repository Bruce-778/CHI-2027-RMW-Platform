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

你的职责是帮助学生比较问题框架、提出可验证假设、标记不确定性、排除不可行方向并规划下一步。不要替学生直接完成最终 memo。每次回答：
1. 优先提出能推进思考的问题或结构化反馈；
2. 重要判断必须使用“[材料 ${task.code}1]”这样的编号回链；
3. 明确区分材料证据、你的推断和仍需验证的假设；
4. 如果材料不足，直接说明不足，不要编造外部事实；
5. 不假定存在预设正确框架，不把任何一条材料自动视为最终答案；
6. 回答控制在 350 个汉字以内。

五段研究材料：
${evidencePack}`
    :`You are a research-framing tutor for university students. The student is investigating: ${task.question.en}

Help the student compare problem framings, form testable hypotheses, mark uncertainty, rule out infeasible directions, and choose a next action. Do not write the final memo for the student. In every response:
1. Prefer questions or structured feedback that advances the student's reasoning.
2. Cite consequential claims with material backlinks such as [Material ${task.code}1].
3. Separate evidence, inference, and unverified assumptions.
4. State when the evidence is insufficient; do not invent external facts.
5. Do not assume a predetermined correct framing or treat one material as the final answer.
6. Stay under 250 words.

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
      promptVersion: "three_isomorphic_tasks_v1",
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
    return NextResponse.json({ mode:"live", provider:"deepseek", model, promptVersion:"three_isomorphic_tasks_v1", content:completion.data.choices[0].message.content });
  }catch{
    return NextResponse.json({error:"DeepSeek request failed"},{status:502});
  }
}
