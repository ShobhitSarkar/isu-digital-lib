import Header from "@/components/header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import SearchTab from "@/components/search-tab"
import ChatTab from "@/components/chat-tab"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="container mx-auto px-4 py-6 flex-1 flex flex-col">
        <h1 className="text-3xl font-bold text-center mb-6 text-cardinal dark:text-gold">
          Iowa State University Digital Repository
        </h1>

        <Tabs defaultValue="search" className="flex-1 flex flex-col">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
            <TabsTrigger value="search">Semantic Search</TabsTrigger>
            <TabsTrigger value="chat">Paper Assistant</TabsTrigger>
          </TabsList>
          <TabsContent value="search" className="flex-1 flex flex-col">
            <SearchTab />
          </TabsContent>
          <TabsContent value="chat" className="flex-1 flex flex-col">
            <ChatTab />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
