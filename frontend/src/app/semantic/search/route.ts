// src/app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAI } from 'openai';

// Collection settings
const COLLECTION_NAME = 'academic-papers';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    });

    // Generate embedding for query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
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