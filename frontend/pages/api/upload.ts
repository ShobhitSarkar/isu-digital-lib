import fs from "fs";
import pdfParse from "pdf-parse";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { IncomingForm } from "formidable";
import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";

/**
 * Create a config instance to disable Next.js's body parsing due to 
 * file handling 
 */
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Instantiate a openai client to connect to the OpenAI API.
 */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Instantiate a Qdrant client to connect to the Qdrant server.
 */
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  port: null,
});

const COLLECTION = "academic-docs"; // name of the Qdrant collection
const VECTOR_SIZE = 1536; // size of the vector embeddings from OpenAI's model

/**
 * Handles PDF document uploads, processes them for vector search, and stores in Qdrant.
 * 
 * @param req - Next.js API request object containing the uploaded PDF file
 * @param res - Next.js API response object
 * 
 * @returns Promise<void> JSON response with either:
 *   Success: Array of uploaded file metadata
 *   Error: { error: string }
 * 
 * @throws {405} If request method is not POST
 * @throws {400} If no valid file is uploaded
 * @throws {500} If processing or upload fails
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const form = new IncomingForm({ multiples: true });

  try {
    const { files } = await new Promise<any>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const uploaded = Array.isArray(files.files) ? files.files : [files.files];
    const file = uploaded[0];

    if (!file || !file.filepath) {
      return res.status(400).json({ error: "No valid file uploaded." });
    }

    // Check if collection exists
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some((c) => c.name === COLLECTION);

    if (!exists) {
      await qdrant.createCollection(COLLECTION, {
        vectors: {
          size: VECTOR_SIZE,
          distance: "Cosine",
          on_disk: true,
        },
        hnsw_config: {
          m: 0,
        },
        optimizers_config: {
          indexing_threshold: 0,
        },
        shard_number: 2,
      });
    }

    const buffer = fs.readFileSync(file.filepath);
    const parsed = await pdfParse(buffer);
    const chunks = chunkText(parsed.text);

    const points = await Promise.all(
      chunks.map(async (chunk, idx) => {
        const vector = await getEmbedding(chunk);

        if (!vector || vector.length !== VECTOR_SIZE) {
          throw new Error(`Invalid vector length at chunk ${idx}`);
        }

        return {
          id: randomUUID(),
          vector,
          payload: {
            paperName: file.originalFilename,
            content: chunk.slice(0, 1000),
            uploadedAt: new Date().toISOString(),
          },
        };
      })
    );

    try {
        await qdrant.upsert(COLLECTION, { points, wait: true });
      } catch (err: any) {
        console.error("Qdrant Error Response:", JSON.stringify(err?.response?.data || err, null, 2));
        throw err;
      }
      
    await qdrant.upsert(COLLECTION, {
      points,
      wait: true,
    });

    // Optionally re-enable indexing after upload
    await qdrant.updateCollection(COLLECTION, {
      hnsw_config: { m: 16 },
      optimizers_config: { indexing_threshold: 20000 },
    });

    const uploadedPaperMeta = [{
      id: file.newFilename || randomUUID(),
      name: file.originalFilename,
      size: file.size,
      type: file.mimetype,
      uploadedAt: new Date().toISOString(),
    }];

    res.status(200).json(uploadedPaperMeta);
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message || "Upload failed." });
  }
}

/**
 * Splits text into chunks for better semantic processing 
 * Creates chunks with overlapping to maintain context accross the chunk boundaries 
 * 
 * @param text - The text to be chunked
 * @param size - The size of each chunk
 * @param overlap - The number of overlapping words between chunks
 * 
 * @returns An array of text chunks, where each chunk contains up to `size` words
 *          and overlaps with adjacent chunks by `overlap` words
 * 
 * @example
 * const text = "This is a long document that needs to be split into chunks..."
 * const chunks = chunkText(text, 500, 100);
 */
function chunkText(text: string, size = 500, overlap = 100): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += size - overlap) {
    chunks.push(words.slice(i, i + size).join(" "));
  }
  return chunks;
}

/**
 * Generates vector embeddings for a given text using OpenAI's embedding model
 * Uses the text-embedding-ada-002 model to create a vector representation of the text
 * 
 * @param text - The text to be embedded
 * @returns A promise that resolves to an array of numbers representing the embedding
 * 
 * @throws error if the OpenAI API call fails
 * 
 * @example
 * const text = "This is a sample text";
 * const embedding = await getEmbedding(text);
 * // embedding is a number[] of length 1536
 * 
 */
async function getEmbedding(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });
  return res.data[0].embedding;
}
