// src/app/api/assistant/cleanup/route.ts

import { NextRequest, NextResponse } from "next/server";
import { QdrantClient } from "@qdrant/js-client-rest";

/**
 * Instantiate a Qdrant client to connect to the Qdrant server
 */
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  port: null,
});

const COLLECTION = "academic-docs"; // name of the Qdrant collection

/**
 * API route to clean up collections (used when session ends)
 * Can be called via client-side cleanup logic
 * 
 * @param request - Next.js API request
 * @returns NextResponse with success or error status
 */
export async function POST(request: NextRequest) {
  console.log("Cleanup route called");
  
  try {
    // Debug environment variables
    console.log("Environment variables:");
    console.log("QDRANT_URL:", process.env.QDRANT_URL ? "Set" : "Not set");
    console.log("QDRANT_API_KEY:", process.env.QDRANT_API_KEY ? "Set" : "Not set");
    
    const body = await request.json();
    const { action, paperName } = body;
    
    console.log("Cleanup action:", action, paperName ? `for paper: ${paperName}` : "");
    
    if (!action) {
      return NextResponse.json(
        { error: "Missing action parameter" },
        { status: 400 }
      );
    }

    // Check if collection exists before attempting cleanup
    let exists = false;
    try {
      const collections = await qdrant.getCollections();
      exists = collections.collections.some((c) => c.name === COLLECTION);
      
      if (!exists) {
        console.log("Collection does not exist, nothing to clean up");
        return NextResponse.json({ 
          success: true, 
          message: "No collection found to clean up" 
        });
      }
    } catch (error) {
      console.error("Error checking collections:", error);
      return NextResponse.json(
        { error: "Could not check if collection exists", message: error.message },
        { status: 500 }
      );
    }

    // Handle different cleanup actions
    switch (action) {
      case "cleanup":
        console.log("Performing full cleanup");
        try {
          // Delete all points in the collection
          await qdrant.delete(COLLECTION, {
            filter: {}, // Empty filter means delete all points
            wait: true,
          });
          
          console.log("All points deleted from collection");
          return NextResponse.json({ 
            success: true, 
            message: "Collection cleanup successful" 
          });
        } catch (error) {
          console.error("Error deleting points:", error);
          return NextResponse.json(
            { error: "Could not delete points from collection", message: error.message },
            { status: 500 }
          );
        }

      case "remove_paper":
        if (!paperName) {
          return NextResponse.json(
            { error: "Missing paperName parameter for remove_paper action" },
            { status: 400 }
          );
        }

        console.log(`Removing points for paper: ${paperName}`);
        try {
          // Delete only points related to the specified paper
          await qdrant.delete(COLLECTION, {
            filter: {
              must: [
                {
                  key: "paperName",
                  match: {
                    value: paperName
                  }
                }
              ]
            },
            wait: true,
          });

          console.log(`Points for paper "${paperName}" removed successfully`);
          return NextResponse.json({ 
            success: true, 
            message: `Successfully removed paper: ${paperName}` 
          });
        } catch (error) {
          console.error(`Error removing paper "${paperName}":`, error);
          return NextResponse.json(
            { error: `Could not remove paper: ${paperName}`, message: error.message },
            { status: 500 }
          );
        }

      default:
        console.error(`Unknown action: ${action}`);
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error("Cleanup error:", err);
    return NextResponse.json(
      { error: err.message || "Cleanup failed" },
      { status: 500 }
    );
  }
}