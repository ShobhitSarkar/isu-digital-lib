"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, SearchIcon, BookOpen, FileText, Calendar, User } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface SearchResult {
  id: string
  title: string
  author: string
  date: string
  summary: string
  department: string
  type: string
  relevance: number
}

export function Search() {
  const [query, setQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsSearching(true)
    setHasSearched(true)

    try {
      // Call our search API
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          filters: {}, // Add filters as needed
        }),
      })

      if (!response.ok) throw new Error("Search failed")

      const data = await response.json()
      setResults(data.results)
    } catch (error) {
      console.error("Search error:", error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex w-full items-center space-x-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search for research papers, theses, articles..."
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button type="submit" className="bg-cardinal hover:bg-cardinal/90 text-white">
          {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </form>

      <div className="space-y-4">
        {isSearching ? (
          // Loading skeletons
          Array(3)
            .fill(0)
            .map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-4 w-1/3" />
                </CardFooter>
              </Card>
            ))
        ) : hasSearched && results.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <FileText className="mb-2 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-medium">No results found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your search terms or explore different topics</p>
          </div>
        ) : (
          results.map((result) => (
            <Card key={result.id} className="overflow-hidden transition-all hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <CardTitle className="text-lg text-cardinal dark:text-gold">{result.title}</CardTitle>
                  <Badge variant="outline" className="ml-2 bg-gold/10 text-gold dark:bg-gold/20">
                    {Math.round(result.relevance * 100)}% match
                  </Badge>
                </div>
                <CardDescription className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="flex items-center">
                    <User className="mr-1 h-3 w-3" /> {result.author}
                  </span>
                  <span className="flex items-center">
                    <Calendar className="mr-1 h-3 w-3" /> {new Date(result.date).toLocaleDateString()}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {result.department}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {result.type}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{result.summary}</p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm" className="text-xs">
                  <BookOpen className="mr-1 h-3 w-3" /> View Full Document
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-cardinal hover:text-cardinal/90 dark:text-gold dark:hover:text-gold/90"
                >
                  Add to Reading List
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

