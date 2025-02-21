from typing import Dict, List, Any
from datetime import datetime
from ..models import BaseModelInterface
from .base_analyzer import BasePaperAnalyzer, AnalysisResult

class BasicQAAnalyzer(BasePaperAnalyzer):
    """Analyzer for basic question-answering tasks on individual papers"""
    
    BASIC_QUESTIONS = {
        'main_findings': 'What are the main findings or contributions of this paper?',
        'methodology': 'What methodology or approach does this paper use?',
        'results': 'What are the key results and their significance?',
        'limitations': 'What are the limitations or challenges identified in this work?',
    }

    def __init__(self, output_dir: str = 'results'):
        super().__init__(output_dir)
        
    async def analyze_paper(self, paper_text: str, model_interface: BaseModelInterface) -> List[AnalysisResult]:
        """Analyze a single paper with basic questions"""
        results = []
        
        for q_id, question in self.BASIC_QUESTIONS.items():
            prompt = f"Based on this academic paper, please answer the following question thoroughly and precisely: {question}\n\nPaper content: {paper_text}"
            
            response = await model_interface.generate_response(prompt)
            
            result = AnalysisResult(
                question_id=q_id,
                question=question,
                response=response.content,
                model_name=model_interface.model_name,
                interface_type='api',
                metrics={
                    'latency': response.latency,
                    'tokens': response.usage,
                },
                timestamp=datetime.now(),
                error=response.error
            )
            
            results.append(result)
            
        return results
    
    async def analyze_papers(self, papers: List[str], model_interface: BaseModelInterface) -> List[List[AnalysisResult]]:
        """Analyze multiple papers"""
        all_results = []
        for paper in papers:
            results = await self.analyze_paper(paper, model_interface)
            all_results.append(results)
            self.results.extend(results)
        return all_results