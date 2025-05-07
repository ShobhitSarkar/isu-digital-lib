// src/app/api/health/route.ts
import { NextResponse } from "next/server";
import { QdrantClient } from "@qdrant/js-client-rest";
import { createOpenAIClient } from "@/lib/openai-config";

export async function GET() {
  const health = {
    status: "healthy",
    environment: {},
    openai: { status: "unknown" },
    qdrant: { status: "unknown" },
    timestamp: new Date().toISOString()
  };

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