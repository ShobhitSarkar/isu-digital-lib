# Use Node.js 20 as the base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Create .env.production with properly formatted placeholder values
RUN echo "MY_OPENAI_API_KEY=sk-placeholder" > .env.production && \
    echo "QDRANT_URL=https://placeholder.qdrant.tech" >> .env.production && \
    echo "QDRANT_API_KEY=placeholder-key" >> .env.production

# Build with type checking disabled
ENV NODE_ENV=production
ENV NEXT_SKIP_TYPECHECK=true
ENV NEXT_SKIP_ESLINT=true
RUN npm run build

# Expose the port the app will run on
EXPOSE 3000

# Start the application
CMD ["node", ".next/standalone/server.js"]