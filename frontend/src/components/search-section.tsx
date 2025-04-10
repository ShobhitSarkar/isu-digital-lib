// src/components/search-section.tsx
"use client"

import type React from "react"
import { useState } from "react"
import { Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SearchSectionProps {
  onSearch: (query: string) => void;
}

export default function SearchSection({ onSearch }: SearchSectionProps) {
  const [query, setQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  }

  return (
    <section className="w-full max-w-4xl mx-auto">
      <p className="text-center text-muted-foreground mb-6">
        Ask questions about the academic papers in the repository
      </p>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Try 'What are the main challenges in wireless sensor networks?' or 'How are hand gestures recognized in computer vision?'"
            className="pl-10 pr-4"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
              <span className="sr-only">Filter</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Filter By</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked>All Documents</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Research Papers</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Theses & Dissertations</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Conference Papers</DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Departments</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem>Computer Science</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Engineering</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Agriculture</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Business</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button type="submit" className="bg-cardinal hover:bg-cardinal/90 text-white">
          Ask
        </Button>
      </form>
    </section>
  )
}