from typing import List, Dict, Any
from datetime import datetime
import json
import os
from .base_analyzer import BaseAnalyzer  # For basic and context

class BasicQAAnalyzer(BaseAnalyzer):
    """Basic question-answering analyzer for individual papers"""

    # Define standard questions for paper analysis
    QUESTIONS = {
        'main_findings': 'What are the main findings or contributions of this paper?',
        'methodology': 'What methodology or approach does this paper use?',
        'results': 'What are the key results and their significance?',
        'limitations': 'What are the limitations or challenges identified in this work?'
    }

    def __init__(self, output_dir: str = 'data/results'):
        """Initialize the analyzer with output directory"""
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    async def analyze_single_paper(self, paper_text: str, model) -> List[Dict[str, Any]]:
        """Analyze a single paper with basic questions"""
        results = []
        
        print(f"\nAnalyzing paper...")
        for q_id, question in self.QUESTIONS.items():
            print(f"Processing question: {q_id}")
            
            prompt = (f"Based on this academic paper, please answer the following question "
                     f"thoroughly and precisely: {question}\n\nPaper content: {paper_text}")
            
            try:
                response = await model.generate_response(prompt)
                result = {
                    'question_id': q_id,
                    'question': question,
                    'response': response.content,
                    'timestamp': datetime.now().isoformat()
                }
                
                if hasattr(response, 'error') and response.error:
                    result['error'] = response.error
                
                results.append(result)
                print(f"Successfully processed question: {q_id}")
                
            except Exception as e:
                print(f"Error with question {q_id}: {e}")
                results.append({
                    'question_id': q_id,
                    'question': question,
                    'response': None,
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                })
        
        return results

    async def analyze_papers(self, papers: List[str], model) -> Dict[str, List[Dict[str, Any]]]:
        """Analyze multiple papers"""
        all_results = {}
        
        for i, paper in enumerate(papers, 1):
            paper_id = f'paper-{i}'
            print(f"\nProcessing {paper_id}")
            all_results[paper_id] = await self.analyze_single_paper(paper, model)
        
        return all_results

    def save_results(self, results: Dict[str, Any], filename: str = 'basic_qa_results.json'):
        """Save analysis results to file"""
        output_path = os.path.join(self.output_dir, filename)
        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\nResults saved to {output_path}")

async def main():
    """Main function to run the analyzer"""
    analyzer = BasicQAAnalyzer()
    
    # Example usage (commented out)
    # papers = ["paper1 content", "paper2 content"]
    # model = YourModelInterface()
    # results = await analyzer.analyze_papers(papers, model)
    # analyzer.save_results(results)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())