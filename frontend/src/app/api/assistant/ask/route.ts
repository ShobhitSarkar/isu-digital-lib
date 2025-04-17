// frontend/src/app/api/assistant/ask/route.ts

import { NextRequest, NextResponse } from "next/server";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import { chat } from "../chat";

const VECTOR_SIZE = 1536; // size of the vector embeddings from OpenAI's model 
const COLLECTION = "academic-docs"; // name of the Qdrant collection 

/**
 * Set up the Qdrant client to connect to the Qdrant server.
 */
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  port: null,
});

/**
 * Set up the OpenAI client to connect to the OpenAI API.
 */
const openai = new OpenAI({
  apiKey: process.env.MY_OPENAI_API_KEY,
});

/**
 * API endpoint handler that uses semantic search . 
 * Takes in a question and a list of paper names, searches for relevant content 
 * and generates answers using OpenAI's chat model.
 * 
 * @param request - Next.js API request
 * @returns {Promise<NextResponse>} JSON response with either:
 *   - Success: { answer: string }
 *   - Error: { error: string, message?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { question, paperNames } = await request.json();

    if (!question || !paperNames || !Array.isArray(paperNames)) {
      return NextResponse.json(
        { error: "Missing question or paperNames" },
        { status: 400 }
      );
    }

    // 1. Embed the user's question
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: question,
    });

    const questionVector = embeddingResponse.data[0].embedding;

    // 2. Search Qdrant for matching content from selected papers
    const searchRes = await qdrant.search(COLLECTION, {
      vector: questionVector,
      limit: 5,
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

    // Take the search result from qdrant and extracts the content 
    const contextChunks = searchRes.map((point) => point.payload?.content).filter(Boolean) as string[];

    // Takes the extracted content chunks and joins them to create a single string
    const contextText = contextChunks.join("\n\n---\n\n");

    // 3. Call OpenAI through chat.ts
    const answer = await chat({ question, context: contextText });

    return NextResponse.json({ answer });
  } catch (err: any) {
    console.error("Failed to answer question:", err);
    return NextResponse.json(
      { error: "Something went wrong.", message: err.message },
      { status: 500 }
    );
  }
}