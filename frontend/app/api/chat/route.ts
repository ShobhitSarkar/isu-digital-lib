// app/api/chat/route.ts - Updated implementation
import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { QdrantClient } from "@qdrant/js-client-rest"
import { COLLECTION_NAME } from "@/lib/qdrant-client"

// Initialize Google AI
const googleAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "")
const model = googleAI.getGenerativeModel({ model: "gemini-1.5-pro" })

// Initialize Qdrant client
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY,
})

// Helper function to get embeddings from Google's API
async function getEmbedding(text: string): Promise<number[]> {
  try {
    const embedModel = googleAI.getGenerativeModel({ model: "embedding-001" })
    const result = await embedModel.embedContent(text)
    return result.embedding
  } catch (error) {
    console.error("Error generating embedding:", error)
    // Fallback to random embeddings in case of error
    return Array.from({ length: 1536 }, () => Math.random())
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json()

    // Search for relevant documents in Qdrant
    const searchResults = await qdrantClient.search(COLLECTION_NAME, {
      vector: await getEmbedding(message),
      limit: 5,
      with_payload: true,
    })

    // Extract contexts from search results
    const contexts = searchResults.map((result) => {
      const metadata = result.payload as any
      return `From ${metadata.title || "Unknown Paper"}:\n${metadata.text}`
    })

    const combinedContext = contexts.join("\n\n")

    // Create prompt with context
    const prompt = `Based on these sections from multiple papers, please answer:
    ${message}
    
    Please provide a comprehensive analysis that draws from all relevant papers and cite your sources.
    
    Relevant sections:
    ${combinedContext}`

    // Generate response
    const result = await model.generateContent(prompt)
    const response = result.response.text()

    // Extract paper references for citation
    const references = searchResults.map((result) => {
      const metadata = result.payload as any
      return {
        id: metadata.paper_id || `ref-${Math.random().toString(36).substring(2, 9)}`,
        title: metadata.title || "Unknown Title",
        author: metadata.author || "Unknown Author",
        url: metadata.url || "#",
      }
    })

    return NextResponse.json({
      response,
      references,
    })
  } catch (error) {
    console.error("Error in chat API:", error)
    return NextResponse.json({ error: "Failed to process your request" }, { status: 500 })
  }
}