import { getQdrantClient, ensureCollection } from '../lib/qdrant-client';

async function testConnection() {
  try {
    const client = getQdrantClient();
    await ensureCollection();
    console.log('Successfully connected to Qdrant!');
  } catch (error) {
    console.error('Failed to connect to Qdrant:', error);
  }
}

testConnection();