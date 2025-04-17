// src/assistant/upload/route.ts

import fs from "fs";
import pdfParse from "pdf-parse";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { writeFile } from "fs/promises";
import os from "os";

/**
 * Instantiate a openai client to connect to the OpenAI API.
 */
const openai = new OpenAI({
  apiKey: process.env.MY_OPENAI_API_KEY,
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
 * 
 * @returns Promise<NextResponse> JSON response with either:
 *   Success: Array of uploaded file metadata
 *   Error: { error: string }
 * 
 * @throws {400} If no valid file is uploaded
 * @throws {500} If processing or upload fails
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file || !file.name) {
      return NextResponse.json(
        { error: "No valid file uploaded." },
        { status: 400 }
      );
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

    // Create a temporary file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, file.name);
    
    // Convert File object to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Write to temporary file
    await writeFile(tempFilePath, buffer);

    // Parse PDF
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
            paperName: file.name,
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
    
    // Optionally re-enable indexing after upload
    await qdrant.updateCollection(COLLECTION, {
      hnsw_config: { m: 16 },
      optimizers_config: { indexing_threshold: 20000 },
    });

    // Clean up temp file
    fs.unlinkSync(tempFilePath);

    const uploadedPaperMeta = [{
      id: randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
    }];

    return NextResponse.json(uploadedPaperMeta);
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed." }, { status: 500 });
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
 */
async function getEmbedding(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });
  return res.data[0].embedding;
}