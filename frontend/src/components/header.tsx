import { ModeToggle } from "./mode-toggle"
import { UserCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Header() {
  return (
    <header className="border-b" style={{ backgroundColor: 'oklch(0.45 0.18 25)' }}>
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gold flex items-center justify-center text-cardinal font-bold text-sm sm:text-xl">
              ISU
            </div>
            <span className="text-sm sm:text-xl font-semibold text-white">Digital Repository</span>
          </Link>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <ModeToggle />
          <Button variant="ghost" size="icon" className="text-white hover:text-gold">
            <UserCircle className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}