// src/components/paper-uploader.tsx
"use client"

import { useState } from "react"
import { FileText, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { UploadedPaper } from "./chat-tab"
import PDFExtractor from "./pdf-extractor"

interface PaperUploaderProps {
  onUpload: (papers: UploadedPaper[]) => void
}

export default function PaperUploader({ onUpload }: PaperUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)

  // Handle the extracted text from PDFs
  const handleExtractedFiles = async (
    files: Array<{ name: string, content: string, size: number, type: string }>
  ) => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    setUploadError(null);
    setUploadStatus(`Uploading ${files.length} file(s)...`);

    try {
      // Process each file sequentially to avoid overwhelming the API
      const uploadedPapers: UploadedPaper[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadStatus(`Processing file ${i + 1} of ${files.length}: ${file.name}`);
        
        // Check if the extracted text is valid
        if (!file.content || file.content.trim().length < 100) {
          throw new Error(`Not enough text could be extracted from ${file.name}. The file might be scanned or protected.`);
        }
        
        // Send the extracted text to the API
        const response = await fetch("/api/assistant/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename: file.name,
            fileSize: file.size,
            fileType: file.type,
            extractedText: file.content
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to upload ${file.name}`);
        }

        const responseData = await response.json();
        
        // Validate the response data
        if (!Array.isArray(responseData) || responseData.length === 0) {
          throw new Error(`Invalid response when uploading ${file.name}`);
        }
        
        // Process the response data
        const paperData = responseData.map((paper) => ({
          ...paper,
          uploadedAt: new Date(paper.uploadedAt),
        }));
        
        uploadedPapers.push(...paperData);
        setUploadStatus(`Uploaded ${i + 1} of ${files.length} files`);
      }
      
      if (uploadedPapers.length > 0) {
        onUpload(uploadedPapers);
        setUploadStatus(`Successfully uploaded ${uploadedPapers.length} papers`);
        
        // Clear status after a delay
        setTimeout(() => setUploadStatus(null), 3000);
      } else {
        throw new Error("No papers were successfully uploaded");
      }
    } catch (err: any) {
      console.error("Upload failed", err);
      setUploadError(err.message || "Failed to upload paper");
      setUploadStatus(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle extraction errors
  const handleExtractError = (error: string) => {
    setUploadError(error);
    setUploadStatus(null);
  };

  return (
    <div className="space-y-4">
      <PDFExtractor 
        onExtract={handleExtractedFiles} 
        onError={handleExtractError} 
      />

      {uploadStatus && !uploadError && (
        <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-100 text-sm rounded flex items-center">
          <div className={`mr-2 h-3 w-3 rounded-full ${isUploading ? 'bg-green-500 animate-pulse' : 'bg-green-500'}`}></div>
          <p>{uploadStatus}</p>
        </div>
      )}

      {uploadError && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm">{uploadError}</p>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-100 text-sm rounded flex items-center">
          <div className="mr-2 h-3 w-3 rounded-full bg-yellow-500 animate-pulse"></div>
          <p>Processing and uploading...</p>
        </div>
      )}
    </div>
  );
}