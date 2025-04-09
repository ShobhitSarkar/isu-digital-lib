"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

// Mock data for demonstration
const mockResults = [
  {
    id: 1,
    title: "Machine Learning Applications in Agricultural Yield Prediction",
    authors: "Johnson, A., Smith, B., & Williams, C.",
    year: 2023,
    department: "Computer Science",
    type: "Research Paper",
    abstract:
      "This paper explores the application of various machine learning algorithms to predict agricultural yields based on historical data and environmental factors. The study demonstrates significant improvements in prediction accuracy compared to traditional statistical methods.",
    saved: false,
  },
  {
    id: 2,
    title: "Sustainable Energy Solutions for Rural Communities",
    authors: "Garcia, M. & Thompson, R.",
    year: 2022,
    department: "Engineering",
    type: "Thesis",
    abstract:
      "This thesis investigates cost-effective and sustainable energy solutions for rural communities in Iowa. The research includes case studies of implemented systems and their economic and environmental impacts over a five-year period.",
    saved: true,
  },
  {
    id: 3,
    title: "Genetic Diversity in Iowa's Native Prairie Plants",
    authors: "Lee, S., Johnson, P., & Miller, T.",
    year: 2021,
    department: "Agriculture",
    type: "Conference Paper",
    abstract:
      "This paper presents findings on the genetic diversity of native prairie plants in Iowa's preserved natural areas. The research highlights the importance of conservation efforts and provides recommendations for maintaining biodiversity.",
    saved: false,
  },
]

export default function ResultsSection() {
  const [results, setResults] = useState(mockResults)
  const [loading, setLoading] = useState(false)

  const toggleSaved = (id: number) => {
    setResults(results.map((result) => (result.id === id ? { ...result, saved: !result.saved } : result)))
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
      ) : (
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
                    {result.saved ? <BookmarkCheck className="h-5 w-5 text-gold" /> : <Bookmark className="h-5 w-5" />}
                    <span className="sr-only">{result.saved ? "Remove from saved" : "Save document"}</span>
                  </Button>
                </div>
                <CardDescription>
                  {result.authors} • {result.year}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{result.abstract}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-cardinal/10 text-cardinal dark:bg-gold/10 dark:text-gold">
                    {result.department}
                  </Badge>
                  <Badge variant="outline" className="bg-cardinal/10 text-cardinal dark:bg-gold/10 dark:text-gold">
                    {result.type}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button
                  variant="link"
                  className="text-cardinal hover:text-cardinal/80 dark:text-gold dark:hover:text-gold/80 p-0"
                >
                  View Full Document
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center mt-6">
        <Button variant="outline" size="sm" disabled>
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <div className="text-sm text-muted-foreground">Page 1 of 1</div>
        <Button variant="outline" size="sm" disabled>
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </section>
  )
}
