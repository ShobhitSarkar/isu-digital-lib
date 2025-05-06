// frontend/src/app/api/semantic/search/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAI } from 'openai';

// name of the Qdrant collection containing the paper embeddings
const COLLECTION_NAME = 'isu-semantic-search';

/**
 * OpenAI client instance to connect to the OpenAI API.
 */
const openai = new OpenAI({
  apiKey: process.env.MY_OPENAI_API_KEY,
});

/**
 * Semantic search endpoint for academic papers
 * Converts search query to embedding and finds similar papers in vector database
 * 
 * @param request - Next.js API request
 *   @param {string} request.body.query - The search query to find relevant papers
 * 
 * @returns {Promise<NextResponse>} JSON response with either:
 *   Success: {
 *     results: Array<{
 *       id: string,          // Unique identifier
 *       score: number,       // Similarity score
 *       title: string,       // Paper title
 *       authors: string[],   // List of authors
 *       abstract: string,    // Paper abstract
 *       department: string,  // Academic department
 *       year: string,       // Publication year
 *       documentType: string,// Type of document
 *       uri: string,        // Access URI
 *       citation: string    // APA format citation
 *     }>
 *   }
 *   Error: { 
 *     error: string, 
 *     message?: string 
 *   }
 * 
 * @throws {400} If query parameter is missing or invalid
 * @throws {500} If search operation fails
 * 
 * @example
 * POST /api/semantic/search
 * {
 *   "query": "machine learning applications in software engineering"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Invalid query parameter' },
        { status: 400 }
      );
    }

    console.log(`Processing search query: "${query}"`);

    // Initialize Qdrant client
    const qdrant = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      port: null,
      checkCompatibility: false
    });

    // Generate embedding for query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
      encoding_format: "float"
    });

    const embedding = embeddingResponse.data[0].embedding;
    console.log(`Generated embedding with dimension: ${embedding.length}`);

    // Search Qdrant
    const searchResults = await qdrant.search(COLLECTION_NAME, {
      vector: embedding,
      limit: 5,
      with_payload: true,
    });

    console.log(`Found ${searchResults.length} results`);

    // Format results with citations
    const formattedResults = searchResults.map(result => {
      // Extract author information
      const authors = result.payload.authors && result.payload.authors.length > 0
        ? result.payload.authors.join(', ')
        : 'Unknown Author';
      
      // Extract year
      const year = result.payload.year || 'n.d.';
      
      // Generate citation (APA style)
      const citation = `${authors} (${year}). ${result.payload.title}. ${result.payload.department}.`;
      
      return {
        id: result.id,
        score: result.score,
        title: result.payload.title,
        authors: result.payload.authors,
        abstract: result.payload.abstract,
        department: result.payload.department,
        year: result.payload.year,
        documentType: result.payload.documentType,
        uri: result.payload.uri,
        citation: citation
      };
    });

    return NextResponse.json({ results: formattedResults });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed', message: error.message },
      { status: 500 }
    );
  }
}