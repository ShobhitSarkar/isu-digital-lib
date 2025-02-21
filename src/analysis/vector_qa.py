from typing import Dict, List, Any
import chromadb
from datetime import datetime
from ..models import BaseModelInterface
from .base_analyzer import BasePaperAnalyzer, AnalysisResult

class VectorQAAnalyzer(BasePaperAnalyzer):
    """Analyzer using vector embeddings for paper analysis"""
    
    VECTOR_QUESTIONS = {
        'core_concepts': 'What are the core concepts and ideas presented in this paper?',
        'technical_approach': 'Explain the technical approach and implementation details.',
        'evaluation': 'How does the paper evaluate its proposed solution?',
        'innovation': 'What are the novel or innovative aspects of this work?',
    }

    def __init__(self, output_dir: str = 'results'):
        super().__init__(output_dir)
        self.client = chromadb.Client()
        try:
            self.client.delete_collection("papers_collection")
        except:
            pass
        self.collection = self.client.create_collection("papers_collection")

    async def analyze_paper(self, paper_text: str, model_interface: BaseModelInterface) -> List[AnalysisResult]:
        """Analyze a single paper using vector search"""
        results = []
        
        # Add paper to vector store
        self.collection.add(
            documents=[paper_text],
            ids=["current_paper"],
            metadatas=[{"source": "current_paper"}]
        )
        
        for q_id, question in self.VECTOR_QUESTIONS.items():
            # Get relevant sections
            query_results = self.collection.query(
                query_texts=[question],
                n_results=2
            )
            
            if query_results['documents'] and query_results['documents'][0]:
                context = "\n\n".join(query_results['documents'][0])
                prompt = f"""Based on these relevant sections from the paper, please answer:
                {question}
                
                Please provide a thorough and precise answer based on the following content:
                {context}"""
                
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
                        'relevant_chunks': len(query_results['documents'][0])
                    },
                    timestamp=datetime.now(),
                    error=response.error
                )
                
                results.append(result)
        
        # Clean up
        try:
            self.client.delete_collection("papers_collection")
        except:
            pass
        self.collection = self.client.create_collection("papers_collection")
        
        return results

    async def analyze_papers(self, papers: List[str], model_interface: BaseModelInterface) -> List[List[AnalysisResult]]:
        """Analyze multiple papers using vector search"""
        all_results = []
        for i, paper in enumerate(papers):
            results = await self.analyze_paper(paper, model_interface)
            all_results.append(results)
            self.results.extend(results)
        return all_results

    def __del__(self):
        """Cleanup vector store on deletion"""
        try:
            self.client.delete_collection("papers_collection")
        except:
            pass