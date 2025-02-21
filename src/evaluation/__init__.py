from .metrics import (
    MetricsTracker,
    PerformanceMetric
)

from .cost_tracking import (
    CostTracker,
    UsageRecord
)

from .performance_analysis import (
    PerformanceAnalyzer,
    PerformanceAnalysis
)

__all__ = [
    # Metrics related
    'MetricsTracker',
    'PerformanceMetric',
    
    # Cost tracking related
    'CostTracker',
    'UsageRecord',
    
    # Performance analysis related
    'PerformanceAnalyzer',
    'PerformanceAnalysis'
]

# Version info
__version__ = '0.1.0'

# Module level documentation
__doc__ = """
Evaluation module for LLM Research Project

This module provides tools for:
1. Tracking performance metrics
2. Monitoring API costs
3. Analyzing model performance

Main components:
- MetricsTracker: Track performance metrics across models and interfaces
- CostTracker: Monitor API usage and associated costs
- PerformanceAnalyzer: Analyze and compare model performance
"""