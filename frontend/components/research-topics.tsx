"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, TrendingUp, BookOpen, Users, Filter } from "lucide-react"

interface Topic {
  id: string
  name: string
  description: string
  papers: number
  trending: boolean
  departments: string[]
}

export function ResearchTopics() {
  const [searchTerm, setSearchTerm] = useState("")
  const [topics, setTopics] = useState<Topic[]>([
    {
      id: "1",
      name: "Sustainable Agriculture",
      description:
        "Research on environmentally responsible farming practices, soil health, and crop rotation strategies.",
      papers: 156,
      trending: true,
      departments: ["Agronomy", "Environmental Science"],
    },
    {
      id: "2",
      name: "Machine Learning in Healthcare",
      description:
        "Applications of AI and machine learning algorithms for medical diagnosis, patient care, and healthcare management.",
      papers: 89,
      trending: true,
      departments: ["Computer Science", "Biomedical Engineering", "Medicine"],
    },
    {
      id: "3",
      name: "Renewable Energy Systems",
      description:
        "Studies on solar, wind, and biofuel technologies with focus on efficiency improvements and implementation strategies.",
      papers: 112,
      trending: false,
      departments: ["Mechanical Engineering", "Electrical Engineering"],
    },
    {
      id: "4",
      name: "Climate Change Adaptation",
      description:
        "Research on strategies for adapting to changing climate conditions, particularly in agricultural and urban contexts.",
      papers: 78,
      trending: true,
      departments: ["Environmental Science", "Urban Planning", "Agronomy"],
    },
    {
      id: "5",
      name: "Quantum Computing",
      description:
        "Theoretical and applied research in quantum information processing, algorithms, and hardware development.",
      papers: 45,
      trending: false,
      departments: ["Computer Science", "Physics"],
    },
    {
      id: "6",
      name: "Food Security",
      description:
        "Studies addressing challenges in food production, distribution, and access, with emphasis on vulnerable populations.",
      papers: 67,
      trending: false,
      departments: ["Sociology", "Agronomy", "Economics"],
    },
  ])

  const filteredTopics = topics.filter(
    (topic) =>
      topic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.departments.some((dept) => dept.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Research Topics Explorer</h2>
          <p className="text-sm text-muted-foreground">Discover trending research areas and explore related papers</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search topics..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Topics</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="departments">By Department</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Filter className="mr-2 h-4 w-4" />
            More Filters
          </Button>
        </div>

        <TabsContent value="all" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTopics.length > 0 ? (
              filteredTopics.map((topic) => <TopicCard key={topic.id} topic={topic} />)
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <BookOpen className="mb-2 h-10 w-10 text-muted-foreground" />
                <h3 className="text-lg font-medium">No topics found</h3>
                <p className="text-sm text-muted-foreground">Try adjusting your search terms</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="trending" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTopics.filter((t) => t.trending).length > 0 ? (
              filteredTopics
                .filter((topic) => topic.trending)
                .map((topic) => <TopicCard key={topic.id} topic={topic} />)
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <TrendingUp className="mb-2 h-10 w-10 text-muted-foreground" />
                <h3 className="text-lg font-medium">No trending topics found</h3>
                <p className="text-sm text-muted-foreground">Check back later for new trending research areas</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="departments" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* This would ideally be grouped by department */}
            {filteredTopics.length > 0 ? (
              filteredTopics.map((topic) => <TopicCard key={topic.id} topic={topic} />)
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <Users className="mb-2 h-10 w-10 text-muted-foreground" />
                <h3 className="text-lg font-medium">No departments found</h3>
                <p className="text-sm text-muted-foreground">Try adjusting your search terms</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TopicCard({ topic }: { topic: Topic }) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg text-cardinal dark:text-gold">{topic.name}</CardTitle>
          {topic.trending && (
            <Badge className="bg-gold text-white">
              <TrendingUp className="mr-1 h-3 w-3" /> Trending
            </Badge>
          )}
        </div>
        <CardDescription>
          {topic.papers} papers • {topic.departments.join(", ")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">{topic.description}</p>
        <div className="flex flex-wrap gap-2">
          {topic.departments.map((dept) => (
            <Badge key={dept} variant="outline">
              {dept}
            </Badge>
          ))}
        </div>
        <div className="mt-4 flex justify-between">
          <Button variant="outline" size="sm">
            <BookOpen className="mr-2 h-3 w-3" /> View Papers
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-cardinal hover:text-cardinal/90 dark:text-gold dark:hover:text-gold/90"
          >
            Follow Topic
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

