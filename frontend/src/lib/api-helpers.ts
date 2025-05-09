// src/lib/api-helpers.ts

import { QdrantClient } from '@qdrant/js-client-rest';
import { NextResponse } from 'next/server';

/**
 * Helper function to create a Qdrant client safely for both build and runtime
 */
export function createSafeQdrantClient() {
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
 * Helper function to check if required API keys are available at runtime
 * Returns an appropriate error response if keys are missing
 */
export function checkRequiredKeys() {
  // During build time, don't do the check
  if (process.env.NODE_ENV !== 'production' || 
      process.env.MY_OPENAI_API_KEY === 'placeholder-during-build') {
    return { error: false };
  }
  
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

/**
 * Creates a NextResponse for build-time safe responses
 */
export function createBuildTimeResponse() {
  if (process.env.NODE_ENV !== 'production' || 
      process.env.MY_OPENAI_API_KEY === 'placeholder-during-build') {
    
    return NextResponse.json({
      message: "This is a build-time response. The actual API will be available when deployed.",
      success: true,
    });
  }
  
  return null;
}