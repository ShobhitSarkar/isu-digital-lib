from typing import List, Dict, Any
from datetime import datetime
import json
import os
import chromadb
import time

from src.analysis.vector_context_qa import VectorizedQAAnalyzer
from .base_analyzer import BaseVectorAnalyzer  

class VectorizedContextQAAnalyzer(BaseVectorAnalyzer):
    """Analyzer using vector embeddings for paper analysis"""

    VECTOR_QUESTIONS = {
        'core_concepts': 'What are the core concepts and ideas presented in this paper?',
        'technical_approach': 'Explain the technical approach and implementation details.',
        'evaluation': 'How does the paper evaluate its proposed solution?',
        'innovation': 'What are the novel or innovative aspects of this work?',
    }

    def __init__(self, output_dir: str = 'data/results', chunk_size: int = 1000):
        """Initialize the analyzer with output directory"""
        self.output_dir = output_dir
        self.chunk_size = chunk_size
        os.makedirs(output_dir, exist_ok=True)
        
        # Initialize ChromaDB
        self.client = chromadb.Client()
        self.setup_collection()

    def setup_collection(self):
        """Setup/reset the vector collection"""
        try:
            self.client.delete_collection("papers_collection")
        except:
            pass
        self.collection = self.client.create_collection("papers_collection")

    def chunk_text(self, text: str) -> List[str]:
        """Split text into chunks with overlap"""
        words = text.split()
        chunks = []
        overlap = 100  # Number of words to overlap
        
        for i in range(0, len(words), self.chunk_size - overlap):
            chunk = ' '.join(words[i:i + self.chunk_size])
            if len(chunk.strip()) > 0:  # Only add non-empty chunks
                chunks.append(chunk)
        
        return chunks

    async def analyze_single_paper(self, paper_text: str, model) -> List[Dict[str, Any]]:
        """Analyze a single paper using vector search"""
        results = []
        start_time = time.time()

        # Split paper into chunks and add to vector store
        chunks = self.chunk_text(paper_text)
        
        # Add chunks to vector store
        for i, chunk in enumerate(chunks):
            self.collection.add(
                documents=[chunk],
                ids=[f"chunk_{i}"],
                metadatas=[{"chunk_id": i}]
            )

        print(f"\nAnalyzing paper ({len(chunks)} chunks created)...")

        # Process each question
        for q_id, question in self.VECTOR_QUESTIONS.items():
            print(f"Processing question: {q_id}")
            
            try:
                # Get relevant chunks
                query_results = self.collection.query(
                    query_texts=[question],
                    n_results=3  # Get top 3 most relevant chunks
                )
                
                if query_results['documents'] and query_results['documents'][0]:
                    context = "\n\n".join(query_results['documents'][0])
                    
                    prompt = f"""Based on these relevant sections from the paper, please answer:
                    {question}
                    
                    Please provide a thorough and precise answer based on the following content:
                    {context}"""
                    
                    response = await model.generate_response(prompt)
                    
                    result = {
                        'question_id': q_id,
                        'question': question,
                        'response': response.content,
                        'chunks_used': len(query_results['documents'][0]),
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

        # Clean up collection for next paper
        self.setup_collection()
        
        analysis_time = time.time() - start_time
        print(f"Analysis completed in {analysis_time:.2f} seconds")
        
        return results

    async def analyze_papers(self, papers: List[str], model) -> Dict[str, List[Dict[str, Any]]]:
        """Analyze multiple papers"""
        all_results = {}
        
        for i, paper in enumerate(papers, 1):
            paper_id = f'paper-{i}'
            print(f"\nProcessing {paper_id}")
            all_results[paper_id] = await self.analyze_single_paper(paper, model)
        
        return all_results

    def save_results(self, results: Dict[str, Any], filename: str = 'vector_qa_results.json'):
        """Save analysis results to file"""
        output_path = os.path.join(self.output_dir, filename)
        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\nResults saved to {output_path}")

    def __del__(self):
        """Cleanup the vector store on deletion"""
        try:
            self.client.delete_collection("papers_collection")
        except:
            pass

async def main():
    """Main function to run the analyzer"""
    analyzer = VectorizedQAAnalyzer()
    
    # Example usage (commented out)
    # papers = ["paper1 content", "paper2 content"]
    # model = YourModelInterface()
    # results = await analyzer.analyze_papers(papers, model)
    # analyzer.save_results(results)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())