import { NextResponse } from "next/server";
import { z } from "zod";
import { getResearchTask } from "@/lib/research-task";

const requestSchema = z.object({
  taskId: z.enum(["library", "waste", "bike"]),
  locale: z.enum(["zh-CN", "en"]).default("zh-CN"),
  memo: z.string().max(20000),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    text: z.string().max(8000),
  })).max(60),
});

const cardSchema = z.object({
  id: z.string().min(1).max(80),
  kind: z.enum(["goal", "hypothesis", "evidence", "constraint", "path", "next_action"]),
  goalLevel: z.enum(["main", "subgoal", "suspended"]).optional(),
  content: z.string().min(1).max(1000),
  detail: z.string().min(1).max(2000),
  status: z.enum(["active", "uncertain", "expired"]),
  priority: z.enum(["normal", "pinned"]),
  confidence: z.number().min(0).max(100),
  source: z.string().min(1).max(1000),
  why: z.string().min(1).max(1000),
});

const extractionSchema = z.object({ cards: z.array(cardSchema).min(6).max(12) });

const completionSchema = z.object({
  choices: z.array(z.object({
    message: z.object({ content: z.string().nullable() }),
  })).min(1),
});

function parseJsonObject(content: string): unknown {
  const unfenced = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object");
  return JSON.parse(unfenced.slice(start, end + 1));
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid extraction request" }, { status: 400 });

  const { taskId, locale, memo, messages } = parsed.data;
  const task = getResearchTask(taskId);
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      mode: "demo",
      promptVersion: "rmw_state_extraction_v1",
      message: "No server-side DeepSeek key; neutral calibration candidates remain in use.",
    });
  }

  const evidencePack = task.materials.map((material) => `[${material.code}] ${material.excerpt[locale]}`).join("\n\n");
  const transcript = messages.map((message, index) => `${index + 1}. ${message.role}: ${message.text}`).join("\n");
  const outputLanguage = locale === "zh-CN" ? "简体中文" : "English";
  const systemPrompt = `You extract a participant's prospective reasoning state immediately before an interruption.

Return JSON only, with this shape:
{"cards":[{"id":"...","kind":"goal|hypothesis|evidence|constraint|path|next_action","goalLevel":"main|subgoal|suspended","content":"...","detail":"...","status":"active|uncertain|expired","priority":"normal|pinned","confidence":0,"source":"...","why":"..."}]}

Rules:
- Write all card text in ${outputLanguage}.
- Extract the participant's state from their memo and conversation. The five materials may only verify citations; do not insert a conclusion merely because it appears in a material.
- Never use or infer a hidden answer key. Do not label any framing as the strongest or correct one.
- Include exactly one main goal, 2–4 active subgoals, 0–3 suspended goals, one uncertain hypothesis, one rejected path, and one minimum next action.
- A rejected path may be status "expired" only when the participant explicitly rejected it. Otherwise write that no rejected path was reliably identified, set status "uncertain", and confidence at most 30.
- If an uncertainty or next action is not explicit, say it was not reliably identified, set status "uncertain", and confidence at most 30.
- Use short, specific cards. Cite sources such as "memo: 已排除的方向", "chat turn 4", or "材料 A4". Do not fabricate source locations.
- All candidates require participant calibration. Set the main goal and next action priority to "pinned"; others default to "normal".`;

  const userPrompt = `Task question:
${task.question[locale]}

Participant memo:
${memo || "(empty)"}

Conversation:
${transcript || "(empty)"}

Participant-visible evidence pack:
${evidencePack}`;

  const baseUrl = process.env.DEEPSEEK_BASE_URL || process.env.LLM_BASE_URL || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL || process.env.LLM_MODEL || "deepseek-v4-flash";

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0,
        max_tokens: 2200,
      }),
    });
    if (!response.ok) return NextResponse.json({ error: "DeepSeek provider unavailable" }, { status: 502 });

    const completion = completionSchema.safeParse(await response.json());
    const content = completion.success ? completion.data.choices[0].message.content : null;
    if (!content) return NextResponse.json({ error: "Invalid DeepSeek response" }, { status: 502 });

    const extraction = extractionSchema.safeParse(parseJsonObject(content));
    if (!extraction.success) return NextResponse.json({ error: "Invalid extraction output" }, { status: 502 });

    return NextResponse.json({
      mode: "live",
      provider: "deepseek",
      model,
      promptVersion: "rmw_state_extraction_v1",
      cards: extraction.data.cards,
    });
  } catch {
    return NextResponse.json({ error: "DeepSeek extraction failed" }, { status: 502 });
  }
}
