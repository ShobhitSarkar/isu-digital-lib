from typing import Dict, Any, List, Optional
from datetime import datetime
import json
import os
from dataclasses import dataclass, asdict
import logging
import statistics
from collections import defaultdict

@dataclass
class PerformanceMetric:
    """Record of a single performance measurement"""
    timestamp: str
    model: str
    interface_type: str
    analysis_type: str
    response_time: float  # in seconds
    token_count: int
    success: bool
    error: Optional[str] = None
    context_length: Optional[int] = None  # for vectorized approaches
    chunks_used: Optional[int] = None  # for vectorized approaches
    response_length: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None

class MetricsTracker:
    """Track performance metrics across different models and interfaces"""

    def __init__(self, output_dir: str = 'data/metrics'):
        """Initialize metrics tracker"""
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        self.metrics: List[PerformanceMetric] = []
        self.setup_logging()

    def setup_logging(self):
        """Setup logging configuration"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(os.path.join(self.output_dir, 'metrics_tracking.log')),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

    def add_metric(self,
                  model: str,
                  interface_type: str,
                  analysis_type: str,
                  response_time: float,
                  token_count: int,
                  success: bool,
                  error: Optional[str] = None,
                  context_length: Optional[int] = None,
                  chunks_used: Optional[int] = None,
                  response_length: Optional[int] = None,
                  metadata: Optional[Dict[str, Any]] = None):
        """Add a new performance metric"""
        metric = PerformanceMetric(
            timestamp=datetime.now().isoformat(),
            model=model,
            interface_type=interface_type,
            analysis_type=analysis_type,
            response_time=response_time,
            token_count=token_count,
            success=success,
            error=error,
            context_length=context_length,
            chunks_used=chunks_used,
            response_length=response_length,
            metadata=metadata
        )
        
        self.metrics.append(metric)
        self.logger.info(
            f"Added metric for {model} ({interface_type}): "
            f"response_time={response_time:.2f}s, success={success}"
        )

    def get_success_rate(self, group_by: Optional[str] = None) -> Dict[str, float]:
        """Calculate success rate, optionally grouped by a field"""
        if not self.metrics:
            return {}

        if group_by:
            groups = defaultdict(list)
            for metric in self.metrics:
                group_value = getattr(metric, group_by)
                groups[group_value].append(metric.success)
            
            return {
                group: (sum(successes) / len(successes)) * 100
                for group, successes in groups.items()
            }
        
        success_rate = (sum(1 for m in self.metrics if m.success) / len(self.metrics)) * 100
        return {'overall': success_rate}

    def get_average_response_time(self, group_by: Optional[str] = None) -> Dict[str, float]:
        """Calculate average response time, optionally grouped by a field"""
        if not self.metrics:
            return {}

        if group_by:
            groups = defaultdict(list)
            for metric in self.metrics:
                group_value = getattr(metric, group_by)
                groups[group_value].append(metric.response_time)
            
            return {
                group: statistics.mean(times)
                for group, times in groups.items()
            }
        
        avg_time = statistics.mean(m.response_time for m in self.metrics)
        return {'overall': avg_time}

    def get_token_usage_stats(self, group_by: Optional[str] = None) -> Dict[str, Dict[str, float]]:
        """Calculate token usage statistics, optionally grouped by a field"""
        if not self.metrics:
            return {}

        def calc_stats(tokens: List[int]) -> Dict[str, float]:
            return {
                'mean': statistics.mean(tokens),
                'median': statistics.median(tokens),
                'min': min(tokens),
                'max': max(tokens),
                'std_dev': statistics.stdev(tokens) if len(tokens) > 1 else 0
            }

        if group_by:
            groups = defaultdict(list)
            for metric in self.metrics:
                group_value = getattr(metric, group_by)
                groups[group_value].append(metric.token_count)
            
            return {
                group: calc_stats(tokens)
                for group, tokens in groups.items()
            }
        
        return {'overall': calc_stats([m.token_count for m in self.metrics])}

    def get_error_distribution(self, group_by: Optional[str] = None) -> Dict[str, Dict[str, int]]:
        """Get distribution of errors, optionally grouped by a field"""
        if not self.metrics:
            return {}

        def count_errors(metrics_list: List[PerformanceMetric]) -> Dict[str, int]:
            error_counts = defaultdict(int)
            for m in metrics_list:
                if m.error:
                    error_counts[m.error] += 1
            return dict(error_counts)

        if group_by:
            groups = defaultdict(list)
            for metric in self.metrics:
                group_value = getattr(metric, group_by)
                groups[group_value].append(metric)
            
            return {
                group: count_errors(metrics_list)
                for group, metrics_list in groups.items()
            }
        
        return {'overall': count_errors(self.metrics)}

    def get_vectorized_metrics(self) -> Dict[str, Any]:
        """Get metrics specific to vectorized approaches"""
        vectorized_metrics = [m for m in self.metrics if m.chunks_used is not None]
        if not vectorized_metrics:
            return {}

        return {
            'average_chunks_used': statistics.mean(m.chunks_used for m in vectorized_metrics),
            'average_context_length': statistics.mean(m.context_length for m in vectorized_metrics if m.context_length),
            'chunk_usage_distribution': defaultdict(int, {
                str(m.chunks_used): vectorized_metrics.count(m) for m in vectorized_metrics
            })
        }

    def get_performance_summary(self) -> Dict[str, Any]:
        """Get comprehensive performance summary"""
        return {
            'total_requests': len(self.metrics),
            'success_rates': {
                'overall': self.get_success_rate(),
                'by_model': self.get_success_rate(group_by='model'),
                'by_interface': self.get_success_rate(group_by='interface_type'),
                'by_analysis': self.get_success_rate(group_by='analysis_type')
            },
            'response_times': {
                'overall': self.get_average_response_time(),
                'by_model': self.get_average_response_time(group_by='model'),
                'by_interface': self.get_average_response_time(group_by='interface_type')
            },
            'token_usage': {
                'overall': self.get_token_usage_stats(),
                'by_model': self.get_token_usage_stats(group_by='model')
            },
            'errors': self.get_error_distribution(group_by='model'),
            'vectorized_metrics': self.get_vectorized_metrics()
        }

    def save_metrics(self, filename: str = 'performance_metrics.json'):
        """Save all metrics to file"""
        output_path = os.path.join(self.output_dir, filename)
        metrics_dict = [asdict(metric) for metric in self.metrics]
        
        with open(output_path, 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'metrics': metrics_dict,
                'summary': self.get_performance_summary()
            }, f, indent=2)
        
        self.logger.info(f"Saved {len(self.metrics)} metrics to {output_path}")

    def load_metrics(self, filename: str = 'performance_metrics.json'):
        """Load metrics from file"""
        input_path = os.path.join(self.output_dir, filename)
        
        with open(input_path, 'r') as f:
            data = json.load(f)
            self.metrics = [
                PerformanceMetric(**metric) for metric in data['metrics']
            ]
        
        self.logger.info(f"Loaded {len(self.metrics)} metrics from {input_path}")

    def reset(self):
        """Reset all metrics"""
        self.metrics = []
        self.logger.info("Reset all metrics")