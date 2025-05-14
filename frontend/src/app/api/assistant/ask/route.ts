// src/app/api/assistant/ask/route.ts

import { NextRequest, NextResponse } from "next/server";
import { QdrantClient } from "@qdrant/js-client-rest";
import { createOpenAIClient } from "@/lib/openai-config";
import { ensureProtocol } from "@/lib/utils";

const VECTOR_SIZE = 1536; // size of the vector embeddings from OpenAI's model 
const COLLECTION = "academic-docs"; // name of the Qdrant collection 

// Initialize Qdrant client
const qdrant = new QdrantClient({
  url: ensureProtocol(process.env.QDRANT_URL),
  apiKey: process.env.QDRANT_API_KEY,
  port: null,
  checkCompatibility: false,
});

// Initialize OpenAI client
const openai = createOpenAIClient();

/**
 * Ensure required env vars exist
 */
function checkRequiredKeys() {
  const missingKeys: string[] = [];
  if (!process.env.MY_OPENAI_API_KEY)  missingKeys.push('MY_OPENAI_API_KEY');
  if (!process.env.QDRANT_URL)         missingKeys.push('QDRANT_URL');
  if (!process.env.QDRANT_API_KEY)     missingKeys.push('QDRANT_API_KEY');

  if (missingKeys.length > 0) {
    console.error(`Missing required environment variables: ${missingKeys.join(', ')}`);
    return {
      error: true,
      message: `API configuration incomplete. Missing: ${missingKeys.join(', ')}`,
      status: 500
    };
  }
  return { error: false };
}

/**
 * API endpoint handler that uses semantic search. 
 * Takes in a question and a list of paper names, searches for relevant content 
 * and generates answers using OpenAI's chat model.
 * Retains chat history and provides as context
 * for conversation referencing.
 * 
 * @param request - Next.js API request
 * @returns {Promise<NextResponse>} JSON response with either:
 *   - Success: { answer: string }
 *   - Error: { error: string, message?: string }
 */
export async function POST(request: NextRequest) {
  console.log("Ask route called");

  // Check environment
  const keyCheck = checkRequiredKeys();
  if (keyCheck.error) {
    return NextResponse.json(
      { error: keyCheck.message },
      { status: keyCheck.status }
    );
  }

  try {
    // Debug environment variables
    console.log("Environment variables:");
    console.log("QDRANT_URL:",    process.env.QDRANT_URL ? "Set" : "Not set");
    console.log("QDRANT_API_KEY:", process.env.QDRANT_API_KEY ? "Set" : "Not set");
    console.log("MY_OPENAI_API_KEY:", process.env.MY_OPENAI_API_KEY ? "Set" : "Not set");

    // Parse request body (including chat history)
    const { question, paperNames, history = [] } = await request.json();
    console.log("Received question:", question);
    console.log("For papers:", paperNames);
    console.log("History length:", Array.isArray(history) ? history.length : 0);

    // Validate inputs
    if (!question || !Array.isArray(paperNames) || paperNames.length === 0) {
      console.error("Missing or invalid question or paperNames");
      return NextResponse.json(
        { error: "Missing or invalid question or paperNames" },
        { status: 400 }
      );
    }

    // Check if collection exists
    console.log("Checking if collection exists...");
    try {
      const collections = await qdrant.getCollections();
      const exists = collections.collections.some((c) => c.name === COLLECTION);
      const exists = collections.collections.some(c => c.name === COLLECTION);
      if (!exists) {
        console.error("Collection does not exist");
        return NextResponse.json(
          { error: "No documents found. Please upload papers first." },
          { status: 404 }
        );
      }
      console.log("Collection exists, proceeding with search");
    } catch (qdrantError) {
      console.error("Error checking Qdrant collections:", qdrantError);
      return NextResponse.json(
        { error: "Could not connect to document database", message: (qdrantError as Error).message },
        { status: 500 }
      );
    }

    // 1. Embed question
    console.log("Generating embedding for question...");
    let questionVector: number[];
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: question,
      });
      questionVector = embeddingResponse.data[0].embedding;
      questionVector = embeddingResponse.data[0].embedding;
      console.log("Embedding generated successfully");
    } catch (openaiError) {
      console.error("OpenAI embeddings error:", openaiError);
      return NextResponse.json(
        { error: "Error generating question embedding", message: (openaiError as Error).message },
        { status: 500 }
      );
    }

    // 2. Search Qdrant for matching content from selected papers
    console.log("Searching for relevant content...");
    let searchRes;
    try {
      searchRes = await qdrant.search(COLLECTION, {
        vector: questionVector,
        limit: 10,  // Increased from 5 to get more context
        filter: {
          must: [
            {
              key: "paperName",
              match: {
                any: paperNames,
              },
            },
          ],
        },
      });
      console.log(`Found ${searchRes.length} matching chunks`);
      if (searchRes.length === 0) {
        return NextResponse.json({ 
          answer: "I couldn't find any relevant information in the uploaded papers. This might be because the papers don't contain information related to your question, or the papers weren't processed correctly. You can try uploading the papers again or asking a different question."
        });
      }
    } catch (searchError) {
      console.error("Qdrant search error:", searchError);
      return NextResponse.json(
        { error: "Error searching the document database", message: (searchError as Error).message },
        { status: 500 }
      );
    }

    // 3. Take the search result from qdrant and extract the content 
    const contextChunks = searchRes.map((point) => {
      // Include the paper name for better context
      const paperName = point.payload?.paperName || "Unknown Paper";
      const content = point.payload?.content || "";
      return `[From: ${paperName}]\n${content}`;
    }).filter(Boolean) as string[];
    const contextText = contextChunks.join("\n\n---\n\n");
    console.log("Context prepared, length:", contextText.length);

    // 4. Truncate if too long
    const maxContextLength = 14000;
    let truncatedContext = contextText;
    if (contextText.length > maxContextLength) {
      console.log("Context too long, truncating...");
      const parts = contextText.split("---");
      truncatedContext = "";
      for (const part of parts) {
        if ((truncatedContext + part).length <= maxContextLength) {
          if (truncatedContext) truncatedContext += "\n\n---\n\n";
          truncatedContext += part;
        } else break;
      }
      console.log(`Truncated context to ${truncatedContext.length} chars`);
    }

    // 5. Build chat messages including history
    const systemPrompt = `You are a helpful academic assistant that analyzes research papers.
                          Use the provided context from uploaded academic papers to answer the user's question.
                          Your answers should be detailed and informative, but focus only on information present in the provided context.
                          Always cite the paper name when mentioning information from it.
                          If the context is insufficient to answer the question, clearly state what's missing and suggest what other information might be needed.
                          If the context contains conflicting information, mention this and present both perspectives.
                          If the question is unrelated to the provided context, respond with "I'm not sure based on the papers provided.
                          If the user asks a follow-up using vague terms (this, that, it, the previous point), assume they refer to the concepts from the most relevant prior assistant response.`;

    // Ensure history is an array of chat turns
    const chatHistory = Array.isArray(history)
      ? history.filter(h => ['user','assistant'].includes(h.role) && typeof h.content === 'string')
      : [];

    const userPrompt = `Context:\n${truncatedContext}\n\nQuestion:\n${question}`;

    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      { role: 'user', content: userPrompt }
    ];
    console.log("Final chatMessages:", JSON.stringify(chatMessages, null, 2));
    // 6. Call OpenAI chat completion
    console.log("Calling OpenAI chat completion...");
    console.log(chatMessages)
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: chatMessages,
        temperature: 0.3,
      });

      const answer = completion.choices[0].message.content;
      console.log("Received answer of length:", answer?.length || 0);
      
      return NextResponse.json({ answer: answer || "I'm sorry, I couldn't generate an answer based on the uploaded papers." });
    } catch (openaiError) {
      console.error("OpenAI chat completion error:", openaiError);
      return NextResponse.json(
        { error: "Error generating answer", message: (openaiError as Error).message },
        { status: 500 }
      );
    }

  } catch (err: any) {
    console.error("Failed to answer question:", err);
    return NextResponse.json(
      { error: "Something went wrong.", message: err.message },
      { status: 500 }
    );
  }
}
