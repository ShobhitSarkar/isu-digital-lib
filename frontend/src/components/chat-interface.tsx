"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UploadedPaper } from "./chat-tab";

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

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessage: Message = { role: "user", content: input };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/semantic/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: input,
          paperNames: uploadedPapers.map((paper) => paper.name),
        }),
      });

      const data = await response.json();
      if (data.answer) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.answer },
        ]);
      }
    } catch (err) {
      console.error("❌ Failed to get response:", err);
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
      <ScrollArea className="flex-1 p-4 overflow-y-auto border-b">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-4 py-2 ${
                  msg.role === "user"
                    ? "bg-gray-200 text-black"
                    : "bg-muted text-gray-800"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 flex gap-2 border-t">
        <Input
          placeholder="Ask a question about the uploaded paper..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={loading}>
          {loading ? "..." : "Send"}
        </Button>
      </div>
    </div>
  );
}
