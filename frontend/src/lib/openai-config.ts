import OpenAI from "openai";

/**
 * Creates and configures an OpenAI client with proper error handling for missing API keys
 */
export function createOpenAIClient() {
  // Only check API key in runtime environment, not during build
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
    // Server-side code in production
    const apiKey = process.env.MY_OPENAI_API_KEY?.trim();
    
    // In production, still create a client even if API key is missing
    // This allows the build to succeed, and we'll handle the missing key at runtime
    return new OpenAI({
      apiKey: apiKey || 'placeholder-for-build',
      defaultHeaders: {}
    });
  } else {
    // Development environment or client-side code
    return new OpenAI({
      apiKey: process.env.MY_OPENAI_API_KEY?.trim() || 'placeholder-for-build',
      defaultHeaders: {}
    });
  }
}