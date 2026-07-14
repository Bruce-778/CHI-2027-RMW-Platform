import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user","assistant","system"]), content: z.string().min(1).max(12000) })).min(1).max(80),
  locale: z.enum(["zh-CN","en"]).default("zh-CN"),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid chat request" }, { status: 400 });
  const baseUrl = process.env.LLM_BASE_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  if (!baseUrl || !apiKey || !model) {
    return NextResponse.json({
      mode: "demo",
      content: parsed.data.locale === "zh-CN" ? "这是预览环境的演示回答。正式实验接入模型后，我会引用材料并明确保留不确定性。" : "This is a demo response. In the configured study, the model will cite materials and preserve uncertainty explicitly.",
    });
  }
  const response = await fetch(`${baseUrl.replace(/\/$/,"")}/chat/completions`, { method: "POST", headers: { "content-type":"application/json", authorization:`Bearer ${apiKey}` }, body: JSON.stringify({ model, messages: parsed.data.messages, temperature: .2 }) });
  if (!response.ok) return NextResponse.json({ error: "Model provider unavailable" }, { status: 502 });
  const data = await response.json();
  return NextResponse.json({ mode:"live", content:data.choices?.[0]?.message?.content ?? "" });
}
