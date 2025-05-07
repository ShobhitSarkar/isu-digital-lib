"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import PaperUploader from "@/components/paper-uploader"
import ChatInterface from "@/components/chat-interface"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

export type UploadedPaper = {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: Date
  content?: string
}

export default function ChatTab() {
  const [uploadedPapers, setUploadedPapers] = useState<UploadedPaper[]>([])
  const [isCleaningUp, setIsCleaningUp] = useState(false)
  const [cleanupStatus, setCleanupStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handlePaperUpload = (papers: UploadedPaper[]) => {
    console.log("Papers uploaded:", papers);
    setUploadedPapers((prev) => {
      const updated = [...prev, ...papers]
      return updated
    })
  }
  
  // Function to handle manual paper removal
  const handleRemovePaper = async (paperId: string) => {
    try {
      // Find the paper name to remove from Qdrant
      const paperToRemove = uploadedPapers.find(p => p.id === paperId);
      if (!paperToRemove) {
        console.error("Paper not found:", paperId);
        return;
      }
      
      console.log("Removing paper:", paperToRemove.name);
      
      // Remove paper from Qdrant
      setIsCleaningUp(true);
      const response = await fetch("/api/assistant/cleanup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          action: "remove_paper", 
          paperName: paperToRemove.name 
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to remove paper: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Paper removal response:", data);
      
      // If successful, remove from local state
      if (data.success) {
        setUploadedPapers(prev => prev.filter(p => p.id !== paperId));
        setCleanupStatus('success');
      } else {
        setCleanupStatus('error');
      }
    } catch (error) {
      console.error("Paper removal failed:", error);
      setCleanupStatus('error');
    } finally {
      setIsCleaningUp(false);
      // Reset status after 3 seconds
      setTimeout(() => setCleanupStatus('idle'), 3000);
    }
  }
  
  // Cleanup function to be called when component unmounts
  const cleanup = async () => {
    try {
      console.log("Running collection cleanup...");
      setIsCleaningUp(true);
      
      const response = await fetch("/api/assistant/cleanup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "cleanup" }),
      });
      
      if (!response.ok) {
        throw new Error(`Cleanup failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Cleanup response:", data);
      
      if (data.success) {
        setUploadedPapers([]);
        setCleanupStatus('success');
      } else {
        setCleanupStatus('error');
      }
    } catch (error) {
      console.error("Cleanup failed:", error);
      setCleanupStatus('error');
    } finally {
      setIsCleaningUp(false);
      // Reset status after 3 seconds
      setTimeout(() => setCleanupStatus('idle'), 3000);
    }
  };

  // Add event listener for page unload/refresh
  useEffect(() => {
    // Function to handle beforeunload event
    const handleBeforeUnload = () => {
      // We can't await the cleanup directly in beforeunload, 
      // so we try our best by just triggering it
      fetch("/api/assistant/cleanup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "cleanup" }),
        // Setting keepalive to true allows the request to complete
        // even if the page is being unloaded
        keepalive: true,
      }).catch(err => console.error("Cleanup error:", err));
    };

    // Add event listener
    window.addEventListener("beforeunload", handleBeforeUnload);
    
    // Component unmount cleanup
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      cleanup();
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-6">
        <p className="text-center text-muted-foreground">
          Upload academic papers and ask questions about their content
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 flex-1">
        <Card className="lg:hidden">
          <CardHeader>
            <CardTitle>Uploaded Papers</CardTitle>
            <CardDescription>Upload papers to ask questions about them</CardDescription>
          </CardHeader>
          <CardContent>
            <PaperUploader onUpload={handlePaperUpload} />
            
            {/* Status messages */}
            {cleanupStatus === 'success' && (
              <div className="mt-2 p-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 text-xs rounded">
                Operation completed successfully
              </div>
            )}
            
            {cleanupStatus === 'error' && (
              <div className="mt-2 p-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 text-xs rounded">
                An error occurred. Please try again.
              </div>
            )}

            {isCleaningUp && (
              <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 text-xs rounded flex items-center">
                <div className="mr-2 h-3 w-3 rounded-full bg-yellow-500 animate-pulse"></div>
                Processing...
              </div>
            )}
            
            {/* Show 2 most recent papers if any on mobile */}
            {uploadedPapers.length > 0 && (
              <div className="mt-4">
                <p className="font-medium text-sm mb-2">{uploadedPapers.length} papers uploaded</p>
                <div className="space-y-2">
                  {uploadedPapers.slice(0, 2).map((paper) => (
                    <div key={paper.id} className="p-3 border rounded-md">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 mr-2">
                          <p className="font-medium truncate text-xs">{paper.name}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {uploadedPapers.length > 2 && (
                    <p className="text-xs text-muted-foreground">
                      +{uploadedPapers.length - 2} more papers
                    </p>
                  )}
                </div>
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-xs py-1"
                    onClick={cleanup}
                    disabled={isCleaningUp}
                  >
                    Clear All Papers
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hidden lg:block lg:col-span-1">
          {/* Original desktop sidebar content */}
          <CardHeader>
            <CardTitle>Uploaded Papers</CardTitle>
            <CardDescription>Upload papers to ask questions about them</CardDescription>
          </CardHeader>
          <CardContent>
            <PaperUploader onUpload={handlePaperUpload} />

            {cleanupStatus === 'success' && (
              <div className="mt-2 p-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 text-xs rounded">
                Operation completed successfully
              </div>
            )}
            
            {cleanupStatus === 'error' && (
              <div className="mt-2 p-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 text-xs rounded">
                An error occurred. Please try again.
              </div>
            )}

            {isCleaningUp && (
              <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 text-xs rounded flex items-center">
                <div className="mr-2 h-3 w-3 rounded-full bg-yellow-500 animate-pulse"></div>
                Processing...
              </div>
            )}

            {uploadedPapers.length > 0 ? (
              <ScrollArea className="h-[400px] mt-4">
                <div className="space-y-2">
                  {uploadedPapers.map((paper) => (
                    <div key={paper.id} className="p-3 border rounded-md">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 mr-2">
                          <p className="font-medium truncate">{paper.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(paper.uploadedAt instanceof Date
                              ? paper.uploadedAt.toLocaleString()
                              : new Date(paper.uploadedAt).toLocaleString())}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleRemovePaper(paper.id)}
                          className="text-muted-foreground hover:text-red-500 p-1 flex-shrink-0"
                          disabled={isCleaningUp}
                          title="Remove paper"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No papers uploaded yet.</p>
            )}
            
            {uploadedPapers.length > 0 && (
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                  onClick={cleanup}
                  disabled={isCleaningUp}
                >
                  Clear All Papers
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <ChatInterface uploadedPapers={uploadedPapers} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}