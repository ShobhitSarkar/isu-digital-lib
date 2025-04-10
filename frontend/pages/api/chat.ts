import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function chat({
  question,
  context,
}: {
  question: string;
  context: string;
}) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a helpful academic assistant. Use the provided context to answer the question. If the context is insufficient, respond with "I'm not sure based on the papers provided."`,
      },
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion:\n${question}`,
      },
    ],
    temperature: 0.3,
  });

  return completion.choices[0].message.content;
}
