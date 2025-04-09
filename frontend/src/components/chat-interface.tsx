"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Send, FileText } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { UploadedPaper } from "./chat-tab"

type Message = {
  id: number
  content: string
  sender: "user" | "ai"
  timestamp: Date
  paperReferences?: {
    paperId: string
    paperName: string
    excerpt?: string
    page?: number
  }[]
}

interface ChatInterfaceProps {
  uploadedPapers: UploadedPaper[]
}

export default function ChatInterface({ uploadedPapers }: ChatInterfaceProps) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Initialize chat with welcome message when papers are uploaded
  useEffect(() => {
    if (uploadedPapers.length > 0 && messages.length === 0) {
      setMessages([
        {
          id: 1,
          content: `I've processed ${uploadedPapers.length} paper${uploadedPapers.length > 1 ? "s" : ""}. What would you like to know about ${uploadedPapers.length > 1 ? "them" : "it"}?`,
          sender: "ai",
          timestamp: new Date(),
        },
      ])
    }
  }, [uploadedPapers, messages.length])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || uploadedPapers.length === 0) return

    // Add user message
    const userMessage: Message = {
      id: messages.length + 1,
      content: input,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages([...messages, userMessage])
    setInput("")

    // Mock AI response (in a real app, this would come from the backend)
    setTimeout(() => {
      const aiMessage: Message = {
        id: messages.length + 2,
        content:
          "Based on the papers you've uploaded, I found several relevant sections that address your question. The main findings suggest that the methodology described in the paper has shown a 23% improvement over previous approaches.",
        sender: "ai",
        timestamp: new Date(),
        paperReferences: [
          {
            paperId: uploadedPapers[0]?.id || "1",
            paperName: uploadedPapers[0]?.name || "Research Paper",
            excerpt: "Our experimental results demonstrate a 23% improvement over the baseline method (p < 0.01).",
            page: 7,
          },
          {
            paperId: uploadedPapers[0]?.id || "1",
            paperName: uploadedPapers[0]?.name || "Research Paper",
            excerpt: "The limitations of this approach include potential overfitting on smaller datasets.",
            page: 12,
          },
        ],
      }

      setMessages((prev) => [...prev, aiMessage])
    }, 1500)
  }

  return (
    <div className="flex flex-col h-[600px] max-h-[calc(100vh-300px)]">
      {uploadedPapers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Papers Uploaded</h3>
          <p className="text-muted-foreground max-w-md">
            Upload one or more academic papers to start asking questions about their content. I can help you understand
            key concepts, summarize findings, and answer specific questions.
          </p>
        </div>
      ) : (
        <>
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex gap-3 max-w-[80%] ${message.sender === "user" ? "flex-row-reverse" : ""}`}>
                    <Avatar className={message.sender === "user" ? "bg-cardinal" : "bg-gold"}>
                      <AvatarFallback>{message.sender === "user" ? "U" : "AI"}</AvatarFallback>
                      {message.sender === "ai" && <AvatarImage src="/placeholder.svg?height=40&width=40" />}
                    </Avatar>

                    <div>
                      <div
                        className={`rounded-lg p-3 ${
                          message.sender === "user" ? "bg-cardinal text-white" : "bg-muted"
                        }`}
                      >
                        <p>{message.content}</p>
                      </div>

                      {message.paperReferences && message.paperReferences.length > 0 && (
                        <div className="mt-2 space-y-2">
                          <p className="text-xs text-muted-foreground">References from papers:</p>
                          {message.paperReferences.map((ref, index) => (
                            <div key={index} className="text-xs p-2 border rounded bg-background">
                              <div className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                <p className="font-medium truncate">{ref.paperName}</p>
                              </div>
                              {ref.excerpt && (
                                <div className="mt-1 p-1 bg-muted/50 rounded text-muted-foreground italic">
                                  "{ref.excerpt}"
                                </div>
                              )}
                              <div className="mt-1 flex items-center justify-between">
                                {ref.page && <span className="text-[10px] text-muted-foreground">Page {ref.page}</span>}
                                <Badge
                                  variant="outline"
                                  className="text-[10px] bg-cardinal/10 text-cardinal dark:bg-gold/10 dark:text-gold"
                                >
                                  View in Paper
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground mt-1">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
            <Input
              placeholder={
                uploadedPapers.length === 0
                  ? "Upload papers to start chatting..."
                  : "Ask questions about the uploaded papers..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1"
              disabled={uploadedPapers.length === 0}
            />
            <Button
              type="submit"
              className="bg-cardinal hover:bg-cardinal/90 text-white"
              disabled={uploadedPapers.length === 0}
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </>
      )}
    </div>
  )
}
