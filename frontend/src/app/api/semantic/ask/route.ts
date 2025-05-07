// frontend/src/app/api/semantic/ask/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { QdrantClient } from '@qdrant/js-client-rest';
import { createOpenAIClient } from '@/lib/openai-config';
import { ensureProtocol } from '@/lib/utils';

/**
 * Name of the Qdrant collection containing the paper embeddings 
 */
const COLLECTION_NAME = 'isu-semantic-search';

/**
 * OpenAI client instance to connect to the OpenAI API.
 */
const openai = createOpenAIClient();


/**
 * API endpoint handler for semantic search and question answering
 * Uses embeddings and GPT to find and analyze relevant academic papers
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

    console.log(`Processing question: "${query}"`);

    // Check if API key is available
    if (!process.env.MY_OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured correctly' },
        { status: 500 }
      );
    }

    // Initialize Qdrant client
    const qdrant = new QdrantClient({
      url: ensureProtocol(process.env.QDRANT_URL),
      apiKey: process.env.QDRANT_API_KEY,
      port: null,
      checkCompatibility: false
    });

    // 1. Generate embedding for query using text-embedding-3-small
    try {
      console.log(`Generating embedding for query: "${query.substring(0, 30)}..."`);
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
        encoding_format: "float"
      });

      const embedding = embeddingResponse.data[0].embedding;
      console.log(`Generated embedding with dimension: ${embedding.length}`);

      // 2. Search Qdrant for relevant papers
      const searchResults = await qdrant.search(COLLECTION_NAME, {
        vector: embedding,
        limit: 5, // Get top 5 most relevant papers
        with_payload: true,
      });

      console.log(`Found ${searchResults.length} relevant papers`);

      // 3. Prepare context from the search results
      const context = searchResults.map((result, index) => {
        return `Document ${index + 1}:
        Title: ${result.payload.title}
        Authors: ${result.payload.authors ? result.payload.authors.join(', ') : 'Unknown'}
        Year: ${result.payload.year || 'n.d.'}
        Abstract: ${result.payload.abstract}`;
      }).join('\n\n');

      // 4. Generate answer using GPT model
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", 
        messages: [
          {
            role: "system",
            content: `You are a research assistant. Your task is to answer questions based on the provided academic papers.
  For each part of your answer that uses information from the provided documents, include a citation in the format [Doc X] where X is the document number.
  Be concise and directly answer the question based only on the provided documents. If the documents don't contain relevant information to answer the question, state that clearly.`
          },
          {
            role: "user",
            content: `Here are some academic papers:
  ${context}

  Based on these papers, please answer the following question: ${query}`
          }
        ],
        temperature: 0.3,
      });

      const answer = completion.choices[0].message.content;

      // 5. Format the search results as citations
      const citations = searchResults.map(result => {
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

      return NextResponse.json({ 
        answer, 
        citations
      });
    } catch (embeddingError) {
      console.error('Error generating embedding:', embeddingError);
      return NextResponse.json(
        { error: 'Failed to generate embedding', message: embeddingError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in ask API:', error);
    return NextResponse.json(
      { error: 'Failed to generate answer', message: error.message },
      { status: 500 }
    );
  }
}