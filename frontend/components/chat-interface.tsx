"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Send, BookOpen, ExternalLink, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Reference {
  id: string
  title: string
  author: string
  url: string
}

interface Message {
  id: string
  content: string
  sender: "user" | "assistant"
  timestamp: Date
  references?: Reference[]
}

export function ChatInterface() {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content:
        "Hello! I'm your ISU Scholar Assistant. Ask me anything about Iowa State's research repository, and I'll provide answers with relevant citations.",
      sender: "assistant",
      timestamp: new Date(),
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // Get chat history for context
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.content,
        }))

      // Call our API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
          history: history,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        sender: "assistant",
        timestamp: new Date(),
        references: data.references,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: "Failed to get a response. Please try again.",
        variant: "destructive",
      })

      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          content: "I'm sorry, I encountered an error processing your request. Please try again.",
          sender: "assistant",
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", files[0])

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const data = await response.json()

      toast({
        title: "Upload Successful",
        description: `${files[0].name} has been uploaded and processed.`,
      })

      // Add system message about the upload
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          content: files && files.length > 0 
            ? `I've processed "${files[0].name}". You can now ask questions about this document.`
            : "I've processed your document. You can now ask questions about it.",
          sender: "assistant",
          timestamp: new Date(),
        },
      ])
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your file.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-lg border">
      <div className="border-b p-3 flex justify-between items-center">
        <div>
          <h3 className="font-medium">ISU Scholar Assistant</h3>
          <p className="text-xs text-muted-foreground">
            Ask questions about research papers, get summaries, and find relevant documents
          </p>
        </div>
        <div className="flex items-center">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf" />
          <Button
            variant="outline"
            size="sm"
            onClick={triggerFileUpload}
            disabled={isUploading}
            className="flex items-center gap-1"
          >
            {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            Upload Paper
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.sender === "user" ? "bg-cardinal text-white dark:bg-cardinal/80" : "bg-muted"
                }`}
              >
                {message.sender === "assistant" && (
                  <div className="mb-2 flex items-center">
                    <Avatar className="mr-2 h-6 w-6">
                      <AvatarImage src="/placeholder.svg?height=40&width=40" alt="ISU Assistant" />
                      <AvatarFallback className="bg-gold text-white">ISU</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">ISU Scholar Assistant</span>
                  </div>
                )}
                <p className={`text-sm ${message.sender === "user" ? "text-white" : ""}`}>{message.content}</p>
                {message.references && message.references.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium">Sources:</p>
                    {message.references.map((ref) => (
                      <Card key={ref.id} className="bg-background/50 p-2">
                        <CardContent className="p-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-medium">{ref.title}</p>
                              <p className="text-xs text-muted-foreground">{ref.author}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-6 w-6">
                                <BookOpen className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6">
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                <div className="mt-1 text-right">
                  <span className="text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg bg-muted p-3">
                <div className="flex items-center">
                  <Avatar className="mr-2 h-6 w-6">
                    <AvatarFallback className="bg-gold text-white">ISU</AvatarFallback>
                  </Avatar>
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSendMessage} className="border-t p-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Ask about research papers, topics, or authors..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="bg-cardinal hover:bg-cardinal/90 text-white"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="mr-1 text-[10px]">
            Tip
          </Badge>
          Try asking: "What are the latest research papers on sustainable agriculture?"
        </div>
      </form>
    </div>
  )
}

