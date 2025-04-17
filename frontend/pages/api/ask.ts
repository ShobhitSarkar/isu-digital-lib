//frontend/pages/api/ask.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import { chat } from "./chat";

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
 * @param req - Next.js API request object 
 * @param {string} req.body.question - The user's question to be answered
 * @param {string[]} req.body.paperNames - Array of paper names to search within
 * @param res - Next.js API response object
 * 
 * @returns {Promise<void>} JSON response with either:
 *   - Success: { answer: string }
 *   - Error: { error: string, message?: string }
 * 
 * @throws {405} If request method is not POST
 * @throws {400} If question or paperNames are missing/invalid
 * @throws {500} If processing fails
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { question, paperNames } = req.body;

  if (!question || !paperNames || !Array.isArray(paperNames)) {
    return res.status(400).json({ error: "Missing question or paperNames" });
  }

  try {
    // 1. Embed the user's question
    const embeddingResponse = await generateEmbedding(query);

    const questionVector = embeddingResponse.data[0].embedding;

    // 2. Search Qdrant for matching content from selected papers
    const searchRes = await qdrant.search(COLLECTION, {
      vector: questionVector,
      top: 5,
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

    res.status(200).json({ answer });
  } catch (err: any) {
    console.error("Failed to answer question:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
}

// Replace the embedding generation code
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Use GPT-4o to generate an embedding-like vector
    const embeddingCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful embedding generator. For the following text, generate a semantic representation as a JSON array of 1536 float values between -1 and 1. Each value should represent a semantic dimension. Return ONLY a JSON object with a single key 'embedding' containing the array. No explanation."
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" },
    });

    // Parse the JSON response to get the embedding
    const responseContent = embeddingCompletion.choices[0].message.content;
    const embeddingData = JSON.parse(responseContent);
    const embedding = embeddingData.embedding;
    
    // Ensure we have a proper embedding
    if (!Array.isArray(embedding) || embedding.length !== 1536) {
      console.warn("Invalid embedding format received, using fallback random embedding");
      return Array(1536).fill(0).map(() => (Math.random() * 2 - 1) * 0.01);
    }
    
    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    // Fallback to a random embedding
    return Array(1536).fill(0).map(() => (Math.random() * 2 - 1) * 0.01);
  }
}
