from typing import Dict, List, Any
from datetime import datetime
from ..models import BaseModelInterface
from .base_analyzer import BasePaperAnalyzer, AnalysisResult

class ContextQAAnalyzer(BasePaperAnalyzer):
    """Analyzer for cross-paper contextual analysis"""
    
    CONTEXT_QUESTIONS = {
        'comparative': [
            'What are the main methodological differences between these papers?',
            'How do the papers complement or contradict each other?'
        ],
        'thematic': [
            'What common themes or patterns emerge across all papers?',
            'How do these papers collectively advance the field?'
        ],
        'synthesis': [
            'What are the shared limitations across these papers?',
            'What future research directions are suggested by considering all papers together?'
        ]
    }

    def __init__(self, output_dir: str = 'results'):
        super().__init__(output_dir)
    
    async def analyze_paper(self, paper_text: str, model_interface: BaseModelInterface) -> List[AnalysisResult]:
        """Not implemented for context analyzer as it requires multiple papers"""
        raise NotImplementedError("Context analyzer requires multiple papers")
    
    async def analyze_papers(self, papers: List[str], model_interface: BaseModelInterface) -> List[List[AnalysisResult]]:
        """Analyze relationships between multiple papers"""
        results = []
        
        # Combine all papers with clear separation
        combined_text = "\n\n".join(f"=== Paper {i+1} ===\n{text}" 
                                  for i, text in enumerate(papers))
        
        for category, questions in self.CONTEXT_QUESTIONS.items():
            for question in questions:
                prompt = f"""Analyze these research papers together and answer:
                {question}
                
                Please consider all papers in your analysis and provide specific examples.
                Focus on identifying connections, patterns, and relationships between the papers.
                
                Papers content:
                {combined_text}"""
                
                response = await model_interface.generate_response(prompt)
                
                result = AnalysisResult(
                    question_id=f"{category}_{questions.index(question)}",
                    question=question,
                    response=response.content,
                    model_name=model_interface.model_name,
                    interface_type='api',
                    metrics={
                        'latency': response.latency,
                        'tokens': response.usage,
                        'paper_count': len(papers)
                    },
                    timestamp=datetime.now(),
                    error=response.error
                )
                
                results.append(result)
                self.results.append(result)
        
        return [results]  # Wrapping in list to match interface