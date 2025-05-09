# Base Node.js image
FROM --platform=linux/amd64 node:20-alpine AS base

# Install dependencies with more resources
FROM base AS deps
WORKDIR /app
COPY package*.json ./
# Install ALL dependencies (including dev dependencies)
RUN npm ci

# Build with generous resource allocation
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set proper environment variables for the build
ENV NODE_ENV=production
ENV NEXT_PUBLIC_BASE_PATH=""

# Build the application
RUN NODE_OPTIONS="--max-old-space-size=4096" npx next build

# Production image, copy all files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]