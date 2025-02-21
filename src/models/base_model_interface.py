from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime

@dataclass
class ModelResponse:
    """Standardized response format for all models"""
    content: str
    usage: Dict[str, int]  # tokens used
    latency: float  # response time in seconds
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class BaseModelInterface(ABC):
    """Abstract base class for all model interfaces"""
    
    def __init__(self, model_name: str, config: Dict[str, Any]):
        self.model_name = model_name
        self.config = config
        self.metrics = {
            'total_tokens': 0,
            'total_requests': 0,
            'total_errors': 0,
            'average_latency': 0.0
        }
    
    @abstractmethod
    async def generate_response(self, 
                              prompt: str, 
                              temperature: float = 0.7,
                              max_tokens: Optional[int] = None) -> ModelResponse:
        """Generate a response from the model"""
        pass
    
    @abstractmethod
    async def batch_generate(self, 
                           prompts: List[str],
                           temperature: float = 0.7,
                           max_tokens: Optional[int] = None) -> List[ModelResponse]:
        """Generate multiple responses in batch"""
        pass
    
    def update_metrics(self, response: ModelResponse) -> None:
        """Update usage metrics"""
        self.metrics['total_requests'] += 1
        self.metrics['total_tokens'] += response.usage.get('total_tokens', 0)
        if response.error:
            self.metrics['total_errors'] += 1
        
        # Update average latency
        current_avg = self.metrics['average_latency']
        n = self.metrics['total_requests']
        self.metrics['average_latency'] = (current_avg * (n-1) + response.latency) / n
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics"""
        return self.metrics
    
    def reset_metrics(self) -> None:
        """Reset metrics to initial state"""
        self.metrics = {
            'total_tokens': 0,
            'total_requests': 0,
            'total_errors': 0,
            'average_latency': 0.0
        }