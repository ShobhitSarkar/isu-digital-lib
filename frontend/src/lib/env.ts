// src/lib/env.ts
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// This file will be expanded later to handle environment variables properly
// For now, it just loads the .env file
console.log('Environment loaded. NODE_ENV:', process.env.NODE_ENV);

// Simple check for critical environment variables
if (!process.env.MY_OPENAI_API_KEY) {
  console.warn('Warning: MY_OPENAI_API_KEY is not set in environment variables');
}

if (!process.env.QDRANT_URL) {
  console.warn('Warning: QDRANT_URL is not set in environment variables');
}

if (!process.env.QDRANT_API_KEY) {
  console.warn('Warning: QDRANT_API_KEY is not set in environment variables');
}