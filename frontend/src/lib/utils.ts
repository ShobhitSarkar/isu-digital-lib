// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Ensures a URL has a protocol (https:// by default)
 * Now handles build-time placeholder values safely
 */
export function ensureProtocol(url: string | undefined): string {
  // During build time, we might have placeholder values
  if (!url || url === 'placeholder-during-build') {
    // Return a valid URL for build time
    return 'https://example.com';
  }
  
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  return `https://${url}`;
}