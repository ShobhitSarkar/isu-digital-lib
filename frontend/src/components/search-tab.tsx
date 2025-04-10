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
    
    try {
      setLoading(true);
      
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.answer) {
        setAnswer(data.answer);
        setCitations(data.citations || []);
      } else {
        console.error("No answer returned");
        setAnswer("");
        setCitations([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      setAnswer("");
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