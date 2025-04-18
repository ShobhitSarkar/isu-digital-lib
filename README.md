# isu-semantic-search 

## Project Overview

The ISU Semantic Search is a Retrieval Augmented Generation (RAG) library that enables semantic search capabilities for Iowa State University's Computer Science department's academic papers and research documents. 

## Purpose of the project

- Create a search system for ISU's academic papers 
- Natural language querying of research documents 
- Document retrieval using semantic search 
- AI powered document analysis providing support to academic research 

## Key features

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

3. **RAG Implementation**
- OpenAI embeddings integration 
- Qdrant vector database storage 
- Context-aware response generatioon 
- Source citations 

## Architecture overview - Microservice Architecture

We have a monolithic implementation right now. We follow a `src/app/api` architecture right now, with dedicated paths for semantic search and assistant functionality. 


Need to refactor and move to a microservice architecture shown in this picture: 

![alt text](isu-chatbot.jpg)

## API Endpoints: 

- `POST /api/search`: Semantic search
- `POST /api/ask`: Question answering


## Running the application

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
MY_OPENAI_API_KEY=your_openai_key
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_key

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
```

In order to access the vectorized database for the semantic search functionality, here are the Qdrant details: 

```
QDRANT_URL=https://bae87590-0dea-4de8-89d6-e6d2ec8c718a.us-east4-0.gcp.cloud.qdrant.io
QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.uOONpNQ6YBORt0_grlaZ05MUp1PX5luubHgMRk4qXw8
```

### Running the project locally 

```
nvm i && npm i && npm run dev
```