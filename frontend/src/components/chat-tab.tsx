"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import PaperUploader from "@/components/paper-uploader"
import ChatInterface from "@/components/chat-interface"
import { ScrollArea } from "@/components/ui/scroll-area"

export type UploadedPaper = {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: Date
  content?: string
}

export default function ChatTab() {
  const [uploadedPapers, setUploadedPapers] = useState<UploadedPaper[]>([])

  const handlePaperUpload = (papers: UploadedPaper[]) => {
    setUploadedPapers((prev) => {
      const updated = [...prev, ...papers]
      return updated
    })
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-6">
        <p className="text-center text-muted-foreground">
          Upload academic papers and ask questions about their content
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Uploaded Papers</CardTitle>
            <CardDescription>Upload papers to ask questions about them</CardDescription>
          </CardHeader>
          <CardContent>
            <PaperUploader onUpload={handlePaperUpload} />

            {uploadedPapers.length > 0 ? (
              <ScrollArea className="h-[400px] mt-4">
                <div className="space-y-2">
                  {uploadedPapers.map((paper) => (
                    <div key={paper.id} className="p-3 border rounded-md">
                      <p className="font-medium truncate">{paper.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(paper.uploadedAt instanceof Date
                          ? paper.uploadedAt.toLocaleString()
                          : new Date(paper.uploadedAt).toLocaleString())}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No papers uploaded yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <ChatInterface uploadedPapers={uploadedPapers} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}