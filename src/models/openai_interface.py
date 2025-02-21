import time
from typing import Dict, Any, Optional, List
from datetime import datetime
from openai import AsyncOpenAI
from .base_model_interface import BaseModelInterface, ModelResponse

class OpenAIInterface(BaseModelInterface):
    def __init__(self, model_name: str = "gpt-4-turbo-preview", api_key: Optional[str] = None):
        config = {
            'api_key': api_key,
            'timeout': 60,
            'max_retries': 3,
            'retry_delay': 5
        }
        super().__init__(model_name, config)
        self.client = AsyncOpenAI(api_key=api_key)
        
    async def generate_response(self, 
                              prompt: str, 
                              temperature: float = 0.7,
                              max_tokens: Optional[int] = None) -> ModelResponse:
        start_time = time.time()
        try:
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            model_response = ModelResponse(
                content=response.choices[0].message.content,
                usage={
                    'prompt_tokens': response.usage.prompt_tokens,
                    'completion_tokens': response.usage.completion_tokens,
                    'total_tokens': response.usage.total_tokens
                },
                latency=time.time() - start_time,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            model_response = ModelResponse(
                content="",
                usage={'total_tokens': 0},
                latency=time.time() - start_time,
                timestamp=datetime.now(),
                error=str(e)
            )
        
        self.update_metrics(model_response)
        return model_response
    
    async def batch_generate(self, 
                           prompts: List[str],
                           temperature: float = 0.7,
                           max_tokens: Optional[int] = None) -> List[ModelResponse]:
        responses = []
        for prompt in prompts:
            response = await self.generate_response(prompt, temperature, max_tokens)
            responses.append(response)
        return responses