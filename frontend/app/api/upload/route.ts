import { type NextRequest, NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import { join } from "path"
import { QdrantClient } from "@qdrant/js-client-rest"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize Google AI for embeddings
const googleAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "")

// Initialize Qdrant client
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY,
})

const COLLECTION_NAME = "isu_papers"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Save file temporarily
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const tempDir = join(process.cwd(), "tmp")
    const filePath = join(tempDir, file.name)

    await writeFile(filePath, buffer)

    // Process the PDF (in a real implementation, you would use pdfplumber or similar)
    // For this example, we'll simulate the processing
    const paperInfo = {
      id: `paper-${Date.now()}`,
      title: file.name.replace(".pdf", ""),
      author: "Unknown Author",
      date: new Date().toISOString(),
      text: "Simulated extracted text from PDF",
    }

    // In a real implementation, you would:
    // 1. Extract text from PDF
    // 2. Split into chunks
    // 3. Generate embeddings for each chunk
    // 4. Store in Qdrant

    // Simulate adding to Qdrant
    await ensureCollection()

    // Return success response
    return NextResponse.json({
      success: true,
      message: "File uploaded and processed successfully",
      paper: paperInfo,
    })
  } catch (error) {
    console.error("Error in upload API:", error)
    return NextResponse.json({ error: "Failed to process your request" }, { status: 500 })
  }
}

// Helper function to ensure collection exists
async function ensureCollection() {
  try {
    // Check if collection exists
    const collections = await qdrantClient.getCollections()
    const exists = collections.collections.some((c) => c.name === COLLECTION_NAME)

    if (!exists) {
      // Create collection with appropriate dimensions for your embeddings
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 1536, // Adjust based on your embedding model
          distance: "Cosine",
        },
      })
    }
  } catch (error) {
    console.error("Error ensuring collection exists:", error)
    throw error
  }
}

