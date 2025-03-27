// app/ai-chat/page.tsx
"use client"

import { useState } from "react"
import { EnhancedFileUpload } from "@/components/enhanced-file-upload"
import { ChatInterface } from "@/components/chat-interface"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { FileText, MessageSquare } from "lucide-react"

export default function AIChat() {
  const [activeTab, setActiveTab] = useState<string>("upload")

  return (
    <div className="min-h-screen bg-background">
      <main className="container px-4 py-6 md:px-6 md:py-8">
        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-bold">AI Research Assistant</h2>
          <p className="text-muted-foreground">
            Upload PDFs to the knowledge base and ask questions about them. The AI will analyze the content and provide relevant answers.
          </p>
        </div>

        <Tabs defaultValue="upload" className="w-full" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 grid w-full grid-cols-2">
            <TabsTrigger value="upload">
              <FileText className="mr-2 h-4 w-4" />
              Upload Documents
            </TabsTrigger>
            <TabsTrigger value="chat">
              <MessageSquare className="mr-2 h-4 w-4" />
              AI Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <EnhancedFileUpload />
            <div className="flex justify-end mt-4">
              <Button onClick={() => setActiveTab("chat")} className="bg-cardinal hover:bg-cardinal/90 text-white">
                <MessageSquare className="mr-2 h-4 w-4" />
                Go to AI Chat
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="chat" className="space-y-4">
            <ChatInterface />
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setActiveTab("upload")}>
                <FileText className="mr-2 h-4 w-4" />
                Upload More Documents
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}