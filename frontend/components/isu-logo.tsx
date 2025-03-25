import type { SVGProps } from "react"

export function ISULogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      {...props}
      className={`text-cardinal dark:text-gold ${props.className || ""}`}
    >
      <rect x="10" y="10" width="80" height="80" rx="5" strokeWidth="4" />
      <path d="M30 30h40" strokeWidth="6" strokeLinecap="round" />
      <path d="M50 30v40" strokeWidth="6" strokeLinecap="round" />
      <path d="M30 70h40" strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}

