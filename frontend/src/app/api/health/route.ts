// src/app/api/health/route.ts
import { NextResponse } from "next/server";
import { QdrantClient } from "@qdrant/js-client-rest";
import { createOpenAIClient } from "@/lib/openai-config";

/**
 * Helper function to check if required API keys are available at runtime
 * Returns an appropriate error response if keys are missing
 */
function checkRequiredKeys() {
  const missingKeys = [];
  
  if (!process.env.MY_OPENAI_API_KEY) {
    missingKeys.push('MY_OPENAI_API_KEY');
  }
  
  if (!process.env.QDRANT_URL) {
    missingKeys.push('QDRANT_URL');
  }
  
  if (!process.env.QDRANT_API_KEY) {
    missingKeys.push('QDRANT_API_KEY');
  }
  
  if (missingKeys.length > 0) {
    console.error(`Missing required environment variables: ${missingKeys.join(', ')}`);
    return {
      error: true,
      message: `API configuration incomplete. Missing: ${missingKeys.join(', ')}`,
      status: 500
    };
  }
  
  return { error: false };
}

export async function GET() {
  const health = {
    status: "healthy",
    environment: {},
    openai: { status: "unknown" },
    qdrant: { status: "unknown" },
    timestamp: new Date().toISOString()
  };

  const keyCheck = checkRequiredKeys();
  if (keyCheck.error) {
    return NextResponse.json(
      { error: keyCheck.message },
      { status: keyCheck.status }
    );
  }

  try {
    // Check environment variables
    health.environment = {
      openai_key: !!process.env.MY_OPENAI_API_KEY ? "set" : "missing",
      qdrant_url: !!process.env.QDRANT_URL ? "set" : "missing",
      qdrant_key: !!process.env.QDRANT_API_KEY ? "set" : "missing",
    };

    // Check OpenAI
    if (process.env.MY_OPENAI_API_KEY) {
      try {
        const openai = createOpenAIClient();
        const models = await openai.models.list();
        health.openai = { status: "connected", models_count: models.data.length };
      } catch (error) {
        health.openai = { status: "error", message: error.message };
      }
    }

    // Check Qdrant
    if (process.env.QDRANT_URL) {
      try {
        const qdrant = new QdrantClient({
          url: process.env.QDRANT_URL,
          apiKey: process.env.QDRANT_API_KEY,
          port: null,
          checkCompatibility: false
        });
        const collections = await qdrant.getCollections();
        health.qdrant = { 
          status: "connected", 
          collections_count: collections.collections.length,
          collections: collections.collections.map(c => c.name)
        };
      } catch (error) {
        health.qdrant = { status: "error", message: error.message };
      }
    }

    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}