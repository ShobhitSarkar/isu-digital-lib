import { type NextRequest, NextResponse } from "next/server"
import { COLLECTION_NAME, getQdrantClient } from "@/lib/qdrant-client"

// Helper function to get embeddings (placeholder)
async function getEmbedding(text: string): Promise<number[]> {
  // For production, you would use a proper embedding model
  // This is a placeholder that returns random embeddings
  return Array.from({ length: 1536 }, () => Math.random())
}

export async function POST(request: NextRequest) {
  try {
    const { query, filters = {} } = await request.json()

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    // Get query embedding
    const queryEmbedding = await getEmbedding(query)

    // Search in Qdrant
    const client = getQdrantClient()
    const searchResults = await client.search(COLLECTION_NAME, {
      vector: queryEmbedding,
      limit: 10,
      with_payload: true,
      filter: buildQdrantFilter(filters),
    })

    // Format results for frontend
    const formattedResults = searchResults.map((result) => {
      const payload = result.payload as any
      return {
        id: result.id,
        title: payload.title || "Unknown Title",
        author: payload.author || "Unknown Author",
        date: payload.date || new Date().toISOString(),
        summary: payload.summary || generateSnippet(payload.text || "", query),
        department: payload.department || "General",
        type: payload.type || "Research Paper",
        relevance: result.score || 0.5,
      }
    })

    return NextResponse.json({ results: formattedResults })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Failed to process your search" }, { status: 500 })
  }
}

// Helper function to build Qdrant filter
function buildQdrantFilter(filters: Record<string, any>) {
  const filterConditions = []

  if (filters.department) {
    filterConditions.push({
      key: "department",
      match: { value: filters.department },
    })
  }

  if (filters.type) {
    filterConditions.push({
      key: "type",
      match: { value: filters.type },
    })
  }

  if (filters.dateFrom || filters.dateTo) {
    const dateFilter: any = { key: "date" }

    if (filters.dateFrom && filters.dateTo) {
      dateFilter.range = {
        gte: filters.dateFrom,
        lte: filters.dateTo,
      }
    } else if (filters.dateFrom) {
      dateFilter.range = { gte: filters.dateFrom }
    } else if (filters.dateTo) {
      dateFilter.range = { lte: filters.dateTo }
    }

    filterConditions.push(dateFilter)
  }

  if (filterConditions.length === 0) {
    return null
  }

  return {
    must: filterConditions,
  }
}

// Helper function to generate a snippet from text
function generateSnippet(text: string, query: string): string {
  // Simple implementation to find a relevant snippet
  // In production, you would use more sophisticated methods

  // Convert to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()

  // Try to find the query in the text
  const index = lowerText.indexOf(lowerQuery)

  if (index !== -1) {
    // Get a window of text around the query
    const start = Math.max(0, index - 100)
    const end = Math.min(text.length, index + query.length + 100)
    return text.substring(start, end) + "..."
  }

  // If query not found, return the beginning of the text
  return text.substring(0, 200) + "..."
}

