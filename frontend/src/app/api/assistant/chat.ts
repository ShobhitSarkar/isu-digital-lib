// src/assistant/chat.ts

import OpenAI from "openai";

/**
 * OpenAI client instance to connect to the OpenAI API.
 */
const openai = new OpenAI({
  apiKey: process.env.MY_OPENAI_API_KEY,
});

/**
 * Generates answers to the given question using provided context through 
 * OpenAI's chat completion function 
 * @param {Object} params - The parameters for the chat function
 * @param {string} params.question - The user's question to be answered
 * @param {string} params.context - The context information to help answer the question
 * 
 * @returns {Promise<string>} The generated answer from the OpenAI chat model
 * 
 * @example
 * const answer = await chat({
 *   question: "What are the main findings?",
 *   context: "The study found that..."
 * });
 * 
 * 
 */
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