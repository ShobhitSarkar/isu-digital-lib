// src/app/api/assistant/chat.ts

import { createOpenAIClient } from "@/lib/openai-config";

/**
 * OpenAI client instance to connect to the OpenAI API.
 */
const openai = createOpenAIClient();


/**
 * Generates answers to the given question using provided context through 
 * OpenAI's chat completion function 
 * @param {Object} params - The parameters for the chat function
 * @param {string} params.question - The user's question to be answered
 * @param {string} params.context - The context information to help answer the question
 * 
 * @returns {Promise<string>} The generated answer from the OpenAI chat model
 */
export async function chat({
  question,
  context,
}: {
  question: string;
  context: string;
}) {
  console.log("Processing chat with context length:", context.length);
  
  try {
    // Ensure the context isn't too long for the API
    // Truncate if necessary while preserving document boundaries
    const maxContextLength = 14000; // Leave room for system & user messages
    let truncatedContext = context;
    
    if (context.length > maxContextLength) {
      console.log("Context too long, truncating...");
      // Split on the document separators
      const chunks = context.split("---");
      
      // Start with empty context
      truncatedContext = "";
      
      // Add chunks until we reach the limit
      for (const chunk of chunks) {
        if ((truncatedContext + chunk).length <= maxContextLength) {
          // Add separator back if this isn't the first chunk
          if (truncatedContext.length > 0) {
            truncatedContext += "\n\n---\n\n";
          }
          truncatedContext += chunk;
        } else {
          break;
        }
      }
      
      console.log(`Truncated context from ${context.length} to ${truncatedContext.length} characters`);
    }
    
    // Create a more detailed system prompt
    const systemPrompt = `You are a helpful academic assistant that analyzes research papers.
Use the provided context from uploaded academic papers to answer the user's question.
Your answers should be detailed and informative, but focus only on information present in the provided context.
Always cite the paper name when mentioning information from it.
If the context is insufficient to answer the question, clearly state what's missing and suggest what other information might be needed.
If the context contains conflicting information, mention this and present both perspectives.
If the question is unrelated to the provided context, respond with "I'm not sure based on the papers provided."`;

    // Make the OpenAI API call
    console.log("Calling OpenAI chat completion API...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Context:\n${truncatedContext}\n\nQuestion:\n${question}`,
        },
      ],
      temperature: 0.3,
    });

    const answer = completion.choices[0].message.content;
    console.log("Received answer of length:", answer?.length || 0);
    
    return answer || "I'm sorry, I couldn't generate an answer. Please try again.";
  } catch (error) {
    console.error("Error in chat function:", error);
    throw error;
  }
}