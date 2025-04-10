// src/components/answer-section.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, ExternalLink } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface AnswerSectionProps {
  answer: string;
  citations: any[];
  loading: boolean;
}

export default function AnswerSection({ answer, citations, loading }: AnswerSectionProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  }

  // Process the answer to highlight citations
  const processAnswer = (text: string) => {
    if (!text) return '';
    
    // Replace [Doc X] with a styled span
    return text.replace(/\[Doc (\d+)\]/g, (match, num) => {
      const docIndex = parseInt(num) - 1;
      if (docIndex >= 0 && docIndex < citations.length) {
        return `<span class="bg-cardinal/10 text-cardinal dark:bg-gold/10 dark:text-gold px-1 rounded" data-index="${docIndex}">[${num}]</span>`;
      }
      return match;
    });
  };

  return (
    <section className="flex-1 flex flex-col">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Answer</h2>
      </div>

      {loading ? (
        <Card className="w-full mb-6">
          <CardContent className="pt-6">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-5/6 mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ) : answer ? (
        <Card className="w-full mb-6">
          <CardContent className="pt-6">
            <div 
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: processAnswer(answer) }}
            />
          </CardContent>
        </Card>
      ) : null}

      {citations.length > 0 && !loading && (
        <>
          <div className="mb-4 mt-6">
            <h2 className="text-xl font-semibold">Sources</h2>
          </div>

          <div className="space-y-4">
            {citations.map((citation, index) => (
              <Card key={citation.id} className="w-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-cardinal/10 text-cardinal dark:bg-gold/10 dark:text-gold">
                          [{index + 1}]
                        </Badge>
                        <CardTitle className="text-lg">{citation.title}</CardTitle>
                      </div>
                      <CardDescription>
                        {citation.authors ? (Array.isArray(citation.authors) ? citation.authors.join(', ') : citation.authors) : 'Unknown Author'} • {citation.year || 'n.d.'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{citation.abstract?.slice(0, 200)}...</p>
                  <div className="flex flex-wrap gap-2">
                    {citation.department && (
                      <Badge variant="outline" className="bg-cardinal/10 text-cardinal dark:bg-gold/10 dark:text-gold">
                        {citation.department}
                      </Badge>
                    )}
                    {citation.documentType && (
                      <Badge variant="outline" className="bg-cardinal/10 text-cardinal dark:bg-gold/10 dark:text-gold">
                        {citation.documentType}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="mt-4 p-3 bg-muted/30 rounded-md flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">{citation.citation}</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyToClipboard(citation.citation)}
                      className="ml-2"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  {citation.uri && (
                    <Button
                      variant="link"
                      className="text-cardinal hover:text-cardinal/80 dark:text-gold dark:hover:text-gold/80 p-0"
                      onClick={() => window.open(citation.uri, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" /> View Full Document
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      )}
    </section>
  )
}