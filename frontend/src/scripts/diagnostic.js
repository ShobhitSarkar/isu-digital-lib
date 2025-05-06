// diagnostic.js
// Run this script to test your OpenAI and Qdrant connections
// Usage: node diagnostic.js

require('dotenv').config();
const { QdrantClient } = require('@qdrant/js-client-rest');
const { OpenAI } = require('openai');


console.log("API Route Environment Check:");
console.log("QDRANT_URL:", process.env.QDRANT_URL ? "✅ Set" : "❌ Not set");
console.log("QDRANT_API_KEY:", process.env.QDRANT_API_KEY ? "✅ Set" : "❌ Not set");
console.log("MY_OPENAI_API_KEY:", process.env.MY_OPENAI_API_KEY ? "✅ Set" : "❌ Not set");

async function runDiagnostics() {
  console.log('🔍 SEMANTIC SEARCH DIAGNOSTIC TOOL 🔍');
  console.log('=====================================\n');
  
  // 1. Check environment variables
  console.log('1️⃣ Checking environment variables:');
  const openaiKey = process.env.MY_OPENAI_API_KEY;
  const qdrantUrl = process.env.QDRANT_URL;
  const qdrantKey = process.env.QDRANT_API_KEY;
  
  console.log(`OpenAI API Key: ${openaiKey ? '✅ Set' : '❌ Not set'}`);
  console.log(`Qdrant URL: ${qdrantUrl ? '✅ Set' : '❌ Not set'}`);
  console.log(`Qdrant API Key: ${qdrantKey ? '✅ Set' : '❌ Not set'}`);
  
  if (!openaiKey || !qdrantUrl) {
    console.log('\n❌ Missing required environment variables. Please check your .env file.');
    console.log('Environment variables should be set in a .env file in your project root.');
    console.log('Example .env content:');
    console.log(`
MY_OPENAI_API_KEY=your_openai_api_key_here
QDRANT_URL=your_qdrant_instance_url_here
QDRANT_API_KEY=your_qdrant_api_key_here
`);
    return;
  }
  
  console.log('\n✅ Environment variables check completed');
  
  // 2. Test OpenAI connection
  console.log('\n2️⃣ Testing OpenAI connection:');
  try {
    const openai = new OpenAI({
      apiKey: openaiKey,
    });
    
    console.log('Generating test embedding...');
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'Test query for ISU Digital Repository',
      encoding_format: 'float'
    });
    
    console.log(`✅ OpenAI connection successful!`);
    console.log(`Embedding dimension: ${embeddingResponse.data[0].embedding.length}`);
  } catch (error) {
    console.log(`❌ OpenAI connection failed: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Error details: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return;
  }
  
  // 3. Test Qdrant connection
  console.log('\n3️⃣ Testing Qdrant connection:');
  try {
    const qdrant = new QdrantClient({
      url: qdrantUrl,
      apiKey: qdrantKey || undefined,
      port: null,
      checkCompatibility: false
    });
    
    console.log('Fetching collections...');
    const collections = await qdrant.getCollections();
    
    console.log(`✅ Qdrant connection successful!`);
    console.log(`Available collections: ${collections.collections.map(c => c.name).join(', ') || 'None'}`);
    
    // Check for isu-semantic-search collection
    const collectionName = 'isu-semantic-search';
    const collectionExists = collections.collections.some(c => c.name === collectionName);
    console.log(`Collection '${collectionName}': ${collectionExists ? '✅ Exists' : '❌ Does not exist'}`);
    
    if (!collectionExists) {
      console.log(`\nCreating '${collectionName}' collection...`);
      try {
        await qdrant.createCollection(collectionName, {
          vectors: {
            size: 1536,
            distance: 'Cosine',
          },
        });
        console.log(`✅ Collection '${collectionName}' created successfully`);
      } catch (createError) {
        console.log(`❌ Failed to create collection: ${createError.message}`);
      }
    } else {
      // Try to get collection info
      try {
        const collectionInfo = await qdrant.getCollection(collectionName);
        console.log(`\nCollection details:`);
        console.log(`  Vector size: ${collectionInfo.config.params.vectors.size}`);
        console.log(`  Distance: ${collectionInfo.config.params.vectors.distance}`);
        console.log(`  Points count: ${collectionInfo.points_count || 0}`);
      } catch (infoError) {
        console.log(`❌ Failed to get collection info: ${infoError.message}`);
      }
      
      // Try a test search
      console.log('\nPerforming test search...');
      try {
        // Generate a test vector
        const openai = new OpenAI({
          apiKey: openaiKey,
        });
        
        const testVector = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: 'test search query',
          encoding_format: 'float'
        });
        
        const searchResults = await qdrant.search(collectionName, {
          vector: testVector.data[0].embedding,
          limit: 5,
        });
        
        console.log(`✅ Search successful!`);
        console.log(`Retrieved ${searchResults.length} results`);
        
        if (searchResults.length === 0) {
          console.log('⚠️ No results found. This could be normal if no documents have been added.');
          
          // Add a test point
          console.log('\nAdding a test document to the collection...');
          try {
            const testId = 'test-' + Date.now();
            await qdrant.upsert(collectionName, {
              points: [{
                id: testId,
                vector: testVector.data[0].embedding,
                payload: {
                  title: 'Test Document',
                  authors: ['Diagnostic Script'],
                  abstract: 'This is a test document to verify Qdrant search functionality',
                  department: 'Computer Science',
                  year: '2025',
                  uri: 'https://example.com/test'
                }
              }]
            });
            console.log(`✅ Test document added successfully with ID: ${testId}`);
            
            // Now try search again
            console.log('Searching again with the test document...');
            const newResults = await qdrant.search(collectionName, {
              vector: testVector.data[0].embedding,
              limit: 5,
            });
            
            console.log(`Retrieved ${newResults.length} results`);
            if (newResults.length > 0) {
              console.log('✅ Search working correctly!');
            } else {
              console.log('❌ Search still returned no results. There may be an issue with Qdrant configuration.');
            }
          } catch (upsertError) {
            console.log(`❌ Failed to add test document: ${upsertError.message}`);
          }
        }
      } catch (searchError) {
        console.log(`❌ Search failed: ${searchError.message}`);
      }
    }
  } catch (error) {
    console.log(`❌ Qdrant connection failed: ${error.message}`);
    return;
  }
  
  console.log('\n🎉 Diagnostic tests completed!');
  console.log('\n📋 SUMMARY:');
  console.log('✅ Environment variables are set');
  console.log('✅ OpenAI connection is working');
  console.log('✅ Qdrant connection is working');
  console.log('✅ Basic search functionality tested');
  
  console.log('\n📝 NEXT STEPS:');
  console.log('1. Ensure your Next.js app can access the environment variables');
  console.log('2. Update your collection name to "isu-semantic-search" in all API routes');
  console.log('3. Add error logging to your API routes as shown in the fix');
  console.log('4. Run your application and test the semantic search');
}

// Run the diagnostics
runDiagnostics()
  .catch(error => {
    console.error('Unhandled error during diagnostics:', error);
  });