from typing import List, Dict, Any
from datetime import datetime
import json
import os
import chromadb
import time
from .base_analyzer import BaseVectorAnalyzer  # For vector-based ones

class VectorizedQAAnalyzer(BaseVectorAnalyzer):
    """Analyzer for cross-paper analysis using vector search"""

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
            self.client.delete_collection("context_collection")
        except:
            pass
        self.collection = self.client.create_collection("context_collection")

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

    async def analyze_context(self, papers: List[str], model) -> List[Dict[str, Any]]:
        """Analyze relationships between papers using vector search"""
        results = []
        start_time = time.time()

        # Process and add all papers to vector store
        total_chunks = 0
        for paper_idx, paper in enumerate(papers):
            chunks = self.chunk_text(paper)
            total_chunks += len(chunks)
            
            for chunk_idx, chunk in enumerate(chunks):
                self.collection.add(
                    documents=[chunk],
                    ids=[f"paper_{paper_idx}_chunk_{chunk_idx}"],
                    metadatas=[{
                        "paper_id": f"paper_{paper_idx+1}",
                        "chunk_id": chunk_idx
                    }]
                )

        print(f"\nAnalyzing {len(papers)} papers ({total_chunks} total chunks created)...")

        # Process each category of questions
        for category, questions in self.CONTEXT_QUESTIONS.items():
            print(f"\nProcessing {category} questions...")
            
            for question in questions:
                print(f"Analyzing: {question}")
                
                try:
                    # Get relevant chunks from all papers
                    query_results = self.collection.query(
                        query_texts=[question],
                        n_results=5  # Get top 5 most relevant chunks
                    )
                    
                    if query_results['documents'] and query_results['documents'][0]:
                        # Organize contexts by paper
                        paper_contexts = {}
                        for doc, metadata in zip(query_results['documents'][0], query_results['metadatas'][0]):
                            paper_id = metadata['paper_id']
                            if paper_id not in paper_contexts:
                                paper_contexts[paper_id] = []
                            paper_contexts[paper_id].append(doc)
                        
                        # Combine contexts with paper identification
                        contexts = []
                        for paper_id, docs in paper_contexts.items():
                            contexts.append(f"\n=== From {paper_id} ===\n" + "\n".join(docs))
                        
                        combined_context = "\n\n".join(contexts)
                        
                        prompt = f"""Based on these sections from multiple papers, please answer:
                        {question}
                        
                        Please provide a comprehensive analysis that draws from all relevant papers.
                        
                        Relevant sections:
                        {combined_context}"""
                        
                        response = await model.generate_response(prompt)
                        
                        result = {
                            'category': category,
                            'question': question,
                            'response': response.content,
                            'papers_referenced': list(paper_contexts.keys()),
                            'chunks_used': len(query_results['documents'][0]),
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

        # Clean up collection
        self.setup_collection()
        
        analysis_time = time.time() - start_time
        print(f"Analysis completed in {analysis_time:.2f} seconds")
        
        return results

    def save_results(self, results: List[Dict[str, Any]], 
                    filename: str = 'vector_context_qa_results.json'):
        """Save analysis results to file"""
        output_path = os.path.join(self.output_dir, filename)
        output_data = {
            'timestamp': datetime.now().isoformat(),
            'results': results
        }
        
        with open(output_path, 'w') as f:
            json.dump(output_data, f, indent=2)
        print(f"\nResults saved to {output_path}")

    def load_results(self, filename: str = 'vector_context_qa_results.json') -> List[Dict[str, Any]]:
        """Load previously saved results"""
        input_path = os.path.join(self.output_dir, filename)
        with open(input_path, 'r') as f:
            data = json.load(f)
        return data.get('results', [])

    def __del__(self):
        """Cleanup the vector store on deletion"""
        try:
            self.client.delete_collection("context_collection")
        except:
            pass

async def main():
    """Main function to run the analyzer"""
    analyzer = VectorizedContextQAAnalyzer()
    
    # Example usage (commented out)
    # papers = ["paper1 content", "paper2 content", "paper3 content"]
    # model = YourModelInterface()
    # results = await analyzer.analyze_context(papers, model)
    # analyzer.save_results(results)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())