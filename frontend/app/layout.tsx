import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'isu-semantic-serarch',
  description: 'Created for COMS 402 Spring 2025, Group 1',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
