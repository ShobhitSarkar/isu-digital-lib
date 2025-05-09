// frontend/src/app/api/semantic/ingest/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'papaparse';
import { createOpenAIClient } from '@/lib/openai-config';
import { QdrantClient } from '@qdrant/js-client-rest';
import fs from 'fs';
import path from 'path';

/**
 * Helper function to create a Qdrant client safely for both build and runtime
 */
function createSafeQdrantClient() {
  // Only create a real client at runtime, not during build
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && 
      process.env.QDRANT_URL && 
      process.env.QDRANT_URL !== 'placeholder-during-build') {
    
    // Make sure URL has protocol
    const url = process.env.QDRANT_URL.startsWith('http') 
      ? process.env.QDRANT_URL 
      : `https://${process.env.QDRANT_URL}`;
      
    return new QdrantClient({
      url: url,
      apiKey: process.env.QDRANT_API_KEY,
      port: null,
      checkCompatibility: false
    });
  } else {
    // During build time or client-side, return a mock
    console.log('Creating mock Qdrant client for build');
    return {
      getCollections: async () => ({ collections: [] }),
      createCollection: async () => ({}),
      upsert: async () => ({}),
      search: async () => ([]),
      delete: async () => ({}),
    };
  }
}

/**
 * Safely create OpenAI client or return a mock during build
 */
function getSafeOpenAIClient() {
  if (process.env.NODE_ENV !== 'production' || 
      !process.env.MY_OPENAI_API_KEY || 
      process.env.MY_OPENAI_API_KEY === 'placeholder-during-build') {
    
    // Return a mock for build time
    return {
      embeddings: {
        create: async () => ({
          data: [{ embedding: new Array(1536).fill(0) }]
        })
      }
    };
  }
  
  return createOpenAIClient();
}

// Use factory functions instead of direct instantiation
const openai = getSafeOpenAIClient();
const qdrant = createSafeQdrantClient();

const COLLECTION_NAME = 'isu-semantic-search'; // name of the Qdrant collection
const VECTOR_SIZE = 1536; // Size of the embeddings from OpenAI's model

/**
 * Type definition for academic paper metadata (based on the CSV given by Dr Sukul)
 */
type PaperMetadata = {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  department: string;
  year: string;
  documentType: string;
  uri: string;
};

/**
 * Handles POST requests to ingest academic papers into the vector database
 */
export async function POST(request: NextRequest) {
  try {
    // Check if we're in build mode, return mock response
    if (process.env.NODE_ENV !== 'production' || 
        !process.env.MY_OPENAI_API_KEY || 
        process.env.MY_OPENAI_API_KEY === 'placeholder-during-build') {
      
      console.log('Build-time mock response for ingest route');
      return NextResponse.json({
        success: true,
        message: "Build-time mock response. The actual API will be available when deployed.",
        papers: 0,
      });
    }
    
    // Runtime checks for proper configuration
    if (!process.env.MY_OPENAI_API_KEY || !process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'API configuration incomplete. Check environment variables.' },
        { status: 500 }
      );
    }

    // 1. Create collection if it doesn't exist
    const collections = await qdrant.getCollections();
    if (!collections.collections.some(c => c.name === COLLECTION_NAME)) {
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine',
        },
        // Optional: Add optimizers config for better performance
        optimizers_config: {
          default_segment_number: 2,
        },
      });
      console.log(`Collection ${COLLECTION_NAME} created successfully`);
    } else {
      console.log(`Collection ${COLLECTION_NAME} already exists`);
    }

    // 2. Get CSV file from the request or use a local file
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    let csvData;
    if (file) {
      // If file is uploaded through the request
      const buffer = Buffer.from(await file.arrayBuffer());
      csvData = buffer.toString();
    } else {
      // Use a local file (for development/testing)
      try {
        const csvPath = path.join(process.cwd(), 'data', 'papers.csv');
        csvData = fs.readFileSync(csvPath, 'utf8');
      } catch (err) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'No file provided and no local file found. Please upload a CSV file.' 
          },
          { status: 400 }
        );
      }
    }

    // 3. Parse CSV
    const { data } = parse(csvData, {
      header: true,
      skipEmptyLines: true,
    });

    // 4. Transform the data to a format suitable for embedding
    const papers: PaperMetadata[] = data.map((row: any) => ({
      id: row.id || `paper-${Math.random().toString(36).substring(2, 15)}`,
      title: row['dc.title'] || '',
      authors: row['dc.contributor.author'] ? row['dc.contributor.author'].split('||') : [],
      abstract: row['dc.description.abstract'] || '',
      department: row['dc.contributor.department'] || '',
      year: row['dc.date.issued'] || '',
      documentType: row['dc.type'] || '',
      uri: row['dc.identifier.uri'] || '',
    }));

    // 5. Generate embeddings and prepare points for Qdrant
    const points = await Promise.all(
      papers.slice(0, 5).map(async (paper) => { // Limit to 5 papers for testing
        // Combine title and abstract for better semantic search
        const content = `${paper.title}. ${paper.abstract}`.substring(0, 8000);
        
        // Generate embedding using OpenAI
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: content,
        });
        
        const embedding = embeddingResponse.data[0].embedding;
        
        // Create point for Qdrant
        return {
          id: paper.id,
          vector: embedding,
          payload: {
            title: paper.title,
            authors: paper.authors,
            abstract: paper.abstract,
            department: paper.department,
            year: paper.year,
            documentType: paper.documentType,
            uri: paper.uri,
          },
        };
      })
    );

    // 6. Upload to Qdrant in batches to avoid timeout
    const BATCH_SIZE = 100;
    for (let i = 0; i < points.length; i += BATCH_SIZE) {
      const batch = points.slice(i, i + BATCH_SIZE);
      await qdrant.upsert(COLLECTION_NAME, {
        points: batch,
        wait: true,
      });
      console.log(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(points.length / BATCH_SIZE)}`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${points.length} papers`,
      papers: papers.length,
    });
  } catch (error) {
    console.error('Error during ingestion:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}