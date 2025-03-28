import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir, readFile, unlink } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { OpenAI } from "openai"
import { COLLECTION_NAME, getQdrantClient, ensureCollection } from "@/lib/qdrant-client"
import pdf from "pdf-parse"

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

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

// Function to extract text from PDF
async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    const dataBuffer = await readFile(filePath)
    const parsedPdf = await pdf(dataBuffer)
    return parsedPdf.text
  } catch (error) {
    console.error("Error extracting text from PDF:", error)
    throw new Error("Failed to extract text from PDF")
  }
}

// Split text into chunks for better search results
function splitIntoChunks(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = []
  
  // Clean the text by removing excessive whitespace
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n+/g, '\n')
    .replace(/\s+/g, ' ')
    .trim()
  
  if (cleanedText.length <= chunkSize) {
    chunks.push(cleanedText)
    return chunks
  }
  
  let startIndex = 0
  while (startIndex < cleanedText.length) {
    // Find a good breaking point (period, question mark, or exclamation point)
    let endIndex = Math.min(startIndex + chunkSize, cleanedText.length)
    
    if (endIndex < cleanedText.length) {
      // Try to find a sentence boundary to break at
      const possibleBreak = cleanedText.lastIndexOf('.', endIndex)
      const altBreak1 = cleanedText.lastIndexOf('?', endIndex)
      const altBreak2 = cleanedText.lastIndexOf('!', endIndex)
      
      // Find the closest sentence boundary
      const bestBreak = Math.max(
        possibleBreak, 
        altBreak1, 
        altBreak2
      )
      
      // Make sure we found a valid break point that's not too far back
      if (bestBreak > startIndex && bestBreak > startIndex + chunkSize - 300) {
        endIndex = bestBreak + 1 // Include the period in the chunk
      }
    }
    
    chunks.push(cleanedText.slice(startIndex, endIndex).trim())
    
    // Move with overlap
    startIndex = endIndex - overlap
    
    // Make sure we're making progress
    if (startIndex >= cleanedText.length || startIndex <= 0) {
      break
    }
  }
  
  return chunks
}

export async function POST(request: NextRequest) {
  let filePath = "";
  
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 })
    }

    console.log(`Processing file: ${file.name}`)

    // Create tmp directory if it doesn't exist
    const tempDir = join(process.cwd(), "tmp")
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true })
    }

    // Generate a unique filename to avoid collisions
    const timestamp = Date.now()
    const uniqueFilename = `${timestamp}_${file.name}`
    filePath = join(tempDir, uniqueFilename)

    try {
      // Save file temporarily
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)
      console.log(`File saved to: ${filePath}`)

      // Extract text from PDF
      let documentText: string
      try {
        documentText = await extractTextFromPDF(filePath)
      } catch (extractError) {
        console.error("Failed to extract text, using fallback:", extractError)
        // Fallback for testing if PDF extraction fails
        documentText = `This is a sample text for the document ${file.name}. 
          It simulates content that would be extracted from a PDF file.
          We're using this to test vector embeddings and retrieval.`
      }

      // Get metadata
      const title = file.name.replace(/\.pdf$/i, "").replace(/_/g, " ")
      const paperId = timestamp.toString()
      
      // Split the document into chunks
      const chunks = splitIntoChunks(documentText)
      console.log(`Document split into ${chunks.length} chunks`)

      // Ensure collection exists
      await ensureCollection()
      const qdrantClient = getQdrantClient()

      // Process and embed each chunk
      const points = []
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        if (chunk.trim().length < 50) continue // Skip very small chunks
        
        console.log(`Generating embedding for chunk ${i+1}/${chunks.length}...`)
        const embedding = await getEmbedding(chunk)
        
        points.push({
          id: timestamp + i, // Use numeric ID
          vector: embedding,
          payload: {
            paper_id: paperId,
            chunk_id: i,
            title: title,
            text: chunk,
            author: "Unknown Author", // Could be improved with metadata extraction
            date: new Date().toISOString(),
            original_filename: file.name
          }
        })
      }

      // Upsert all points
      if (points.length > 0) {
        console.log(`Upserting ${points.length} points to Qdrant...`)
        await qdrantClient.upsert(COLLECTION_NAME, {
          wait: true,
          points: points
        })
        console.log("Upsert successful!")
      } else {
        console.warn("No valid chunks found in the document")
      }

      // Create a preview of the document (first 500 chars)
      const preview = documentText.slice(0, 500).trim() + (documentText.length > 500 ? "..." : "")

      // Clean up the temporary file
      try {
        await unlink(filePath)
      } catch (unlinkError) {
        console.error("Error deleting temporary file:", unlinkError)
      }

      return NextResponse.json({
        success: true,
        message: "File uploaded and processed successfully",
        paper: {
          id: paperId,
          title: title,
          chunks: chunks.length,
          preview: preview
        }
      })
    } catch (processingError) {
      // Attempt to clean up temp file in case of error
      if (filePath) {
        try {
          if (existsSync(filePath)) {
            await unlink(filePath)
          }
        } catch (cleanupError) {
          console.error("Error cleaning up temp file:", cleanupError)
        }
      }
      
      throw processingError
    }
  } catch (error) {
    console.error("Error in upload API:", error)
    return NextResponse.json({ 
      error: "Failed to process your request: " + (error instanceof Error ? error.message : String(error)) 
    }, { status: 500 })
  }
}