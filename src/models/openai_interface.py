import os
import time
from typing import Dict, Any, Optional, List
from datetime import datetime
from openai import AsyncOpenAI
from dotenv import load_dotenv

from .base_model_interface import BaseModelInterface, ModelResponse
from ..evaluation import MetricsTracker, CostTracker

class OpenAIInterface(BaseModelInterface):
    """Interface for OpenAI's models"""
    
    # Default configurations for different OpenAI models
    MODEL_CONFIGS = {
        'gpt-4': {
            'max_tokens': 8192,
            'top_p': 1,
            'frequency_penalty': 0,
            'presence_penalty': 0,
            'temperature': 0.7,
        },
        'gpt-4-turbo-preview': {
            'max_tokens': 4096,
            'top_p': 1,
            'frequency_penalty': 0,
            'presence_penalty': 0,
            'temperature': 0.7,
        }
    }

    def __init__(self, 
                 model_name: str = 'gpt-4-turbo-preview',
                 api_key: Optional[str] = None,
                 metrics_tracker: Optional[MetricsTracker] = None,
                 cost_tracker: Optional[CostTracker] = None):
        """Initialize OpenAI interface"""
        
        # Load API key from environment if not provided
        if api_key is None:
            load_dotenv()
            api_key = os.getenv('OPENAI_API_KEY')
            if not api_key:
                raise ValueError("No API key provided and none found in environment")

        # Get model configuration
        if model_name not in self.MODEL_CONFIGS:
            raise ValueError(f"Unsupported model: {model_name}")
        config = self.MODEL_CONFIGS[model_name].copy()
        
        # Initialize base class
        super().__init__(
            model_name=model_name,
            interface_type='api',
            config=config,
            metrics_tracker=metrics_tracker,
            cost_tracker=cost_tracker
        )

        # Initialize OpenAI client
        self.client = AsyncOpenAI(api_key=api_key)
        
        # Rate limiting settings
        self.last_request_time = 0
        self.min_request_interval = 0.5  # seconds between requests
        self.retry_attempts = 3
        self.base_retry_delay = 1  # seconds

    async def _rate_limit(self):
        """Implement rate limiting"""
        current_time = time.time()
        time_since_last_request = current_time - self.last_request_time
        if time_since_last_request < self.min_request_interval:
            await time.sleep(self.min_request_interval - time_since_last_request)
        self.last_request_time = time.time()

    async def generate_response(self,
                              prompt: str,
                              temperature: float = 0.7,
                              max_tokens: Optional[int] = None,
                              analysis_type: str = 'general') -> ModelResponse:
        """Generate a response from OpenAI"""
        start_time = time.time()
        attempts = 0
        
        while attempts < self.retry_attempts:
            try:
                # Apply rate limiting
                await self._rate_limit()
                
                # Prepare messages
                messages = [{"role": "user", "content": prompt}]
                
                # Generate response
                response = await self.client.chat.completions.create(
                    model=self.model_name,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens or self.config['max_tokens'],
                    top_p=self.config['top_p'],
                    frequency_penalty=self.config['frequency_penalty'],
                    presence_penalty=self.config['presence_penalty']
                )

                # Calculate latency
                latency = time.time() - start_time

                # Create standardized response
                model_response = ModelResponse(
                    content=response.choices[0].message.content,
                    usage={
                        'prompt_tokens': response.usage.prompt_tokens,
                        'completion_tokens': response.usage.completion_tokens,
                        'total_tokens': response.usage.total_tokens
                    },
                    latency=latency,
                    timestamp=datetime.now(),
                    model_name=self.model_name,
                    interface_type=self.interface_type,
                    metadata={
                        'finish_reason': response.choices[0].finish_reason,
                        'response_id': response.id,
                        'created': response.created
                    }
                )
                
                break  # Success, exit retry loop

            except Exception as e:
                attempts += 1
                if attempts == self.retry_attempts:
                    latency = time.time() - start_time
                    model_response = ModelResponse(
                        content='',
                        usage={
                            'prompt_tokens': 0,
                            'completion_tokens': 0,
                            'total_tokens': 0
                        },
                        latency=latency,
                        timestamp=datetime.now(),
                        model_name=self.model_name,
                        interface_type=self.interface_type,
                        error=f"Final error after {attempts} attempts: {str(e)}"
                    )
                else:
                    # Wait before retrying with exponential backoff
                    retry_delay = self.base_retry_delay * (2 ** (attempts - 1))
                    await time.sleep(retry_delay)

        # Track metrics
        self._track_metrics(model_response, analysis_type)
        
        return model_response

    async def batch_generate(self,
                           prompts: List[str],
                           temperature: float = 0.7,
                           max_tokens: Optional[int] = None,
                           analysis_type: str = 'general') -> List[ModelResponse]:
        """Generate multiple responses in batch"""
        responses = []
        for prompt in prompts:
            response = await self.generate_response(
                prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                analysis_type=analysis_type
            )
            responses.append(response)
        return responses

    async def __aenter__(self):
        """Async context manager entry"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        # Cleanup could go here if needed
        pass