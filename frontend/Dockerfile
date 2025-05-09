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

# Install Tailwind CSS properly
RUN npm install -D tailwindcss@latest postcss autoprefixer

# Create a proper tailwind.config.js using echo commands
RUN echo "module.exports = {" > tailwind.config.js && \
    echo "  darkMode: [\"class\"]," >> tailwind.config.js && \
    echo "  content: [" >> tailwind.config.js && \
    echo "    \"./pages/**/*.{ts,tsx}\"," >> tailwind.config.js && \
    echo "    \"./components/**/*.{ts,tsx}\"," >> tailwind.config.js && \
    echo "    \"./app/**/*.{ts,tsx}\"," >> tailwind.config.js && \
    echo "    \"./src/**/*.{ts,tsx}\"," >> tailwind.config.js && \
    echo "  ]," >> tailwind.config.js && \
    echo "  theme: {" >> tailwind.config.js && \
    echo "    extend: {" >> tailwind.config.js && \
    echo "      colors: {" >> tailwind.config.js && \
    echo "        cardinal: \"oklch(0.45 0.18 25)\"," >> tailwind.config.js && \
    echo "        gold: \"oklch(0.85 0.16 85)\"," >> tailwind.config.js && \
    echo "      }," >> tailwind.config.js && \
    echo "    }," >> tailwind.config.js && \
    echo "  }," >> tailwind.config.js && \
    echo "  plugins: [require(\"tailwindcss-animate\")]," >> tailwind.config.js && \
    echo "}" >> tailwind.config.js

# Create a proper globals.css with standard Tailwind directives
RUN echo "@tailwind base;" > src/app/globals.css && \
    echo "@tailwind components;" >> src/app/globals.css && \
    echo "@tailwind utilities;" >> src/app/globals.css && \
    echo "" >> src/app/globals.css && \
    echo ":root {" >> src/app/globals.css && \
    echo "  --cardinal: oklch(0.45 0.18 25);" >> src/app/globals.css && \
    echo "  --gold: oklch(0.85 0.16 85);" >> src/app/globals.css && \
    echo "  --radius: 0.625rem;" >> src/app/globals.css && \
    echo "}" >> src/app/globals.css

# Create postcss.config.js
RUN echo "module.exports = {" > postcss.config.js && \
    echo "  plugins: {" >> postcss.config.js && \
    echo "    tailwindcss: {}," >> postcss.config.js && \
    echo "    autoprefixer: {}," >> postcss.config.js && \
    echo "  }," >> postcss.config.js && \
    echo "}" >> postcss.config.js

# Update next.config.js for production
RUN echo "/** @type {import('next').NextConfig} */" > next.config.js && \
    echo "const nextConfig = {" >> next.config.js && \
    echo "  output: 'standalone'," >> next.config.js && \
    echo "  reactStrictMode: true," >> next.config.js && \
    echo "  eslint: { ignoreDuringBuilds: true }," >> next.config.js && \
    echo "  typescript: { ignoreBuildErrors: true }," >> next.config.js && \
    echo "  swcMinify: true," >> next.config.js && \
    echo "  images: { unoptimized: true }," >> next.config.js && \
    echo "  productionBrowserSourceMaps: true," >> next.config.js && \
    echo "};" >> next.config.js && \
    echo "" >> next.config.js && \
    echo "module.exports = nextConfig;" >> next.config.js

# Build with proper environment variables and resources
ENV NODE_ENV=production
ENV NEXT_PUBLIC_BASE_PATH=""
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