import { type NextRequest, NextResponse } from "next/server"
import { OpenAI } from "openai"
import { COLLECTION_NAME, getQdrantClient, ensureCollection } from "@/lib/qdrant-client"

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

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json()
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: "Invalid message format" }, { status: 400 })
    }

    // Ensure collection exists
    try {
      await ensureCollection()
    } catch (error) {
      console.error("Error ensuring collection:", error)
    }

    // Get Qdrant client
    const qdrantClient = getQdrantClient()
    
    // Check if collection has documents
    let hasDocuments = false
    try {
      const collectionInfo = await qdrantClient.getCollection(COLLECTION_NAME)
      hasDocuments = collectionInfo.points_count > 0
    } catch (error) {
      console.error("Error checking collection:", error)
    }
    
    // If there are documents, try semantic search
    if (hasDocuments) {
      try {
        // Generate embedding for the query
        const queryEmbedding = await getEmbedding(message)
        
        // Search for relevant document chunks
        const searchResults = await qdrantClient.search(COLLECTION_NAME, {
          vector: queryEmbedding,
          limit: 10,
          with_payload: true
        })
        
        // If we found relevant documents, use them for context
        if (searchResults.length > 0) {
          // Group chunks by paper_id for better organization
          const paperChunks: Record<string, { 
            title: string, 
            author: string, 
            chunks: Array<{text: string, score?: number, chunk_id?: number}>
          }> = {}
          
          searchResults.forEach(result => {
            const metadata = result.payload as any
            const paperId = metadata.paper_id?.toString() || "unknown"
            
            if (!paperChunks[paperId]) {
              paperChunks[paperId] = {
                title: metadata.title || metadata.original_filename || "Unknown Title",
                author: metadata.author || "Unknown Author",
                chunks: []
              }
            }
            
            paperChunks[paperId].chunks.push({
              text: metadata.text,
              score: result.score,
              chunk_id: metadata.chunk_id
            })
          })
          
          // Build context and references
          const contexts = []
          const references = []
          
          for (const paperId in paperChunks) {
            const paper = paperChunks[paperId]
            
            // Sort chunks by relevance score
            const sortedChunks = paper.chunks.sort((a, b) => (b.score || 0) - (a.score || 0))
            
            // Take top chunks from each paper (limit to prevent context overflow)
            const topChunks = sortedChunks.slice(0, 3).map(chunk => chunk.text).join("\n\n")
            
            contexts.push(`From "${paper.title}":\n${topChunks}`)
            
            // Add to references for citation
            references.push({
              id: paperId,
              title: paper.title,
              author: paper.author
            })
          }
          
          const combinedContext = contexts.join("\n\n")
          
          // Create system prompt with instructions for citation
          const systemPrompt = `You are a research assistant for Iowa State University. Your task is to provide helpful, accurate answers based on the research papers provided.

IMPORTANT GUIDELINES:
1. Only use information from the provided research papers to answer the question
2. Always cite the paper titles when referencing specific information using the format "[Paper Title]"
3. If the provided papers don't contain enough information to answer the question, acknowledge this and provide a general response
4. Be helpful, clear, and educational in your responses
5. Do not make up or hallucinate information not found in the papers`
          
          // Format messages for the API call
          const messages = [{ role: "system", content: systemPrompt }]
          
          // Add chat history for context
          if (history && Array.isArray(history) && history.length > 0) {
            // Limit history to prevent token overflow
            const recentHistory = history.slice(-6)
            messages.push(...recentHistory)
          }
          
          // Add user query with context
          messages.push({ 
            role: "user", 
            content: `Question: ${message}

Here are relevant excerpts from research papers to help you answer:

${combinedContext}

Please answer the question based on this information.`
          })
          
          // Generate response using OpenAI
          const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-16k", // Using larger context window 
            messages: messages,
            temperature: 0.7,
          })
          
          const response = completion.choices[0].message.content || "I couldn't generate a response. Please try again."
          
          return NextResponse.json({
            response,
            references
          })
        }
      } catch (error) {
        console.error("Error in semantic search:", error)
      }
    }
    
    // Fallback to general assistant if no documents or search failed
    const systemMessage = hasDocuments
      ? "You are an Iowa State University research assistant. No relevant documents were found for this query, so provide a general response."
      : "You are an Iowa State University research assistant. No documents have been uploaded to the system yet. Please provide a general response and encourage the user to upload research papers for more specific assistance."
    
    // Format messages for the API call
    const messages = [{ role: "system", content: systemMessage }]
    
    // Add chat history
    if (history && Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-6)
      messages.push(...recentHistory)
    }
    
    // Add the current message
    messages.push({ role: "user", content: message })
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
    })
    
    const response = completion.choices[0].message.content || "I couldn't generate a response. Please try again."
    
    return NextResponse.json({
      response,
      references: []
    })
  } catch (error) {
    console.error("Error in chat API:", error)
    return NextResponse.json({ 
      error: "Failed to process your request. Please try again later."
    }, { status: 500 })
  }
}