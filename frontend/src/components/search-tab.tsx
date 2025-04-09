import SearchSection from "@/components/search-section"
import ResultsSection from "@/components/results-section"

export default function SearchTab() {
  return (
    <div className="flex-1 flex flex-col">
      <SearchSection />
      <div className="mt-8 flex-1">
        <ResultsSection />
      </div>
    </div>
  )
}
