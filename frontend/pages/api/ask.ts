import type { NextApiRequest, NextApiResponse } from "next";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import { chat } from "./chat";

const VECTOR_SIZE = 1536;
const COLLECTION = "academic-docs";

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  port: null,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { question, paperNames } = req.body;

  if (!question || !paperNames || !Array.isArray(paperNames)) {
    return res.status(400).json({ error: "Missing question or paperNames" });
  }

  try {
    // 1. Embed the question
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

    const contextChunks = searchRes.map((point) => point.payload?.content).filter(Boolean) as string[];
    const contextText = contextChunks.join("\n\n---\n\n");

    // 3. Call OpenAI through chat.ts
    const answer = await chat({ question, context: contextText });

    res.status(200).json({ answer });
  } catch (err: any) {
    console.error("Failed to answer question:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
}
