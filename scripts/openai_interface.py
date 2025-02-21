import os
import time
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class OpenAIInterface:
    # Model context lengths (tokens)
    MODEL_CONTEXT_LENGTHS = {
        'gpt-4-turbo-preview': 128000,
        'gpt-4': 8192,
        'gpt-3.5-turbo': 4096,
        'gpt-3.5-turbo-16k': 16384
    }
    
    def __init__(self, model_name='gpt-4-turbo-preview'):
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.model_name = model_name
        self.model_context_length = self.MODEL_CONTEXT_LENGTHS.get(model_name, 128000)  # default to gpt-4-turbo-preview
        
        # Rate limiting settings
        self.RATE_LIMIT_DELAY = 3  # seconds between API calls
        self.RETRY_DELAY = 60      # seconds when rate limit is hit
        self.MAX_RETRIES = 3       # maximum retries per request
    
    def generate_response(self, prompt, temperature=0.7):
        """Generate response with retry logic and rate limiting."""
        for attempt in range(self.MAX_RETRIES):
            try:
                # Rate limiting delay
                time.sleep(self.RATE_LIMIT_DELAY)
                
                response = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature
                )
                return response.choices[0].message.content
                
            except Exception as e:
                print(f"Attempt {attempt + 1} failed: {e}")
                if "rate limit" in str(e).lower() and attempt < self.MAX_RETRIES - 1:
                    print(f"Rate limit hit. Waiting {self.RETRY_DELAY} seconds...")
                    time.sleep(self.RETRY_DELAY)
                    continue
                if attempt == self.MAX_RETRIES - 1:
                    raise e
        
        return None  # Should not reach here due to raise in loop