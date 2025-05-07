// src/components/pdf-extractor.tsx
"use client";

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, AlertCircle, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface PDFExtractorProps {
  onExtract: (files: Array<{ name: string, content: string, size: number, type: string }>) => void;
  onError: (error: string) => void;
}

export default function PDFExtractor({ onExtract, onError }: PDFExtractorProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const processFiles = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setIsExtracting(true);
    setProgress(0);
    setErrorMessage(null);

    try {
      const processedFiles = [];
      const totalFiles = acceptedFiles.length;
      
      for (let i = 0; i < totalFiles; i++) {
        const file = acceptedFiles[i];
        // Update progress based on file processing
        setProgress(Math.floor((i / totalFiles) * 100));
        
        // Only process PDF files
        if (file.type !== 'application/pdf') {
          setErrorMessage(`${file.name} is not a PDF file. Only PDF files are supported.`);
          onError(`${file.name} is not a PDF file. Only PDF files are supported.`);
          continue;
        }

        try {
          // Create a FormData object to send the file
          const formData = new FormData();
          formData.append('file', file);
          
          // Send the file to our extraction API endpoint
          const response = await fetch('/api/assistant/extract-pdf', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to extract text from ${file.name}`);
          }
          
          const data = await response.json();
          
          if (!data.extractedText || data.extractedText.trim().length === 0) {
            throw new Error(`No text could be extracted from ${file.name}`);
          }
          
          // Add the processed file to our list
          processedFiles.push({
            name: file.name,
            content: data.extractedText,
            size: file.size,
            type: file.type
          });
          
          // Update progress
          setProgress(Math.floor(((i + 1) / totalFiles) * 100));
        } catch (error) {
          const errorMsg = `Error processing ${file.name}: ${error instanceof Error ? error.message : String(error)}`;
          setErrorMessage(errorMsg);
          onError(errorMsg);
        }
      }

      if (processedFiles.length > 0) {
        onExtract(processedFiles);
      } else if (!errorMessage) {
        setErrorMessage('No valid files were processed.');
        onError('No valid files were processed.');
      }
    } catch (error) {
      const errorMsg = `Error processing files: ${error instanceof Error ? error.message : String(error)}`;
      setErrorMessage(errorMsg);
      onError(errorMsg);
    } finally {
      setIsExtracting(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    processFiles(acceptedFiles);
  }, [onExtract, onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true
  });

  return (
    <div className="space-y-4">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-4 sm:p-6 text-center cursor-pointer transition-colors min-h-[120px] flex items-center justify-center
          ${isDragActive 
            ? 'border-cardinal bg-cardinal/5 dark:border-gold dark:bg-gold/5' 
            : 'border-muted-foreground/30 hover:border-muted-foreground/50'}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-2">
          <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground mb-1 sm:mb-2" />
          <p className="text-xs sm:text-sm font-medium">
            {isDragActive ? 'Drop PDF files here' : 'Tap to select PDF files'}
          </p>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Only PDF files are supported
          </p>
        </div>
      </div>

      {isExtracting && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Extracting text...</p>
            <p className="text-sm text-muted-foreground">{progress}%</p>
          </div>
          {/* Custom progress bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-cardinal dark:bg-gold transition-all duration-200 ease-in-out" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive flex items-start space-x-2 text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p>{errorMessage}</p>
        </div>
      )}
    </div>
  );
}