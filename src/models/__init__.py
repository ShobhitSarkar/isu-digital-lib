from .base_model_interface import BaseModelInterface, ModelResponse
from .openai_interface import OpenAIInterface
from .gemini_interface import GeminiInterface

__all__ = [
    # Base classes
    'BaseModelInterface',
    'ModelResponse',
    
    # Model interfaces
    'OpenAIInterface',
    'GeminiInterface'
]

# Version info
__version__ = '0.1.0'

# Module level documentation
__doc__ = """
Models module for LLM Research Project

This module provides interfaces for different LLM providers:
1. OpenAI (GPT-4, GPT-4 Turbo)
2. Google (Gemini-1.5-Pro, Gemini-2.0-Flash)

Each interface implements the BaseModelInterface, ensuring consistent:
- Response formats
- Error handling
- Metrics tracking
- Cost monitoring
"""