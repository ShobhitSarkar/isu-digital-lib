# isu-semantic-search 

## Project Overview

The ISU Semantic Search is a Retrieval Augmented Generation (RAG) library that enables semantic search capabilities for Iowa State University's Computer Science department's academic papers and research documents. 

## Purpose of the project

- Create a search system for ISU's academic papers 
- Natural language querying of research documents 
- Document retrieval using semantic search 
- AI powered document analysis providing support to academic research 

### Key features

1. **Semantic Search:** 
- Natural language query processing 
- Context-aware document retrieval 
- Document similarity matching 
- Relevancing ranking 

2. **Document Processing:** 
- Automatic PDF parsing 
- Metadata extraction 
- Text chunking 
- Vector embedding generation 

3. RAG Implementation 
- OpenAI embeddings integration 
- Qdrant vector database storage 
- Context-aware response generatioon 
- Source citations 

### Architecture overview - Microservice Architecture

We have a monolithic implementation right now. Need to refactor and move to a microservice architecture. 

![alt text](isu-chatbot.jpg)

## Prerequisites

### Required tools and technologies
1. Node.js (18+)
2. npm/yarn or package manager 

### API keys needed 
1. **OpenAI API Key:** 
- Used for: Embeddings and completion models 
- Obtain from OpenAI platform 

2. **Qdrant API Key:** 
- Used for: Vector database operations 
- Obtain from: Self hosted or Qdrant Cloud 

### Environment setup

1. **Environment Variables:** 
Create a `.env` file with the following format: 

```
# Backend
OPENAI_API_KEY=your_openai_key
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_key

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Running the project locally 

```
nvm i && npm i && npm run dev
```