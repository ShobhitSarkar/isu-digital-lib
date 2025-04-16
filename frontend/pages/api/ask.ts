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
  apiKey: process.env.OPENAI_API_KEY,
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
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: question,
    });

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
