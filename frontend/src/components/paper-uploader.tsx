"use client"

import type React from "react"
import { useState } from "react"
import { Upload, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { UploadedPaper } from "./chat-tab"

interface PaperUploaderProps {
  onUpload: (papers: UploadedPaper[]) => void
}

export default function PaperUploader({ onUpload }: PaperUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = async (files: FileList) => {
    setIsUploading(true)
    const fileArray = Array.from(files)

    const formData = new FormData()
    fileArray.forEach((file) => formData.append("files", file))

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) throw new Error("Upload failed")

      const uploadedPapers: UploadedPaper[] = await res.json()
      onUpload(uploadedPapers)
    } catch (err) {
      console.error("Upload failed", err)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging ? "border-cardinal bg-cardinal/5 dark:border-gold dark:bg-gold/5" : "border-muted-foreground/25"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="rounded-full bg-muted p-3">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Drag and drop your papers here</p>
          <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, or TXT files</p>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <label htmlFor="file-upload" className="w-full">
          <Input
            id="file-upload"
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
          <Button
            variant="outline"
            className="w-full"
            disabled={isUploading}
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            {isUploading ? (
              "Uploading..."
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" /> Browse Files
              </>
            )}
          </Button>
        </label>
      </div>
    </div>
  )
}