from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime
import json
import os

@dataclass
class AnalysisResult:
    """Standard format for analysis results"""
    question_id: str
    question: str
    response: str
    model_name: str
    interface_type: str  # 'api', 'web', 'anything_llm'
    metrics: Dict[str, Any]
    timestamp: datetime
    error: Optional[str] = None

class BasePaperAnalyzer(ABC):
    """Base class for paper analysis"""
    
    def __init__(self, output_dir: str = 'results'):
        self.output_dir = output_dir
        self.results = []
        os.makedirs(output_dir, exist_ok=True)
    
    @abstractmethod
    async def analyze_paper(self, paper_text: str, model_interface: Any) -> List[AnalysisResult]:
        """Analyze a single paper"""
        pass
    
    @abstractmethod
    async def analyze_papers(self, papers: List[str], model_interface: Any) -> List[List[AnalysisResult]]:
        """Analyze multiple papers"""
        pass
    
    def save_results(self, filename: str) -> None:
        """Save analysis results to file"""
        output_path = os.path.join(self.output_dir, filename)
        
        # Convert results to dictionary format
        results_dict = {
            'timestamp': datetime.now().isoformat(),
            'results': [
                {
                    'question_id': r.question_id,
                    'question': r.question,
                    'response': r.response,
                    'model_name': r.model_name,
                    'interface_type': r.interface_type,
                    'metrics': r.metrics,
                    'timestamp': r.timestamp.isoformat(),
                    'error': r.error
                }
                for r in self.results
            ]
        }
        
        with open(output_path, 'w') as f:
            json.dump(results_dict, f, indent=2)
    
    def load_results(self, filename: str) -> None:
        """Load analysis results from file"""
        input_path = os.path.join(self.output_dir, filename)
        
        with open(input_path, 'r') as f:
            data = json.load(f)
            
        self.results = [
            AnalysisResult(
                question_id=r['question_id'],
                question=r['question'],
                response=r['response'],
                model_name=r['model_name'],
                interface_type=r['interface_type'],
                metrics=r['metrics'],
                timestamp=datetime.fromisoformat(r['timestamp']),
                error=r['error']
            )
            for r in data['results']
        ]
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get summary of analysis metrics"""
        summary = {
            'total_analyses': len(self.results),
            'errors': sum(1 for r in self.results if r.error is not None),
            'models': {},
            'interfaces': {}
        }
        
        # Summarize by model
        for result in self.results:
            if result.model_name not in summary['models']:
                summary['models'][result.model_name] = {
                    'count': 0,
                    'errors': 0,
                    'avg_latency': 0.0
                }
            
            model_stats = summary['models'][result.model_name]
            model_stats['count'] += 1
            if result.error:
                model_stats['errors'] += 1
            model_stats['avg_latency'] = (
                (model_stats['avg_latency'] * (model_stats['count'] - 1) +
                 result.metrics.get('latency', 0)) / model_stats['count']
            )
        
        # Summarize by interface
        for result in self.results:
            if result.interface_type not in summary['interfaces']:
                summary['interfaces'][result.interface_type] = {
                    'count': 0,
                    'errors': 0
                }
            
            interface_stats = summary['interfaces'][result.interface_type]
            interface_stats['count'] += 1
            if result.error:
                interface_stats['errors'] += 1
        
        return summary