import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  const body = await req.json();
  const { message, context } = body;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // fast + cheap
      messages: [
        {
          role: "system",
          content: `
You are an AI Study Coach.

You help students:
- Plan what to study
- Improve weak topics
- Prepare for exams

Be short, clear, and practical.

User Context:
${JSON.stringify(context)}
          `,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    return NextResponse.json({
      reply: response.choices[0].message.content,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}