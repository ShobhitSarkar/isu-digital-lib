// src/components/results-section.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Copy } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface ResultsSectionProps {
  results: any[];
  loading: boolean;
}

export default function ResultsSection({ results, loading }: ResultsSectionProps) {
  const [savedResults, setSavedResults] = useState<Record<string, boolean>>({});
  
  const toggleSaved = (id: string) => {
    setSavedResults(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  }

  return (
    <section className="flex-1 flex flex-col">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Search Results</h2>
        <p className="text-muted-foreground">Showing {results.length} results</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="w-full">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-4 w-1/4" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4 flex-1">
          {results.map((result) => (
            <Card key={result.id} className="w-full">
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <CardTitle className="text-lg">{result.title}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleSaved(result.id)}
                    className="text-muted-foreground hover:text-cardinal"
                  >
                    {savedResults[result.id] ? <BookmarkCheck className="h-5 w-5 text-gold" /> : <Bookmark className="h-5 w-5" />}
                    <span className="sr-only">{savedResults[result.id] ? "Remove from saved" : "Save document"}</span>
                  </Button>
                </div>
                <CardDescription>
                  {result.authors ? (Array.isArray(result.authors) ? result.authors.join(', ') : result.authors) : 'Unknown Author'} • {result.year || 'n.d.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{result.abstract}</p>
                <div className="flex flex-wrap gap-2">
                  {result.department && (
                    <Badge variant="outline" className="bg-cardinal/10 text-cardinal dark:bg-gold/10 dark:text-gold">
                      {result.department}
                    </Badge>
                  )}
                  {result.documentType && (
                    <Badge variant="outline" className="bg-cardinal/10 text-cardinal dark:bg-gold/10 dark:text-gold">
                      {result.documentType}
                    </Badge>
                  )}
                </div>
                
                {result.citation && (
                  <div className="mt-4 p-3 bg-muted/30 rounded-md flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">{result.citation}</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyToClipboard(result.citation)}
                      className="ml-2"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-2">
                {result.uri && (
                  <Button
                    variant="link"
                    className="text-cardinal hover:text-cardinal/80 dark:text-gold dark:hover:text-gold/80 p-0"
                    onClick={() => window.open(result.uri, '_blank')}
                  >
                    View Full Document
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">No results found. Try a different search query.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="flex justify-between items-center mt-6">
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <div className="text-sm text-muted-foreground">Page 1 of 1</div>
          <Button variant="outline" size="sm" disabled>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </section>
  )
}