// src/app/api/assistant/ask/route.ts

import { NextRequest, NextResponse } from "next/server";
import { QdrantClient } from "@qdrant/js-client-rest";
import { createOpenAIClient } from "@/lib/openai-config";
import { ensureProtocol } from "@/lib/utils";

const VECTOR_SIZE = 1536; // size of the vector embeddings from OpenAI's model 
const COLLECTION = "academic-docs"; // name of the Qdrant collection 

/**
 * Set up the Qdrant client to connect to the Qdrant server.
 */
const qdrant = new QdrantClient({
  url: ensureProtocol(process.env.QDRANT_URL),
  apiKey: process.env.QDRANT_API_KEY,
  port: null,
  checkCompatibility: false
});

/**
 * Set up the OpenAI client to connect to the OpenAI API.
 */
const openai = createOpenAIClient();


/**
 * API endpoint handler that uses semantic search. 
 * Takes in a question and a list of paper names, searches for relevant content 
 * and generates answers using OpenAI's chat model.
 * 
 * @param request - Next.js API request
 * @returns {Promise<NextResponse>} JSON response with either:
 *   - Success: { answer: string }
 *   - Error: { error: string, message?: string }
 */
export async function POST(request: NextRequest) {
  console.log("Ask route called");
  
  try {
    // Debug environment variables
    console.log("Environment variables:");
    console.log("QDRANT_URL:", process.env.QDRANT_URL ? "Set" : "Not set");
    console.log("QDRANT_API_KEY:", process.env.QDRANT_API_KEY ? "Set" : "Not set");
    console.log("MY_OPENAI_API_KEY:", process.env.MY_OPENAI_API_KEY ? "Set" : "Not set");
    
    const { question, paperNames } = await request.json();
    console.log("Received question:", question);
    console.log("For papers:", paperNames);

    if (!question || !paperNames || !Array.isArray(paperNames) || paperNames.length === 0) {
      console.error("Missing or invalid question or paperNames");
      return NextResponse.json(
        { error: "Missing or invalid question or paperNames" },
        { status: 400 }
      );
    }

    // Check if collection exists
    console.log("Checking if collection exists...");
    try {
      const collections = await qdrant.getCollections();
      const exists = collections.collections.some((c) => c.name === COLLECTION);
      
      if (!exists) {
        console.error("Collection does not exist");
        return NextResponse.json(
          { error: "No documents found. Please upload papers first." },
          { status: 404 }
        );
      }
      
      console.log("Collection exists, proceeding with search");
    } catch (qdrantError) {
      console.error("Error checking Qdrant collections:", qdrantError);
      return NextResponse.json(
        { error: "Could not connect to document database", message: qdrantError.message },
        { status: 500 }
      );
    }

    // 1. Embed the user's question
    console.log("Generating embedding for question...");
    let questionVector;
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: question,
      });

      questionVector = embeddingResponse.data[0].embedding;
      console.log("Embedding generated successfully");
    } catch (openaiError) {
      console.error("OpenAI embeddings error:", openaiError);
      return NextResponse.json(
        { error: "Error generating question embedding", message: openaiError.message },
        { status: 500 }
      );
    }

    // 2. Search Qdrant for matching content from selected papers
    console.log("Searching for relevant content...");
    let searchRes;
    try {
      searchRes = await qdrant.search(COLLECTION, {
        vector: questionVector,
        limit: 10,  // Increased from 5 to get more context
        filter: {
          must: [
            {
              key: "paperName",
              match: {
                any: paperNames,
              },
            },
          ],
        },
      });

      console.log(`Found ${searchRes.length} matching chunks`);

      if (searchRes.length === 0) {
        return NextResponse.json({ 
          answer: "I couldn't find any relevant information in the uploaded papers. This might be because the papers don't contain information related to your question, or the papers weren't processed correctly. You can try uploading the papers again or asking a different question."
        });
      }
    } catch (searchError) {
      console.error("Qdrant search error:", searchError);
      return NextResponse.json(
        { error: "Error searching the document database", message: searchError.message },
        { status: 500 }
      );
    }

    // 3. Take the search result from qdrant and extract the content 
    const contextChunks = searchRes.map((point) => {
      // Include the paper name for better context
      const paperName = point.payload?.paperName || "Unknown Paper";
      const content = point.payload?.content || "";
      return `[From: ${paperName}]\n${content}`;
    }).filter(Boolean) as string[];

    // 4. Join the extracted content chunks to create a single string
    const contextText = contextChunks.join("\n\n---\n\n");
    console.log("Context prepared, length:", contextText.length);

    // 5. Call OpenAI for chat completion
    console.log("Calling OpenAI chat completion...");
    try {
      // Create a more detailed system prompt
      const systemPrompt = `You are a helpful academic assistant that analyzes research papers.
Use the provided context from uploaded academic papers to answer the user's question.
Your answers should be detailed and informative, but focus only on information present in the provided context.
Always cite the paper name when mentioning information from it.
If the context is insufficient to answer the question, clearly state what's missing and suggest what other information might be needed.
If the context contains conflicting information, mention this and present both perspectives.
If the question is unrelated to the provided context, respond with "I'm not sure based on the papers provided."`;

      // Ensure the context isn't too long for the API
      const maxContextLength = 14000; // Leave room for system & user messages
      let truncatedContext = contextText;
      
      if (contextText.length > maxContextLength) {
        console.log("Context too long, truncating...");
        // Split on the document separators
        const chunks = contextText.split("---");
        
        // Start with empty context
        truncatedContext = "";
        
        // Add chunks until we reach the limit
        for (const chunk of chunks) {
          if ((truncatedContext + chunk).length <= maxContextLength) {
            // Add separator back if this isn't the first chunk
            if (truncatedContext.length > 0) {
              truncatedContext += "\n\n---\n\n";
            }
            truncatedContext += chunk;
          } else {
            break;
          }
        }
        
        console.log(`Truncated context from ${contextText.length} to ${truncatedContext.length} characters`);
      }

      // Make the OpenAI API call
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Context:\n${truncatedContext}\n\nQuestion:\n${question}`,
          },
        ],
        temperature: 0.3,
      });

      const answer = completion.choices[0].message.content;
      console.log("Received answer of length:", answer?.length || 0);
      
      return NextResponse.json({ answer: answer || "I'm sorry, I couldn't generate an answer based on the uploaded papers." });
    } catch (openaiError) {
      console.error("OpenAI chat completion error:", openaiError);
      return NextResponse.json(
        { error: "Error generating answer", message: openaiError.message },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("Failed to answer question:", err);
    return NextResponse.json(
      { error: "Something went wrong.", message: err.message },
      { status: 500 }
    );
  }
}