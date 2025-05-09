// src/app/api/assistant/extract-pdf/route.ts

// src/app/api/assistant/extract-pdf/route.ts

import { NextRequest, NextResponse } from "next/server";
// Import the default version from pdf-parse
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

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

export async function POST(request: NextRequest) {

  const keyCheck = checkRequiredKeys();
  if (keyCheck.error) {
    return NextResponse.json(
      { error: keyCheck.message },
      { status: keyCheck.status }
    );
  }

  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Check if it's a PDF file
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 }
      );
    }

    console.log(`Processing PDF: ${file.name}, Size: ${file.size} bytes`);

    // Convert the file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    try {
      // Use pdf-parse to extract text
      const data = await pdfParse(buffer);
      
      // Log first 200 characters to debug
      console.log("Extracted text sample:", data.text.substring(0, 200));
      
      if (!data.text || data.text.trim().length < 50) {
        return NextResponse.json(
          { error: "Could not extract meaningful text from the PDF. It might be scanned or contains primarily images." },
          { status: 400 }
        );
      }
      
      return NextResponse.json({
        filename: file.name,
        pageCount: data.numpages,
        extractedText: data.text,
        fileSize: file.size,
        fileType: file.type
      });
    } catch (parseError) {
      console.error("PDF parse error:", parseError);
      return NextResponse.json(
        { error: "Failed to parse PDF: " + (parseError instanceof Error ? parseError.message : String(parseError)) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Extract PDF error:", error);
    return NextResponse.json(
      { error: "Failed to process PDF" },
      { status: 500 }
    );
  }
}