import os
import time
from typing import Dict, Any, Optional, List
from datetime import datetime
import google.generativeai as genai
from dotenv import load_dotenv

from .base_model_interface import BaseModelInterface, ModelResponse
from ..evaluation import MetricsTracker, CostTracker

class GeminiInterface(BaseModelInterface):
    """Interface for Google's Gemini models"""
    
    # Default configurations for different Gemini models
    MODEL_CONFIGS = {
        'gemini-1.5-pro': {
            'max_output_tokens': 2048,
            'top_k': 1,
            'top_p': 1,
            'temperature': 0.7,
        },
        'gemini-2.0-flash': {
            'max_output_tokens': 2048,
            'top_k': 1,
            'top_p': 1,
            'temperature': 0.7,
        }
    }

    def __init__(self, 
                 model_name: str = 'gemini-1.5-pro',
                 api_key: Optional[str] = None,
                 metrics_tracker: Optional[MetricsTracker] = None,
                 cost_tracker: Optional[CostTracker] = None):
        """Initialize Gemini interface"""
        
        # Load API key from environment if not provided
        if api_key is None:
            load_dotenv()
            api_key = os.getenv('GOOGLE_API_KEY')
            if not api_key:
                raise ValueError("No API key provided and none found in environment")

        # Configure Google API
        genai.configure(api_key=api_key)

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

        # Initialize model
        self.model = genai.GenerativeModel(model_name)
        
        # Rate limiting settings
        self.last_request_time = 0
        self.min_request_interval = 0.5  # seconds between requests

    async def _count_tokens(self, text: str) -> int:
        """Count tokens in text using Gemini's tokenizer"""
        try:
            return len(self.model.count_tokens(text).total_tokens)
        except Exception as e:
            print(f"Error counting tokens: {e}")
            return 0

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
        """Generate a response from Gemini"""
        start_time = time.time()
        
        try:
            # Apply rate limiting
            await self._rate_limit()
            
            # Prepare generation config
            generation_config = {
                'temperature': temperature,
                'top_k': self.config['top_k'],
                'top_p': self.config['top_p'],
                'max_output_tokens': max_tokens or self.config['max_output_tokens']
            }

            # Count input tokens
            prompt_tokens = await self._count_tokens(prompt)

            # Generate response
            response = await self.model.generate_content(
                prompt,
                generation_config=generation_config
            )

            # Count output tokens
            completion_tokens = await self._count_tokens(response.text)
            total_tokens = prompt_tokens + completion_tokens

            # Calculate latency
            latency = time.time() - start_time

            # Create standardized response
            model_response = ModelResponse(
                content=response.text,
                usage={
                    'prompt_tokens': prompt_tokens,
                    'completion_tokens': completion_tokens,
                    'total_tokens': total_tokens
                },
                latency=latency,
                timestamp=datetime.now(),
                model_name=self.model_name,
                interface_type=self.interface_type,
                metadata={
                    'safety_ratings': response.prompt_feedback.safety_ratings if response.prompt_feedback else None,
                    'generation_config': generation_config
                }
            )

        except Exception as e:
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
                error=str(e)
            )

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
        # Clean up could go here if needed
        pass