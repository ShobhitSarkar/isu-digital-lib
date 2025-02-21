from typing import List, Dict, Any
from datetime import datetime
import json
import os

class ContextQAAnalyzer:
    """Analyzer for cross-paper contextual analysis"""

    # Questions for analyzing relationships between papers
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

    def __init__(self, output_dir: str = 'data/results'):
        """Initialize the analyzer with output directory"""
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    async def analyze_context(self, papers: List[str], model) -> List[Dict[str, Any]]:
        """Analyze papers in context together"""
        results = []
        
        # Combine papers with clear separation
        combined_text = "\n\n".join(f"=== Paper {i+1} ===\n{text}" 
                                  for i, text in enumerate(papers))

        print("\nAnalyzing papers in context...")
        
        # Process each category of questions
        for category, questions in self.CONTEXT_QUESTIONS.items():
            print(f"\nProcessing {category} questions...")
            
            for question in questions:
                print(f"Analyzing: {question}")
                
                prompt = f"""Analyze these research papers together and answer:
                {question}
                
                Please consider all papers in your analysis and provide specific examples.
                Focus on identifying connections, patterns, and relationships between the papers.
                
                Papers content:
                {combined_text}"""
                
                try:
                    response = await model.generate_response(prompt)
                    result = {
                        'category': category,
                        'question': question,
                        'response': response.content,
                        'timestamp': datetime.now().isoformat()
                    }
                    
                    if hasattr(response, 'error') and response.error:
                        result['error'] = response.error
                    
                    results.append(result)
                    print(f"Successfully processed question: '{question}'")
                    
                except Exception as e:
                    print(f"Error with question '{question}': {e}")
                    results.append({
                        'category': category,
                        'question': question,
                        'response': None,
                        'error': str(e),
                        'timestamp': datetime.now().isoformat()
                    })
        
        return results

    def save_results(self, results: List[Dict[str, Any]], 
                    filename: str = 'context_qa_results.json'):
        """Save analysis results to file"""
        output_path = os.path.join(self.output_dir, filename)
        output_data = {
            'timestamp': datetime.now().isoformat(),
            'results': results
        }
        
        with open(output_path, 'w') as f:
            json.dump(output_data, f, indent=2)
        print(f"\nResults saved to {output_path}")

    def load_results(self, filename: str = 'context_qa_results.json') -> List[Dict[str, Any]]:
        """Load previously saved results"""
        input_path = os.path.join(self.output_dir, filename)
        with open(input_path, 'r') as f:
            data = json.load(f)
        return data.get('results', [])

async def main():
    """Main function to run the analyzer"""
    analyzer = ContextQAAnalyzer()
    
    # Example usage (commented out)
    # papers = ["paper1 content", "paper2 content", "paper3 content"]
    # model = YourModelInterface()
    # results = await analyzer.analyze_context(papers, model)
    # analyzer.save_results(results)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())