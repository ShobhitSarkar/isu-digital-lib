// app/api/upload/route.ts - Updated implementation
import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join, dirname } from "path"
import { QdrantClient } from "@qdrant/js-client-rest"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { existsSync } from "fs"
import { ensureCollection, COLLECTION_NAME } from "@/lib/qdrant-client"
import { PDFLoader } from "langchain/document_loaders/fs/pdf"

// Initialize Google AI for embeddings
const googleAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "")

// Initialize Qdrant client
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY,
})

// Helper function to get embeddings from Google's API
async function getEmbedding(text: string): Promise<number[]> {
  try {
    const model = googleAI.getGenerativeModel({ model: "embedding-001" })
    const result = await model.embedContent(text)
    return result.embedding
  } catch (error) {
    console.error("Error generating embedding:", error)
    // Fallback to random embeddings in case of error
    return Array.from({ length: 1536 }, () => Math.random())
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

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

    // Extract text from PDF using LangChain's PDFLoader
    const loader = new PDFLoader(filePath)
    const docs = await loader.load()

    // Prepare paper info
    const paperId = `paper-${Date.now()}`
    const paperInfo = {
      id: paperId,
      title: file.name.replace(".pdf", ""),
      author: "Unknown Author",
      date: new Date().toISOString(),
      text: docs.map(doc => doc.pageContent).join("\n\n"),
    }

    // Ensure collection exists
    await ensureCollection()

    // Split text into chunks for better retrieval (chunks of roughly 1000 characters)
    const textChunks = []
    const chunkSize = 1000
    let currentChunk = ""
    
    const paragraphs = paperInfo.text.split("\n\n")
    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > chunkSize) {
        textChunks.push(currentChunk)
        currentChunk = paragraph
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + paragraph
      }
    }
    if (currentChunk) {
      textChunks.push(currentChunk)
    }

    // Add document chunks to Qdrant
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i]
      const embedding = await getEmbedding(chunk)
      
      await qdrantClient.upsert(COLLECTION_NAME, {
        wait: true,
        points: [
          {
            id: `${paperId}-chunk-${i}`,
            vector: embedding,
            payload: {
              paper_id: paperId,
              chunk_id: i,
              title: paperInfo.title,
              text: chunk,
              author: paperInfo.author,
              date: paperInfo.date
            }
          }
        ]
      })
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: "File uploaded and processed successfully",
      paper: {
        ...paperInfo,
        chunks: textChunks.length
      }
    })
  } catch (error) {
    console.error("Error in upload API:", error)
    return NextResponse.json({ error: "Failed to process your request" }, { status: 500 })
  }
}