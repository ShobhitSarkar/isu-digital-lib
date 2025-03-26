import { getQdrantClient, COLLECTION_NAME } from '../lib/qdrant-client';
import { OpenAI } from 'openai';
import * as fs from 'fs/promises';
import * as path from 'path';
import pdfParse from 'pdf-parse';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw error;
    }
  }
  

async function getEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  });
  return response.data[0].embedding;
}

async function main() {
  const client = getQdrantClient();
  // Using absolute path to the documents directory
  const documentsDir = path.join(__dirname, '..', 'documents');
  
  try {
    const files = await fs.readdir(documentsDir);
    console.log(`Found ${files.length} files in documents directory`);
    
    for (const file of files) {
      if (file.endsWith('.pdf')) {
        const fileBuffer = await fs.readFile(path.join(documentsDir, file));
        const content = await extractTextFromPDF(fileBuffer);
        const embedding = await getEmbedding(content);
        
        await client.upsert(COLLECTION_NAME, {
          points: [{
            id: file,
            vector: embedding,
            payload: {
              text: content,
              filename: file
            }
          }]
        });
        
        console.log(`Added document: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error adding documents:', error);
  }
}

main();