// src/app/api/ingest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'papaparse';
import OpenAI from 'openai';
import { QdrantClient } from '@qdrant/js-client-rest';
import fs from 'fs';
import path from 'path';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Qdrant
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  port: null,
});

// Collection settings
const COLLECTION_NAME = 'academic-papers';
const VECTOR_SIZE = 1536; // For OpenAI ada-002 embeddings

// Field definitions from your CSV
type PaperMetadata = {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  department: string;
  year: string;
  documentType: string;
  uri: string;
  // Add other relevant fields
};

export async function POST(request: NextRequest) {
  try {
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
      const csvPath = path.join(process.cwd(), 'data', 'papers.csv');
      csvData = fs.readFileSync(csvPath, 'utf8');
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
      papers.map(async (paper) => {
        // Combine title and abstract for better semantic search
        const content = `${paper.title}. ${paper.abstract}`;
        
        // Generate embedding using OpenAI
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
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
      console.log(`Processed batch ${i / BATCH_SIZE + 1} of ${Math.ceil(points.length / BATCH_SIZE)}`);
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