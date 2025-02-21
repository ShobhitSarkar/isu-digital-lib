from typing import Dict, Any, Optional, List
from datetime import datetime
import json
import os
from dataclasses import dataclass, asdict
import logging

@dataclass
class UsageRecord:
    """Record of a single API call's usage"""
    timestamp: str
    model: str
    interface_type: str  # 'api', 'web', 'anything_llm'
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cost: float
    analysis_type: str  # 'basic_qa', 'context_qa', 'vector_qa', 'vector_context_qa'
    duration: float  # in seconds
    error: Optional[str] = None

class CostTracker:
    """Track costs and usage across different models and interfaces"""

    # Cost per 1000 tokens for different models (in USD)
    MODEL_COSTS = {
        'gpt-4': {'input': 0.03, 'output': 0.06},
        'gpt-4-0613': {'input': 0.03, 'output': 0.06},
        'gpt-4-32k': {'input': 0.06, 'output': 0.12},
        'gpt-3.5-turbo': {'input': 0.0015, 'output': 0.002},
        'gpt-3.5-turbo-16k': {'input': 0.003, 'output': 0.004},
        'gemini-pro': {'input': 0.00025, 'output': 0.0005},
        'gemini-1.5-pro': {'input': 0.0005, 'output': 0.001},
        'claude-3-opus': {'input': 0.015, 'output': 0.075},
        'claude-3-sonnet': {'input': 0.003, 'output': 0.015}
    }

    def __init__(self, output_dir: str = 'data/costs'):
        """Initialize cost tracker"""
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        self.usage_records: List[UsageRecord] = []
        self.setup_logging()

    def setup_logging(self):
        """Setup logging configuration"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(os.path.join(self.output_dir, 'cost_tracking.log')),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

    def calculate_cost(self, model: str, prompt_tokens: int, completion_tokens: int) -> float:
        """Calculate cost for a specific usage"""
        if model not in self.MODEL_COSTS:
            self.logger.warning(f"Unknown model: {model}. Cost calculation may be inaccurate.")
            return 0.0
        
        costs = self.MODEL_COSTS[model]
        input_cost = (prompt_tokens / 1000) * costs['input']
        output_cost = (completion_tokens / 1000) * costs['output']
        return input_cost + output_cost

    def add_usage_record(self, 
                        model: str,
                        interface_type: str,
                        prompt_tokens: int,
                        completion_tokens: int,
                        analysis_type: str,
                        duration: float,
                        error: Optional[str] = None):
        """Add a new usage record"""
        total_tokens = prompt_tokens + completion_tokens
        cost = self.calculate_cost(model, prompt_tokens, completion_tokens)
        
        record = UsageRecord(
            timestamp=datetime.now().isoformat(),
            model=model,
            interface_type=interface_type,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            cost=cost,
            analysis_type=analysis_type,
            duration=duration,
            error=error
        )
        
        self.usage_records.append(record)
        self.logger.info(f"Added usage record for {model} ({interface_type}): {total_tokens} tokens, ${cost:.4f}")

    def get_total_cost(self) -> float:
        """Get total cost across all usage"""
        return sum(record.cost for record in self.usage_records)

    def get_cost_by_model(self) -> Dict[str, float]:
        """Get costs grouped by model"""
        costs = {}
        for record in self.usage_records:
            costs[record.model] = costs.get(record.model, 0) + record.cost
        return costs

    def get_cost_by_interface(self) -> Dict[str, float]:
        """Get costs grouped by interface type"""
        costs = {}
        for record in self.usage_records:
            costs[record.interface_type] = costs.get(record.interface_type, 0) + record.cost
        return costs

    def get_cost_by_analysis(self) -> Dict[str, float]:
        """Get costs grouped by analysis type"""
        costs = {}
        for record in self.usage_records:
            costs[record.analysis_type] = costs.get(record.analysis_type, 0) + record.cost
        return costs

    def get_usage_summary(self) -> Dict[str, Any]:
        """Get comprehensive usage summary"""
        return {
            'total_cost': self.get_total_cost(),
            'total_tokens': sum(r.total_tokens for r in self.usage_records),
            'total_requests': len(self.usage_records),
            'average_tokens_per_request': sum(r.total_tokens for r in self.usage_records) / len(self.usage_records) if self.usage_records else 0,
            'average_cost_per_request': self.get_total_cost() / len(self.usage_records) if self.usage_records else 0,
            'total_errors': sum(1 for r in self.usage_records if r.error is not None),
            'costs_by_model': self.get_cost_by_model(),
            'costs_by_interface': self.get_cost_by_interface(),
            'costs_by_analysis': self.get_cost_by_analysis(),
            'total_duration': sum(r.duration for r in self.usage_records),
            'average_duration': sum(r.duration for r in self.usage_records) / len(self.usage_records) if self.usage_records else 0
        }

    def save_records(self, filename: str = 'cost_records.json'):
        """Save all usage records to file"""
        output_path = os.path.join(self.output_dir, filename)
        records_dict = [asdict(record) for record in self.usage_records]
        
        with open(output_path, 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'records': records_dict,
                'summary': self.get_usage_summary()
            }, f, indent=2)
        
        self.logger.info(f"Saved {len(self.usage_records)} records to {output_path}")

    def load_records(self, filename: str = 'cost_records.json'):
        """Load usage records from file"""
        input_path = os.path.join(self.output_dir, filename)
        
        with open(input_path, 'r') as f:
            data = json.load(f)
            self.usage_records = [
                UsageRecord(**record) for record in data['records']
            ]
        
        self.logger.info(f"Loaded {len(self.usage_records)} records from {input_path}")

    def reset(self):
        """Reset all records"""
        self.usage_records = []
        self.logger.info("Reset all usage records")