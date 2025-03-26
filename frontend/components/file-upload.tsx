"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Upload, FileText, Check, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface FileUploadProps {
  onUploadComplete?: (paperInfo: any) => void
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadStatus, setUploadStatus] = useState<Record<string, "pending" | "success" | "error">>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const handleFiles = (files: File[]) => {
    const pdfFiles = files.filter((file) => file.type === "application/pdf")

    if (pdfFiles.length === 0) {
      toast({
        title: "Invalid File Type",
        description: "Please upload PDF files only.",
        variant: "destructive",
      })
      return
    }

    setUploadedFiles((prev) => [...prev, ...pdfFiles])

    // Initialize status for new files
    const newStatus: Record<string, "pending" | "success" | "error"> = {}
    pdfFiles.forEach((file) => {
      newStatus[file.name] = "pending"
    })

    setUploadStatus((prev) => ({ ...prev, ...newStatus }))

    // Upload each file
    pdfFiles.forEach((file) => {
      uploadFile(file)
    })
  }

  const uploadFile = async (file: File) => {
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const data = await response.json()

      setUploadStatus((prev) => ({ ...prev, [file.name]: "success" }))

      toast({
        title: "Upload Successful",
        description: `${file.name} has been processed and added to the repository.`,
      })

      if (onUploadComplete) {
        onUploadComplete(data.paper)
      }
    } catch (error) {
      console.error("Upload error:", error)
      setUploadStatus((prev) => ({ ...prev, [file.name]: "error" }))

      toast({
        title: "Upload Failed",
        description: `Failed to process ${file.name}. Please try again.`,
        variant: "destructive",
      })
    } finally {
      // Check if all uploads are complete
      setIsUploading((prev) => {
        const allComplete = Object.values(uploadStatus).every((status) => status === "success" || status === "error")
        return !allComplete
      })
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const removeFile = (fileName: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.name !== fileName))
    setUploadStatus((prev) => {
      const newStatus = { ...prev }
      delete newStatus[fileName]
      return newStatus
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Research Papers</CardTitle>
        <CardDescription>Upload PDF papers to add them to the ISU Scholar repository</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center ${
            isDragging ? "border-cardinal bg-cardinal/5" : "border-muted-foreground/20"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium">Drag & Drop PDF Files</h3>
          <p className="mt-1 text-sm text-muted-foreground">or click to browse your files</p>
          <Button variant="outline" onClick={triggerFileInput} className="mt-4" disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Select Files
              </>
            )}
          </Button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf" multiple />
        </div>

        {uploadedFiles.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Uploaded Files</h4>
            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div key={file.name} className="flex items-center justify-between rounded-md border p-2">
                  <div className="flex items-center">
                    <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                  </div>
                  <div className="flex items-center">
                    {uploadStatus[file.name] === "pending" && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {uploadStatus[file.name] === "success" && <Check className="h-4 w-4 text-green-500" />}
                    {uploadStatus[file.name] === "error" && <X className="h-4 w-4 text-red-500" />}
                    <Button variant="ghost" size="icon" className="ml-2 h-6 w-6" onClick={() => removeFile(file.name)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Supported file type: PDF only. Maximum file size: 10MB.
      </CardFooter>
    </Card>
  )
}

