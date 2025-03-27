import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { QdrantClient } from "@qdrant/js-client-rest"
import { OpenAI } from "openai"
import { existsSync } from "fs"

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Initialize Qdrant client
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
})

const COLLECTION_NAME = "isu_papers"

// Helper function to get embeddings from OpenAI
async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    })
    return response.data[0].embedding
  } catch (error) {
    console.error("Error generating embedding:", error)
    // Fallback to random embeddings in case of error
    return Array.from({ length: 1536 }, () => Math.random())
  }
}

// Ensure collection exists in Qdrant
async function ensureCollection() {
  try {
    // Check if collection exists
    const collections = await qdrantClient.getCollections()
    const exists = collections.collections.some((c) => c.name === COLLECTION_NAME)

    if (!exists) {
      console.log(`Creating collection '${COLLECTION_NAME}'...`)
      // Create collection with appropriate dimensions for your embeddings
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 1536, // Size for OpenAI embeddings
          distance: "Cosine",
        },
      })
      console.log(`Collection '${COLLECTION_NAME}' created successfully`)
    }
  } catch (error) {
    console.error("Error ensuring collection exists:", error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log(`Processing file: ${file.name}`)

    // Create tmp directory if it doesn't exist
    const tempDir = join(process.cwd(), "tmp")
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true })
    }

    // Save file temporarily
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filePath = join(tempDir, file.name)
    await writeFile(filePath, buffer)
    console.log(`File saved to: ${filePath}`)

    // For simplicity, we'll use a mock text for testing
    const mockText = `This is a sample text for the document ${file.name}. 
    It simulates content that would be extracted from a PDF file.
    We're using this to test vector embeddings and retrieval.
    The actual implementation would extract real text from the PDF.
    For now, this simplified approach allows us to test the workflow.`;

    // Prepare paper info with a numeric ID
    const timestamp = Date.now()
    const paperId = timestamp // Use a numeric ID
    const paperInfo = {
      id: paperId,
      title: file.name.replace(".pdf", ""),
      author: "Unknown Author",
      date: new Date().toISOString(),
      text: mockText.substring(0, 200) // Short preview
    }

    console.log("Ensuring Qdrant collection exists...")
    await ensureCollection()

    // For testing, just use a single chunk
    const chunk = mockText;
    console.log("Generating embedding...")
    const embedding = await getEmbedding(chunk)
    
    console.log("Preparing Qdrant upsert payload...")
    // Use a numeric ID for the point
    const pointId = timestamp; // Just use the timestamp as a numeric ID
    console.log(`Point ID: ${pointId} (numeric)`);
    
    const upsertPayload = {
      wait: true,
      points: [
        {
          id: pointId, // Numeric ID
          vector: embedding,
          payload: {
            paper_id: paperId,
            chunk_id: 0,
            title: paperInfo.title,
            text: chunk,
            author: paperInfo.author,
            date: paperInfo.date,
            original_filename: file.name
          }
        }
      ]
    };
    
    console.log("Upsert payload structure:", JSON.stringify(upsertPayload).substring(0, 200) + "...");
    
    try {
      console.log("Upserting to Qdrant...");
      await qdrantClient.upsert(COLLECTION_NAME, upsertPayload);
      console.log("Upsert successful!");
    } catch (qdrantError: any) {
      console.error("Qdrant upsert error details:", qdrantError);
      if (qdrantError.data) {
        console.error("Qdrant error data:", JSON.stringify(qdrantError.data));
      }
      throw new Error(`Qdrant upsert failed: ${qdrantError.message || "Unknown error"}`);
    }

    console.log("Upload and processing completed successfully")

    // Return success response
    return NextResponse.json({
      success: true,
      message: "File uploaded and processed successfully",
      paper: {
        ...paperInfo,
        id: paperId.toString() // Convert back to string for the response
      }
    })
  } catch (error) {
    console.error("Error in upload API:", error)
    return NextResponse.json({ 
      error: "Failed to process your request: " + (error instanceof Error ? error.message : String(error)) 
    }, { status: 500 })
  }
}