// src/app/api/assistant/upload/route.ts

import { NextRequest, NextResponse } from "next/server";
import { QdrantClient } from "@qdrant/js-client-rest";
import { createOpenAIClient } from "@/lib/openai-config";
import { randomUUID } from "crypto";
import { ensureProtocol } from "@/lib/utils";

/**
 * OpenAI client instance to connect to the OpenAI API.
 */
const openai = createOpenAIClient();


/**
 * Qdrant client instance to connect to the Qdrant server.
 */
const qdrant = new QdrantClient({
  url: ensureProtocol(process.env.QDRANT_URL),
  apiKey: process.env.QDRANT_API_KEY,
  port: null,
  checkCompatibility: false
});

/**
 * Helper function to check if required API keys are available at runtime
 * Returns an appropriate error response if keys are missing
 */
function checkRequiredKeys() {
  const missingKeys = [];
  
  if (!process.env.MY_OPENAI_API_KEY) {
    missingKeys.push('MY_OPENAI_API_KEY');
  }
  
  if (!process.env.QDRANT_URL) {
    missingKeys.push('QDRANT_URL');
  }
  
  if (!process.env.QDRANT_API_KEY) {
    missingKeys.push('QDRANT_API_KEY');
  }
  
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

const COLLECTION = "academic-docs"; // name of the Qdrant collection
const VECTOR_SIZE = 1536; // size of the vector embeddings from OpenAI's model

/**
 * Handles document uploads with extracted text, processes for vector search, and stores in Qdrant.
 */
export async function POST(request: NextRequest) {
  console.log("Upload route called");

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
    console.log("QDRANT_URL:", process.env.QDRANT_URL ? "Set" : "Not set");
    console.log("QDRANT_API_KEY:", process.env.QDRANT_API_KEY ? "Set" : "Not set");
    console.log("MY_OPENAI_API_KEY:", process.env.MY_OPENAI_API_KEY ? "Set" : "Not set");
    
    // Get the file data from the request body
    const body = await request.json();
    const { filename, fileSize, fileType, extractedText } = body;
    
    if (!filename || !extractedText) {
      console.error("Missing required fields in request");
      return NextResponse.json(
        { error: "Missing required fields (filename or extractedText)" },
        { status: 400 }
      );
    }
    
    console.log(`Processing file: ${filename}, Size: ${fileSize}, Type: ${fileType}`);
    console.log(`Extracted text length: ${extractedText.length} characters`);

    // Validate and sanitize the text
    const sanitizedText = sanitizeText(extractedText);
    
    if (!isValidText(sanitizedText)) {
      console.error("Invalid or non-textual content detected");
      return NextResponse.json(
        { error: "The content appears to be non-textual or corrupted. Please ensure the PDF contains proper text content." },
        { status: 400 }
      );
    }
    
    console.log("Text validation passed. Sample of sanitized text:", sanitizedText.substring(0, 200) + "...");

    // Check if collection exists
    console.log("Checking if collection exists...");
    try {
      const collections = await qdrant.getCollections();
      const exists = collections.collections.some((c) => c.name === COLLECTION);
      console.log("Collection exists:", exists);

      if (!exists) {
        console.log("Creating collection...");
        await qdrant.createCollection(COLLECTION, {
          vectors: {
            size: VECTOR_SIZE,
            distance: "Cosine",
          },
          optimizers_config: {
            default_segment_number: 2,
          },
        });
        console.log("Collection created successfully");
      }
    } catch (error) {
      console.error("Error checking/creating collection:", error);
      return NextResponse.json(
        { error: "Failed to check or create Qdrant collection" },
        { status: 500 }
      );
    }
    
    // Initialize the upload metadata
    const uploadId = randomUUID();
    const uploadedPaperMeta = {
      id: uploadId,
      name: filename,
      size: fileSize,
      type: fileType,
      uploadedAt: new Date().toISOString(),
    };

    // Split text into chunks
    const chunks = chunkText(sanitizedText);
    console.log("Split text into", chunks.length, "chunks");
    
    if (chunks.length === 0) {
      console.warn("Warning: No valid chunks created from the extracted text");
      return NextResponse.json(
        { error: "Could not process the PDF content. The PDF might be empty or contain no extractable text." },
        { status: 400 }
      );
    }
    
    // Process chunks and create embeddings
    const allPoints = [];
    
    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`Processing chunk ${i+1}/${chunks.length}, length: ${chunk.length} chars`);
        
        // Generate embedding
        try {
          const vector = await getEmbedding(chunk);
          
          // Create point for Qdrant
          allPoints.push({
            id: randomUUID(),
            vector,
            payload: {
              paperName: filename,
              content: chunk,
              uploadedAt: new Date().toISOString(),
              paperId: uploadId,
            },
          });
          
          console.log(`Successfully embedded chunk ${i+1}`);
        } catch (embedError) {
          console.error(`Error embedding chunk ${i+1}:`, embedError);
          // Continue with other chunks even if one fails
        }
      }
    } catch (error) {
      console.error("Error processing chunks:", error);
      return NextResponse.json(
        { error: "Failed to generate embeddings from the PDF content" },
        { status: 500 }
      );
    }
    
    // Upload points to Qdrant
    if (allPoints.length > 0) {
      try {
        console.log(`Uploading ${allPoints.length} points to Qdrant`);
        
        // Split uploads into batches to avoid request size limits
        const BATCH_SIZE = 100;
        for (let i = 0; i < allPoints.length; i += BATCH_SIZE) {
          const batch = allPoints.slice(i, Math.min(i + BATCH_SIZE, allPoints.length));
          await qdrant.upsert(COLLECTION, {
            points: batch,
            wait: true,
          });
          console.log(`Uploaded batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allPoints.length / BATCH_SIZE)}`);
        }
        
        console.log(`Successfully processed ${allPoints.length} chunks`);
      } catch (error) {
        console.error("Error uploading to Qdrant:", error);
        return NextResponse.json(
          { error: "Failed to upload vectors to Qdrant" },
          { status: 500 }
        );
      }
    } else {
      console.error("No points to upload");
      return NextResponse.json(
        { error: "Failed to generate embeddings from the PDF content." },
        { status: 500 }
      );
    }
    
    // Return the paper metadata
    console.log("Returning paper metadata:", uploadedPaperMeta);
    return NextResponse.json([uploadedPaperMeta]);
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err.message || "Upload failed." },
      { status: 500 }
    );
  }
}

/**
 * Splits text into chunks for better semantic processing 
 * Creates chunks with overlapping to maintain context across the chunk boundaries 
 */
function chunkText(text: string, size = 500, overlap = 100): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }
  
  // Clean the text before chunking
  const cleanedText = text.trim();
  
  if (cleanedText.length === 0) {
    return [];
  }
  
  const words = cleanedText.split(/\s+/);
  const chunks: string[] = [];
  
  for (let i = 0; i < words.length; i += size - overlap) {
    const chunk = words.slice(i, i + size).join(" ");
    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }
  }
  
  return chunks;
}

/**
 * Sanitizes text by removing non-printable characters and normalizing whitespace
 */
function sanitizeText(text: string): string {
  if (!text) return "";
  
  return text
    // Replace non-printable or control characters
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    // Replace multiple spaces with a single space
    .replace(/\s+/g, ' ')
    // Replace multiple line breaks with a double line break
    .replace(/\n+/g, '\n\n')
    // Trim whitespace
    .trim();
}

/**
 * Validates if the text appears to be actual text content rather than binary data
 */
/**
 * Validates if the text appears to be actual text content rather than binary data
 * Uses a more lenient approach for academic papers which may contain special characters
 */
function isValidText(text: string): boolean {
  if (!text || text.trim().length < 20) { // Reduced minimum length
    console.log("Text validation failed: Text too short");
    return false;
  }
  
  // Check for some sensible word patterns - look for common words
  const commonWords = /\b(the|and|of|to|in|is|for|with|by|on|at|as|this|that|research|study|data|results|method)\b/gi;
  const hasCommonWords = commonWords.test(text);
  
  if (!hasCommonWords) {
    console.log("Text validation failed: No common words found");
    return false;
  }
  
  // Accept the text if it has common words and a reasonable length
  return true;
}

/**
 * Generates vector embeddings for a given text using OpenAI's embedding model
 * Includes retry logic for transient API errors
 */
async function getEmbedding(text: string, retries = 3): Promise<number[]> {
  try {
    // Ensure text isn't too long for the API and is not empty
    if (!text || text.trim().length === 0) {
      throw new Error("Cannot embed empty text");
    }
    
    // Further sanitize the text for the embedding API
    const sanitized = text
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/\s+/g, ' ')                          // Normalize whitespace
      .trim();
      
    const truncatedText = sanitized.slice(0, 8000);
    
    // Log a sample of what we're sending to OpenAI
    console.log("Embedding sample:", truncatedText.substring(0, 100) + "...");
    
    // Generate the embedding
    const res = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: truncatedText,
    });
    
    if (!res.data || !res.data[0] || !res.data[0].embedding) {
      throw new Error("Invalid response format from OpenAI API");
    }
    
    return res.data[0].embedding;
  } catch (error: any) {
    console.error("Embedding error:", error.message);
    
    // If we still have retries left and this is a potentially transient error
    if (retries > 0 && (
      error.status === 429 || // Rate limit
      error.status === 500 || // Server error
      error.status === 503 || // Service unavailable
      error.message?.includes('timeout')
    )) {
      console.log(`Embedding generation failed, retrying (${retries} attempts left)...`);
      // Exponential backoff: wait longer between each retry
      const delay = (4 - retries) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return getEmbedding(text, retries - 1);
    }
    
    // If out of retries or not a retriable error, rethrow
    throw error;
  }
}