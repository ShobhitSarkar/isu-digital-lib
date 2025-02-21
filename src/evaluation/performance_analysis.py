from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
from scipy import stats
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
import json
import os
from dataclasses import dataclass
from .metrics import MetricsTracker
from .cost_tracking import CostTracker

@dataclass
class PerformanceAnalysis:
    """Class to hold performance analysis results"""
    model_name: str
    interface_type: str
    success_rate: float
    avg_response_time: float
    avg_token_usage: float
    cost_per_request: float
    error_rate: float
    sample_size: int

class PerformanceAnalyzer:
    """Analyze and compare performance across models and interfaces"""

    def __init__(self, metrics_tracker: MetricsTracker, cost_tracker: CostTracker, 
                 output_dir: str = 'data/analysis'):
        self.metrics_tracker = metrics_tracker
        self.cost_tracker = cost_tracker
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        
        # Set style for visualizations
        plt.style.use('seaborn')
        sns.set_palette("husl")

    def calculate_model_performance(self, model: str, 
                                  interface: str) -> PerformanceAnalysis:
        """Calculate performance metrics for a specific model and interface"""
        
        # Filter metrics for this model and interface
        relevant_metrics = [m for m in self.metrics_tracker.metrics 
                          if m.model == model and m.interface_type == interface]
        
        if not relevant_metrics:
            return None

        # Calculate basic metrics
        success_rate = sum(1 for m in relevant_metrics if m.success) / len(relevant_metrics)
        avg_response_time = np.mean([m.response_time for m in relevant_metrics])
        avg_token_usage = np.mean([m.token_count for m in relevant_metrics])
        error_rate = sum(1 for m in relevant_metrics if m.error) / len(relevant_metrics)

        # Calculate cost metrics
        relevant_costs = [r for r in self.cost_tracker.usage_records 
                        if r.model == model and r.interface_type == interface]
        cost_per_request = (np.mean([r.cost for r in relevant_costs]) 
                          if relevant_costs else 0)

        return PerformanceAnalysis(
            model_name=model,
            interface_type=interface,
            success_rate=success_rate * 100,
            avg_response_time=avg_response_time,
            avg_token_usage=avg_token_usage,
            cost_per_request=cost_per_request,
            error_rate=error_rate * 100,
            sample_size=len(relevant_metrics)
        )

    def compare_models(self) -> pd.DataFrame:
        """Compare performance across all models and interfaces"""
        results = []
        
        # Get unique model and interface combinations
        models = set(m.model for m in self.metrics_tracker.metrics)
        interfaces = set(m.interface_type for m in self.metrics_tracker.metrics)
        
        for model in models:
            for interface in interfaces:
                analysis = self.calculate_model_performance(model, interface)
                if analysis:
                    results.append(vars(analysis))
        
        return pd.DataFrame(results)

    def statistical_analysis(self) -> Dict[str, Any]:
        """Perform statistical analysis on performance metrics"""
        df = self.compare_models()
        
        stats_results = {
            'response_time': {
                'anova': stats.f_oneway(*[group['avg_response_time'].values 
                                        for name, group in df.groupby('model_name')]),
                'mean_comparison': df.groupby('model_name')['avg_response_time'].mean()
            },
            'success_rate': {
                'anova': stats.f_oneway(*[group['success_rate'].values 
                                        for name, group in df.groupby('model_name')]),
                'mean_comparison': df.groupby('model_name')['success_rate'].mean()
            },
            'cost_efficiency': {
                'anova': stats.f_oneway(*[group['cost_per_request'].values 
                                        for name, group in df.groupby('model_name')]),
                'mean_comparison': df.groupby('model_name')['cost_per_request'].mean()
            }
        }
        
        return stats_results

    def plot_performance_comparison(self, metric: str, save: bool = True):
        """Create visualization for performance comparison"""
        df = self.compare_models()
        
        plt.figure(figsize=(12, 6))
        
        if metric == 'response_time':
            sns.boxplot(data=df, x='model_name', y='avg_response_time')
            plt.title('Response Time Distribution by Model')
            plt.ylabel('Average Response Time (seconds)')
            
        elif metric == 'success_rate':
            sns.barplot(data=df, x='model_name', y='success_rate')
            plt.title('Success Rate by Model')
            plt.ylabel('Success Rate (%)')
            
        elif metric == 'cost':
            sns.barplot(data=df, x='model_name', y='cost_per_request')
            plt.title('Cost per Request by Model')
            plt.ylabel('Cost per Request ($)')
        
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        if save:
            plt.savefig(os.path.join(self.output_dir, f'{metric}_comparison.png'))
            plt.close()

    def analyze_interface_impact(self) -> Dict[str, Any]:
        """Analyze the impact of different interfaces on performance"""
        df = self.compare_models()
        
        interface_analysis = {
            interface: {
                'response_time': {
                    'mean': df[df['interface_type'] == interface]['avg_response_time'].mean(),
                    'std': df[df['interface_type'] == interface]['avg_response_time'].std()
                },
                'success_rate': {
                    'mean': df[df['interface_type'] == interface]['success_rate'].mean(),
                    'std': df[df['interface_type'] == interface]['success_rate'].std()
                },
                'cost_efficiency': {
                    'mean': df[df['interface_type'] == interface]['cost_per_request'].mean(),
                    'std': df[df['interface_type'] == interface]['cost_per_request'].std()
                }
            }
            for interface in df['interface_type'].unique()
        }
        
        return interface_analysis

    def create_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance analysis report"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'overall_comparison': self.compare_models().to_dict('records'),
            'statistical_analysis': self.statistical_analysis(),
            'interface_analysis': self.analyze_interface_impact(),
            'summary_metrics': {
                'total_requests': len(self.metrics_tracker.metrics),
                'total_cost': self.cost_tracker.get_total_cost(),
                'overall_success_rate': np.mean([m.success for m in self.metrics_tracker.metrics]) * 100,
                'average_response_time': np.mean([m.response_time for m in self.metrics_tracker.metrics])
            }
        }
        
        return report

    def save_report(self, report: Dict[str, Any], 
                   filename: str = 'performance_report.json'):
        """Save performance report to file"""
        output_path = os.path.join(self.output_dir, filename)
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"Performance report saved to {output_path}")

    def generate_visualizations(self):
        """Generate all performance visualizations"""
        metrics = ['response_time', 'success_rate', 'cost']
        for metric in metrics:
            self.plot_performance_comparison(metric)

    def run_full_analysis(self):
        """Run complete performance analysis and generate report"""
        report = self.create_performance_report()
        self.save_report(report)
        self.generate_visualizations()
        return report