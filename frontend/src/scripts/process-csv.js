// frontend/src/scripts/process-csv.js

const fs = require('fs');
const path = require('path');
const { parse } = require('papaparse');
const { QdrantClient } = require('@qdrant/js-client-rest');
const { OpenAI } = require('openai');
require('dotenv').config();

// Collection settings
const COLLECTION_NAME = 'isu-semantic-search';
const VECTOR_SIZE = 1536; // OpenAI ada-002 embeddings are 1536 dimensions

// Initialize OpenAI with direct API key configuration
console.log('Initializing OpenAI client...');
const openai = new OpenAI({
  apiKey: process.env.MY_OPENAI_API_KEY,
  defaultHeaders: {
    'Authorization': `Bearer ${process.env.MY_OPENAI_API_KEY}`
  }
});

// Test OpenAI connectivity
async function testOpenAIConnection() {
  try {
    console.log('Testing OpenAI connection with embedding request...');
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: "Hello world",
      encoding_format: "float"
    });
    
    if (response && response.data && response.data[0] && response.data[0].embedding) {
      console.log(`✅ OpenAI connection successful! Embedding dimension: ${response.data[0].embedding.length}`);
      return true;
    } else {
      console.error('⚠️ Unexpected response format from OpenAI:', response);
      return false;
    }
  } catch (error) {
    console.error('❌ OpenAI connection failed:', error.message);
    console.error('Full error:', error);
    return false;
  }
}

async function processCSV() {
  try {
    // First test OpenAI connectivity
    const openaiConnected = await testOpenAIConnection();
    if (!openaiConnected) {
      console.error('OpenAI connection failed. Please check your API key and network connectivity.');
      console.log('Try setting the MY_OPENAI_API_KEY environment variable directly rather than using a .env file.');
      console.log('For example: MY_OPENAI_API_KEY=your-key node src/scripts/process-csv-fixed.js');
      return;
    }

    // Initialize Qdrant client
    console.log('Initializing Qdrant client...');
    const qdrant = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      port: null,
    });

    // Check if collection exists
    try {
      console.log('Checking if collection exists...');
      const collections = await qdrant.getCollections();
      if (!collections.collections.some(c => c.name === COLLECTION_NAME)) {
        console.log(`Creating collection "${COLLECTION_NAME}"...`);
        await qdrant.createCollection(COLLECTION_NAME, {
          vectors: {
            size: VECTOR_SIZE,
            distance: 'Cosine',
          },
        });
        console.log('Collection created successfully');
      } else {
        console.log(`Collection "${COLLECTION_NAME}" already exists`);
      }
    } catch (error) {
      console.error('Qdrant connection failed:', error.message);
      return;
    }

    // Read CSV file
    const csvPath = path.join(process.cwd(), 'data', 'papers.csv');
    if (!fs.existsSync(csvPath)) {
      console.error(`CSV file not found: ${csvPath}`);
      console.log('Please create a data directory in your project root and place your papers.csv file there');
      return;
    }
    
    const csvData = fs.readFileSync(csvPath, 'utf8');
    console.log(`Read CSV file: ${csvPath}`);

    // Parse CSV
    const parsedData = parse(csvData, {
      header: true,
      skipEmptyLines: true,
    });
    
    const data = parsedData.data;
    console.log(`Parsed ${data.length} rows from CSV`);

    // Transform data
    const papers = data.map((row) => ({
      id: row.id || `paper-${Math.random().toString(36).substring(2, 15)}`,
      title: row['dc.title'] || '',
      authors: row['dc.contributor.author'] ? row['dc.contributor.author'].split('||') : [],
      abstract: row['dc.description.abstract'] || '',
      department: row['dc.contributor.department'] ? row['dc.contributor.department'].split('::')[0] : '',
      year: row['dc.date.issued'] || '',
      documentType: row['dc.type'] || '',
      uri: row['dc.identifier.uri'] || '',
    }));

    console.log(`Processing ${papers.length} papers...`);

    // Process a small batch first as a test
    console.log('Processing a test batch of 2 papers...');
    const testBatch = papers.slice(0, 2);
    const points = [];
    
    for (const paper of testBatch) {
      if (!paper.abstract) {
        console.log(`Skipping paper with no abstract: ${paper.title}`);
        continue;
      }
      
      // Combine title and abstract for better semantic search
      const content = `${paper.title}. ${paper.abstract}`.substring(0, 8000);
      
      try {
        console.log(`Generating embedding for: "${paper.title.substring(0, 50)}..."`);
        
        // Generate embedding using OpenAI with explicit model specification
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: content,
          encoding_format: "float"
        });
        
        if (!embeddingResponse.data || !embeddingResponse.data[0] || !embeddingResponse.data[0].embedding) {
          console.error('Unexpected embedding response format:', JSON.stringify(embeddingResponse).substring(0, 200));
          continue;
        }
        
        const embedding = embeddingResponse.data[0].embedding;
        console.log(`✅ Successfully generated embedding with dimension: ${embedding.length}`);
        
        points.push({
          id: paper.id,
          vector: embedding,
          payload: {
            title: paper.title,
            authors: paper.authors,
            abstract: paper.abstract,
            department: paper.department,
            year: paper.year,
            documentType: paper.documentType,
            uri: paper.uri,
          },
        });
      } catch (error) {
        console.error(`Error processing paper: ${paper.title}`);
        console.error(`Error message: ${error.message}`);
        console.error('Full error:', error);
      }
      
      // Add a delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Upload test batch to Qdrant
    if (points.length > 0) {
      console.log(`Uploading ${points.length} embeddings to Qdrant...`);
      try {
        await qdrant.upsert(COLLECTION_NAME, {
          points: points,
          wait: true,
        });
        console.log('✅ Successfully uploaded embeddings to Qdrant');
      } catch (error) {
        console.error('Error uploading embeddings to Qdrant:');
        console.error(`Error message: ${error.message}`);
      }
    } else {
      console.log('No embeddings were generated to upload');
    }

    console.log('Test completed successfully! Now processing all papers...');

    // Process all papers in batches
    console.log('Processing all papers in batches...');
    const BATCH_SIZE = 5;
    const allPoints = [];
    
    for (let i = 0; i < papers.length; i += BATCH_SIZE) {
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(papers.length / BATCH_SIZE)}`);
      
      const batch = papers.slice(i, i + BATCH_SIZE);
      const batchPoints = [];
      
      for (const paper of batch) {
        if (!paper.abstract) {
          console.log(`Skipping paper with no abstract: ${paper.title}`);
          continue;
        }
        
        const content = `${paper.title}. ${paper.abstract}`.substring(0, 8000);
        
        try {
          console.log(`Generating embedding for: "${paper.title.substring(0, 50)}..."`);
          
          const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: content,
            encoding_format: "float"
          });
          
          const embedding = embeddingResponse.data[0].embedding;
          
          batchPoints.push({
            id: paper.id,
            vector: embedding,
            payload: {
              title: paper.title,
              authors: paper.authors,
              abstract: paper.abstract,
              department: paper.department,
              year: paper.year,
              documentType: paper.documentType,
              uri: paper.uri,
            },
          });
          
          console.log(`✅ Processed paper: ${paper.title.substring(0, 50)}...`);
        } catch (error) {
          console.error(`Error generating embedding for ${paper.title}: ${error.message}`);
        }
        
        // Add a delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Upload batch to Qdrant
      if (batchPoints.length > 0) {
        try {
          await qdrant.upsert(COLLECTION_NAME, {
            points: batchPoints,
            wait: true,
          });
          console.log(`✅ Uploaded batch ${Math.floor(i / BATCH_SIZE) + 1}`);
          
          allPoints.push(...batchPoints);
        } catch (error) {
          console.error(`Error uploading batch: ${error.message}`);
        }
      }
    }
    
    console.log(`Successfully processed and uploaded ${allPoints.length} papers`);

  } catch (error) {
    console.error('Error during processing:', error);
  }
}

// Run the script
processCSV()
  .then(() => console.log('Script completed'))
  .catch(error => console.error('Fatal error during processing:', error));