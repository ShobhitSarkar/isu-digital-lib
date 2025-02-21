from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
from datetime import datetime
from ..evaluation import MetricsTracker, CostTracker

@dataclass
class ModelResponse:
    """Standardized response format for all models"""
    content: str
    usage: Dict[str, int]  # tokens used (prompt_tokens, completion_tokens, total_tokens)
    latency: float  # response time in seconds
    timestamp: datetime
    model_name: str
    interface_type: str
    metadata: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    context_length: Optional[int] = None  # for vectorized approaches
    chunks_used: Optional[int] = None  # for vectorized approaches

class BaseModelInterface(ABC):
    """Abstract base class for all model interfaces"""
    
    def __init__(self, 
                 model_name: str, 
                 interface_type: str,
                 config: Dict[str, Any],
                 metrics_tracker: Optional[MetricsTracker] = None,
                 cost_tracker: Optional[CostTracker] = None):
        self.model_name = model_name
        self.interface_type = interface_type
        self.config = config
        self.metrics_tracker = metrics_tracker
        self.cost_tracker = cost_tracker
        
        # Local metrics (can be used without tracker)
        self.metrics = {
            'total_tokens': 0,
            'prompt_tokens': 0,
            'completion_tokens': 0,
            'total_requests': 0,
            'successful_requests': 0,
            'total_errors': 0,
            'average_latency': 0.0,
            'total_cost': 0.0
        }
    
    @abstractmethod
    async def generate_response(self, 
                              prompt: str, 
                              temperature: float = 0.7,
                              max_tokens: Optional[int] = None,
                              analysis_type: str = 'general') -> ModelResponse:
        """Generate a response from the model"""
        pass
    
    @abstractmethod
    async def batch_generate(self, 
                           prompts: List[str],
                           temperature: float = 0.7,
                           max_tokens: Optional[int] = None,
                           analysis_type: str = 'general') -> List[ModelResponse]:
        """Generate multiple responses in batch"""
        pass

    def _track_metrics(self, response: ModelResponse, analysis_type: str) -> None:
        """Track metrics both locally and in trackers"""
        # Update local metrics
        self.metrics['total_requests'] += 1
        if not response.error:
            self.metrics['successful_requests'] += 1
        
        # Update token counts
        self.metrics['prompt_tokens'] += response.usage.get('prompt_tokens', 0)
        self.metrics['completion_tokens'] += response.usage.get('completion_tokens', 0)
        self.metrics['total_tokens'] += response.usage.get('total_tokens', 0)
        
        # Update error count
        if response.error:
            self.metrics['total_errors'] += 1
        
        # Update average latency
        current_avg = self.metrics['average_latency']
        n = self.metrics['total_requests']
        self.metrics['average_latency'] = (current_avg * (n-1) + response.latency) / n

        # Track in MetricsTracker if available
        if self.metrics_tracker:
            self.metrics_tracker.add_metric(
                model=self.model_name,
                interface_type=self.interface_type,
                analysis_type=analysis_type,
                response_time=response.latency,
                token_count=response.usage.get('total_tokens', 0),
                success=not bool(response.error),
                error=response.error,
                context_length=response.context_length,
                chunks_used=response.chunks_used,
                response_length=len(response.content) if response.content else 0,
                metadata=response.metadata
            )

        # Track in CostTracker if available
        if self.cost_tracker:
            self.cost_tracker.add_usage_record(
                model=self.model_name,
                interface_type=self.interface_type,
                prompt_tokens=response.usage.get('prompt_tokens', 0),
                completion_tokens=response.usage.get('completion_tokens', 0),
                analysis_type=analysis_type,
                duration=response.latency,
                error=response.error
            )

    def get_metrics(self) -> Dict[str, Any]:
        """Get current local metrics"""
        metrics = self.metrics.copy()
        metrics['success_rate'] = (
            (metrics['successful_requests'] / metrics['total_requests'] * 100)
            if metrics['total_requests'] > 0 else 0
        )
        return metrics
    
    def get_performance_stats(self) -> Tuple[Dict[str, float], Dict[str, int]]:
        """Get detailed performance statistics"""
        metrics = self.get_metrics()
        
        performance_metrics = {
            'success_rate': metrics['success_rate'],
            'average_latency': metrics['average_latency'],
            'tokens_per_request': (
                metrics['total_tokens'] / metrics['total_requests']
                if metrics['total_requests'] > 0 else 0
            )
        }
        
        count_metrics = {
            'total_requests': metrics['total_requests'],
            'successful_requests': metrics['successful_requests'],
            'total_errors': metrics['total_errors'],
            'total_tokens': metrics['total_tokens']
        }
        
        return performance_metrics, count_metrics
    
    def reset_metrics(self) -> None:
        """Reset local metrics to initial state"""
        self.metrics = {
            'total_tokens': 0,
            'prompt_tokens': 0,
            'completion_tokens': 0,
            'total_requests': 0,
            'successful_requests': 0,
            'total_errors': 0,
            'average_latency': 0.0,
            'total_cost': 0.0
        }