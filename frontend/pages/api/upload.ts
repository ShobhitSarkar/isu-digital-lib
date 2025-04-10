import fs from "fs";
import pdfParse from "pdf-parse";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { IncomingForm } from "formidable";
import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  port: null,
});

const COLLECTION = "academic-docs";
const VECTOR_SIZE = 1536;

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

    console.log("✅ Sample Point Object:");
    console.dir(points[0], { depth: null });
    console.log("➡️ Vector length:", points[0].vector.length);

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

    res.status(200).json({ message: "Upload and embedding complete.", chunks: points.length });
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message || "Upload failed." });
  }
}

function chunkText(text: string, size = 500, overlap = 100): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += size - overlap) {
    chunks.push(words.slice(i, i + size).join(" "));
  }
  return chunks;
}

async function getEmbedding(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });
  return res.data[0].embedding;
}
