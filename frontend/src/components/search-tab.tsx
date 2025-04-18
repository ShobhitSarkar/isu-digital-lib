// src/components/search-tab.tsx
"use client"

import { useState } from "react"
import SearchSection from "@/components/search-section"
import AnswerSection from "@/components/answer-section"

export default function SearchTab() {
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    console.log("🔍 Frontend: Sending search query:", query);
    setLoading(true);
    
    try {
      const response = await fetch("/api/semantic/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });
      
      console.log("🔍 Frontend: Response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Frontend: Search API error:", errorData);
        throw new Error(errorData.message || `Search failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("🔍 Frontend: Response data received:", !!data);
      
      if (data.answer) {
        setAnswer(data.answer);
        setCitations(data.citations || []);
      } else {
        console.error("Frontend: No answer returned in response:", data);
        setAnswer("Sorry, I couldn't find a relevant answer. Please try a different query.");
        setCitations([]);
      }
    } catch (error) {
      console.error("Frontend: Search error:", error);
      setAnswer(`Error: ${error.message || "Failed to search. Please try again later."}`);
      setCitations([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <SearchSection onSearch={handleSearch} />
      <div className="mt-8 flex-1">
        <AnswerSection answer={answer} citations={citations} loading={loading} />
      </div>
    </div>
  )
}