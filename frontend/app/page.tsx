import { Search } from "@/components/search"
import { ChatInterface } from "@/components/chat-interface"
import { ResearchTopics } from "@/components/research-topics"
import { ModeToggle } from "@/components/mode-toggle"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ISULogo } from "@/components/isu-logo"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white dark:bg-gray-950">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <ISULogo className="h-8 w-8" />
            <h1 className="text-xl font-bold text-cardinal dark:text-gold">ISU Scholar Search</h1>
          </div>
          <div className="flex items-center gap-4">
            <ModeToggle />
          </div>
        </div>
      </header>
      <main className="container px-4 py-6 md:px-6 md:py-8">
        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-bold">Intelligent Academic Repository</h2>
          <p className="text-muted-foreground">
            Search Iowa State's digital repository using semantic search and AI-powered assistance.
          </p>
        </div>

        <Tabs defaultValue="search" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-3">
            <TabsTrigger value="search">Semantic Search</TabsTrigger>
            <TabsTrigger value="chat">AI Assistant</TabsTrigger>
            <TabsTrigger value="topics">Research Topics</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <Search />
          </TabsContent>

          <TabsContent value="chat" className="space-y-4">
            <ChatInterface />
          </TabsContent>

          <TabsContent value="topics" className="space-y-4">
            <ResearchTopics />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t bg-muted py-6">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Iowa State University. Computer Science Capstone Project.
            </p>
            <p className="text-sm text-muted-foreground">
              <a href="#" className="underline underline-offset-4">
                Accessibility
              </a>{" "}
              |
              <a href="#" className="underline underline-offset-4">
                {" "}
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

