"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UploadedPaper } from "./chat-tab";
import { Send } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  uploadedPapers: UploadedPaper[];
}

export default function ChatInterface({ uploadedPapers }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current;
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }, [messages]);

  // Reset chat when papers change
  useEffect(() => {
    if (messages.length > 0) {
      setMessages([]);
    }
  }, [uploadedPapers]);

  const handleSend = async () => {
    if (!input.trim() || uploadedPapers.length === 0) return;
    setError(null);

    const newMessage: Message = { role: "user", content: input };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      console.log("Sending question to API:", input);
      console.log("Using papers:", uploadedPapers.map(p => p.name));
      
      const response = await fetch("/api/assistant/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: input,
          paperNames: uploadedPapers.map((paper) => paper.name),
          history: updatedMessages,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        
        try {
          // Try to parse error as JSON if possible
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || errorData.message || `Failed to get response: ${response.statusText}`);
        } catch (parseError) {
          // If parsing fails, use the text response
          throw new Error(`Failed to get response: ${response.statusText}. Details: ${errorText.substring(0, 100)}...`);
        }
      }

      const data = await response.json();
      console.log("API response:", data);
      
      if (data.answer) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.answer },
        ]);
      } else {
        throw new Error("No answer in response");
      }
    } catch (err: any) {
      console.error("❌ Failed to get response:", err);
      setError(err.message || "Failed to get a response. Please try again.");
      setMessages((prev) => [
        ...prev,
        { 
          role: "assistant", 
          content: "I'm sorry, I couldn't process your question. There might be an issue with the system or with the papers you've uploaded." 
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div 
        className="flex-1 p-4 overflow-y-auto border-b" 
        ref={scrollAreaRef}
        style={{ maxHeight: "calc(100vh - 300px)" }}
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground">
              {uploadedPapers.length === 0 
                ? "Upload papers to start a conversation." 
                : "Ask a question about the uploaded papers."}
            </p>
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-2 ${
                    msg.role === "user"
                      ? "bg-cardinal/10 text-cardinal dark:bg-gold/10 dark:text-gold"
                      : "bg-muted text-gray-800 dark:text-gray-100"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[75%] rounded-lg px-4 py-2 bg-muted flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-cardinal dark:bg-gold animate-pulse"></div>
                  <div className="h-2 w-2 rounded-full bg-cardinal dark:bg-gold animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="h-2 w-2 rounded-full bg-cardinal dark:bg-gold animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 text-xs">
          {error}
        </div>
      )}

      <div className="p-4 flex gap-2 border-t">
        <Input
          placeholder={uploadedPapers.length === 0 
            ? "Upload papers to start asking questions..." 
            : "Ask a question about the uploaded papers..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          className="flex-1"
          disabled={uploadedPapers.length === 0 || loading}
        />
        <Button 
          onClick={handleSend} 
          disabled={loading || uploadedPapers.length === 0 || !input.trim()}
          className="bg-cardinal hover:bg-cardinal/80 dark:bg-gold dark:hover:bg-gold/80"
        >
          {loading ? (
            <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}