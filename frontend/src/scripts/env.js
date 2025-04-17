// scripts/check-env.js
require('dotenv').config();

console.log('\n=== ENVIRONMENT VARIABLE CHECK ===\n');

// List of required environment variables
const requiredVars = [
  'MY_OPENAI_API_KEY',
  'QDRANT_URL',
  'QDRANT_API_KEY'
];

// Check each variable
let allPresent = true;
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: Not found`);
    allPresent = false;
  } else {
    // Only show first few characters for security
    const maskedValue = value.substring(0, 4) + '...' + 
      (value.length > 8 ? value.substring(value.length - 4) : '');
    console.log(`✅ ${varName}: ${maskedValue}`);
  }
});

// src/lib/env.ts
console.log('Environment file location:', process.cwd());
console.log('All environment variables:', Object.keys(process.env));
console.log('MY_OPENAI_API_KEY first 5 chars:', process.env.MY_OPENAI_API_KEY?.substring(0, 6));

console.log('\n');

if (!allPresent) {
  console.log('⚠️ Some required environment variables are missing!');
  console.log('Make sure your .env file is in the root directory and properly formatted.');
  console.log('Example .env format:');
  console.log(`
MY_OPENAI_API_KEY=your-api-key
QDRANT_URL=your-qdrant-url
QDRANT_API_KEY=your-qdrant-api-key
`);
} else {
  console.log('✅ All required environment variables found!');
}

console.log('\n=================================\n');