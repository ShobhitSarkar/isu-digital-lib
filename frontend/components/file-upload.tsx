"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Upload, FileText, Check, X, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"

export function EnhancedFileUpload() {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadStatus, setUploadStatus] = useState<Record<string, "pending" | "success" | "error" | "processing" | "extracting" | "indexing">>({})
  const [statusMessages, setStatusMessages] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadControllerRef = useRef<AbortController | null>(null)
  const { toast } = useToast()

  // Cleanup function for any ongoing uploads
  useEffect(() => {
    return () => {
      if (uploadControllerRef.current) {
        uploadControllerRef.current.abort()
      }
    }
  }, [])

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

    // Check file sizes
    const oversizedFiles = pdfFiles.filter(file => file.size > 10 * 1024 * 1024) // 10MB
    if (oversizedFiles.length > 0) {
      toast({
        title: "File Too Large",
        description: `${oversizedFiles[0].name} exceeds the 10MB limit.`,
        variant: "destructive",
      })
      return
    }

    setUploadedFiles((prev) => [...prev, ...pdfFiles])

    // Initialize status for new files
    const newStatus: Record<string, "pending" | "success" | "error" | "processing"> = {}
    const newMessages: Record<string, string> = {}
    
    pdfFiles.forEach((file) => {
      newStatus[file.name] = "pending"
      newMessages[file.name] = "Waiting to upload..."
    })

    setUploadStatus((prev) => ({ ...prev, ...newStatus }))
    setStatusMessages((prev) => ({ ...prev, ...newMessages }))

    // Upload each file sequentially to avoid overwhelming the server
    uploadFilesSequentially(pdfFiles)
  }

  const uploadFilesSequentially = async (files: File[]) => {
    setIsUploading(true)
    
    for (const file of files) {
      try {
        await uploadFile(file)
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error)
        // Continue with next file even if one fails
      }
    }
    
    setIsUploading(false)
  }

  const uploadFile = async (file: File) => {
    setUploadStatus((prev) => ({ ...prev, [file.name]: "processing" }))
    setStatusMessages((prev) => ({ ...prev, [file.name]: "Preparing upload..." }))
    setUploadProgress(0)
    
    try {
      // Create a new AbortController for this upload
      uploadControllerRef.current = new AbortController()
      const { signal } = uploadControllerRef.current
      
      const formData = new FormData()
      formData.append("file", file)

      // Simulate upload progress (first 20%)
      let uploadSimulation = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 20) {
            clearInterval(uploadSimulation)
            return prev
          }
          return prev + 1
        })
      }, 100)

      setStatusMessages((prev) => ({ ...prev, [file.name]: "Uploading file..." }))
      
      // Start the upload
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        signal
      })

      clearInterval(uploadSimulation)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Upload failed")
      }

      // Set progress to 25% after successful upload
      setUploadProgress(25)
      setUploadStatus((prev) => ({ ...prev, [file.name]: "extracting" }))
      setStatusMessages((prev) => ({ ...prev, [file.name]: "Extracting text from PDF..." }))

      // Simulate text extraction progress (25% to 60%)
      let extractionSimulation = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 60) {
            clearInterval(extractionSimulation)
            return prev
          }
          return prev + 1
        })
      }, 150)

      // Simulate a delay for text extraction
      await new Promise(resolve => setTimeout(resolve, 5000))
      clearInterval(extractionSimulation)

      // Set progress to 60% after text extraction
      setUploadProgress(60)
      setUploadStatus((prev) => ({ ...prev, [file.name]: "indexing" }))
      setStatusMessages((prev) => ({ ...prev, [file.name]: "Creating embeddings and indexing..." }))

      // Simulate indexing progress (60% to 95%)
      let indexingSimulation = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 95) {
            clearInterval(indexingSimulation)
            return prev
          }
          return prev + 1
        })
      }, 200)

      // Parse the response
      const data = await response.json()

      // Finish up after a short delay
      setTimeout(() => {
        clearInterval(indexingSimulation)
        setUploadProgress(100)
        setUploadStatus((prev) => ({ ...prev, [file.name]: "success" }))
        setStatusMessages((prev) => ({ ...prev, [file.name]: "Successfully processed" }))
        
        toast({
          title: "Upload Successful",
          description: `${file.name} has been processed and added to the knowledge base.`,
        })
      }, 1500)
    } catch (error) {
      console.error("Upload error:", error)
      setUploadStatus((prev) => ({ ...prev, [file.name]: "error" }))
      setStatusMessages((prev) => ({ ...prev, [file.name]: error instanceof Error ? error.message : "Failed to process file" }))

      toast({
        title: "Upload Failed",
        description: `Failed to process ${file.name}. ${error instanceof Error ? error.message : "Please try again."}`,
        variant: "destructive",
      })
      
      // Reset progress
      setUploadProgress(0)
    }
  }

  const cancelUpload = () => {
    if (uploadControllerRef.current) {
      uploadControllerRef.current.abort()
      uploadControllerRef.current = null
    }
    
    setIsUploading(false)
    setUploadProgress(0)
    
    // Mark all processing files as error
    const updatedStatus = { ...uploadStatus }
    const updatedMessages = { ...statusMessages }
    
    Object.keys(updatedStatus).forEach(fileName => {
      if (updatedStatus[fileName] === "processing" || updatedStatus[fileName] === "extracting" || updatedStatus[fileName] === "indexing") {
        updatedStatus[fileName] = "error"
        updatedMessages[fileName] = "Upload cancelled"
      }
    })
    
    setUploadStatus(updatedStatus)
    setStatusMessages(updatedMessages)
    
    toast({
      title: "Upload Cancelled",
      description: "File processing has been cancelled.",
      variant: "destructive",
    })
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const removeFile = (fileName: string) => {
    // Only allow removing if not currently processing
    if (uploadStatus[fileName] === "processing" || uploadStatus[fileName] === "extracting" || uploadStatus[fileName] === "indexing") {
      toast({
        title: "Cannot Remove File",
        description: "Please wait for processing to complete or cancel the upload.",
        variant: "destructive",
      })
      return
    }
    
    setUploadedFiles((prev) => prev.filter((file) => file.name !== fileName))
    
    // Clone and remove from status objects
    const newStatus = { ...uploadStatus }
    const newMessages = { ...statusMessages }
    delete newStatus[fileName]
    delete newMessages[fileName]
    
    setUploadStatus(newStatus)
    setStatusMessages(newMessages)
  }

  // Determine if any files are currently being processed
  const isProcessing = Object.values(uploadStatus).some(
    status => status === "processing" || status === "extracting" || status === "indexing"
  )

  return (
    <Card className="w-full">
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
          <div className="mt-4 flex gap-2 justify-center">
            <Button variant="outline" onClick={triggerFileInput} disabled={isUploading}>
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
            {isProcessing && (
              <Button variant="destructive" onClick={cancelUpload}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf" multiple />
        </div>

        {isProcessing && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>{statusMessages[Object.keys(uploadStatus).find(key => 
                ["processing", "extracting", "indexing"].includes(uploadStatus[key])) || ""] || "Processing document..."}</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        {uploadedFiles.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Uploaded Files</h4>
            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div key={file.name} className="flex items-center justify-between rounded-md border p-2">
                  <div className="flex items-center flex-1 pr-2">
                    <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate block max-w-full">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {statusMessages[file.name]}
                    </span>

                    {uploadStatus[file.name] === "pending" && (
                      <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">Pending</span>
                    )}
                    
                    {(uploadStatus[file.name] === "processing" || 
                      uploadStatus[file.name] === "extracting" || 
                      uploadStatus[file.name] === "indexing") && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    
                    {uploadStatus[file.name] === "success" && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    
                    {uploadStatus[file.name] === "error" && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={() => removeFile(file.name)}
                      disabled={uploadStatus[file.name] === "processing" || 
                               uploadStatus[file.name] === "extracting" || 
                               uploadStatus[file.name] === "indexing"}
                    >
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
        <div className="flex flex-col w-full space-y-1">
          <p>Supported file type: PDF only. Maximum file size: 10MB.</p>
          <p>Large documents will take longer to process. Please be patient.</p>
        </div>
      </CardFooter>
    </Card>
  )
}