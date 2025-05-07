import OpenAI from "openai";

// Configure OpenAI client correctly without header issues
export function createOpenAIClient() {
  const apiKey = process.env.MY_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error("OpenAI API key is not configured");
  }
  
  // Create the client with minimal configuration
  return new OpenAI({
    apiKey: apiKey,
    // Remove any problematic default headers
    defaultHeaders: {}
  });
}