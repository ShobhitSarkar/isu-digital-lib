"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Send, BookOpen, ExternalLink } from "lucide-react"

interface Message {
  id: string
  content: string
  sender: "user" | "assistant"
  timestamp: Date
  references?: {
    id: string
    title: string
    author: string
    url: string
  }[]
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

    // Simulate API response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          "Based on Iowa State's research repository, there have been several studies on sustainable agriculture practices. Recent papers highlight the effectiveness of crop rotation and precision farming in reducing environmental impact while maintaining yield.",
        sender: "assistant",
        timestamp: new Date(),
        references: [
          {
            id: "ref1",
            title: "Sustainable Agricultural Practices in Iowa: A Five-Year Study",
            author: "Dr. Emily Johnson",
            url: "#",
          },
          {
            id: "ref2",
            title: "Economic Impact of Precision Farming Technologies",
            author: "Prof. Michael Williams",
            url: "#",
          },
        ],
      }

      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
    }, 2000)
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-lg border">
      <div className="border-b p-3">
        <h3 className="font-medium">ISU Scholar Assistant</h3>
        <p className="text-xs text-muted-foreground">
          Ask questions about research papers, get summaries, and find relevant documents
        </p>
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
                    <span className="text-xs font-medium">ISU Digital Repository Assistant</span>
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

