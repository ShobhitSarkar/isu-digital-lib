import { QdrantClient } from "@qdrant/js-client-rest"

// Singleton pattern for Qdrant client
let qdrantClient: QdrantClient | null = null

export function getQdrantClient(): QdrantClient {
  if (!qdrantClient) {
    qdrantClient = new QdrantClient({
      url: process.env.QDRANT_URL || "http://localhost:6333",
      apiKey: process.env.QDRANT_API_KEY,
    })
  }
  return qdrantClient
}

export const COLLECTION_NAME = "isu_papers"

export async function ensureCollection() {
  const client = getQdrantClient()

  try {
    // Check if collection exists
    const collections = await client.getCollections()
    const exists = collections.collections.some((c) => c.name === COLLECTION_NAME)

    if (!exists) {
      // Create collection with appropriate dimensions
      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 1536, // Adjust based on your embedding model
          distance: "Cosine",
        },
      })
      console.log(`Collection ${COLLECTION_NAME} created`)
    }
  } catch (error) {
    console.error("Error ensuring collection exists:", error)
    throw error
  }
}

