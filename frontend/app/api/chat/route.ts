import { type NextRequest, NextResponse } from "next/server"
import { OpenAI } from "openai"
import { QdrantClient } from "@qdrant/js-client-rest"

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

export async function POST(request: NextRequest) {
  try {
    console.log("Chat API called")
    const { message } = await request.json()
    console.log("Received message:", message)

    // Check if Qdrant is accessible and collection exists
    let useQdrant = false
    let collections: any = []
    
    try {
      console.log("Checking Qdrant connection...")
      const collectionsResponse = await qdrantClient.getCollections()
      collections = collectionsResponse.collections
      
      // Check if our specific collection exists
      const collectionExists = collections.some((c: any) => c.name === COLLECTION_NAME)
      console.log(`Collection '${COLLECTION_NAME}' exists: ${collectionExists}`)
      
      useQdrant = collectionExists
    } catch (e) {
      console.error("Qdrant connection error:", e)
    }

    // If Qdrant is available and collection exists, try to use it
    if (useQdrant) {
      try {
        console.log("Generating embedding for query...")
        const queryEmbedding = await getEmbedding(message)
        
        console.log("Searching Qdrant for relevant documents...")
        const searchResults = await qdrantClient.search(COLLECTION_NAME, {
          vector: queryEmbedding,
          limit: 5,
          with_payload: true,
        })
        
        console.log(`Found ${searchResults.length} relevant documents`)
        
        // If we found relevant documents, use them for context
        if (searchResults.length > 0) {
          // Extract contexts from search results
          const contexts = searchResults.map((result) => {
            const metadata = result.payload as any
            return `From ${metadata.title || "Unknown Paper"}:\n${metadata.text}`
          })
          
          const combinedContext = contexts.join("\n\n")
          console.log("Combined context length:", combinedContext.length)
          
          // Create prompt with context
          const prompt = `Based on the following information from research papers, please answer this question:
          
          Question: ${message}
          
          Relevant sections from papers:
          ${combinedContext}
          
          Please provide a comprehensive response that incorporates information from the relevant papers. Cite the paper titles when referencing specific information.`
          
          // Generate response using OpenAI with context
          const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: "You are a research assistant. Provide helpful, detailed answers based on the research papers provided." },
              { role: "user", content: prompt }
            ],
          })
          
          const response = completion.choices[0].message.content || "No response generated"
          
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
          
          console.log("Successfully generated response with Qdrant context")
          return NextResponse.json({
            response,
            references
          })
        }
      } catch (qdrantError) {
        console.error("Error using Qdrant:", qdrantError)
        // Fall through to non-Qdrant response if there's an error
      }
    }
    
    // If Qdrant is not available or there was an error, use OpenAI directly
    console.log("Using OpenAI without Qdrant context")
    let systemMessage = "You are a helpful research assistant."
    
    if (collections.length === 0) {
      systemMessage += " No documents have been uploaded to the system yet. You can only provide general information."
    } else {
      systemMessage += " No relevant documents were found for this query."
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: message }
      ],
    })
    
    const response = completion.choices[0].message.content || "No response generated"
    console.log("Generated response without Qdrant context")
    
    return NextResponse.json({
      response,
      references: []
    })
  } catch (error) {
    console.error("General error in chat API:", error)
    return NextResponse.json({ 
      error: "Failed to process your request: " + (error instanceof Error ? error.message : String(error)) 
    }, { status: 500 })
  }
}